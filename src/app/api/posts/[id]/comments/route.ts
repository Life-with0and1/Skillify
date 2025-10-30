import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const coll = db.collection("comments");
    const postId = new ObjectId(params.id);
    const items = await coll.find({ postId }).sort({ createdAt: 1 }).toArray();
    // Build nested structure: top-level are those without parentId; replies grouped under parent
    const byId = new Map<string, any>();
    items.forEach((c: any) => {
      byId.set(String(c._id), {
        _id: c._id,
        postId: c.postId,
        userId: c.userId,
        userName: c.userName,
        userAvatar: c.userAvatar,
        text: c.text,
        createdAt: c.createdAt,
        parentId: c.parentId || null,
        replies: [] as any[],
      });
    });
    const roots: any[] = [];
    byId.forEach((c) => {
      if (c.parentId) {
        const parent = byId.get(String(c.parentId));
        if (parent) parent.replies.push(c);
        else roots.push(c); // orphaned, treat as root
      } else {
        roots.push(c);
      }
    });
    return NextResponse.json({ comments: roots });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const text = String(body?.text || "").trim();
    const parentIdRaw = body?.parentId ? String(body.parentId) : null;
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const db = await getDb();
    const coll = db.collection("comments");
    // resolve avatar from our User model (dashboard uses this same source)
    await dbConnect();
    const senderUser = await User.findByClerkId(me.id);
    const doc = {
      postId: new ObjectId(params.id),
      userId: me.id,
      userName: me.fullName || me.username || me.id,
      userAvatar: senderUser?.avatar || me.imageUrl,
      text,
      createdAt: new Date(),
      ...(parentIdRaw ? { parentId: new ObjectId(parentIdRaw) } : {}),
    };
    const res = await coll.insertOne(doc as any);
    // create notification for post owner (if not self) using Mongoose Notification model
    try {
      const posts = db.collection("posts");
      const post = await posts.findOne({ _id: new ObjectId(params.id) } as any);
      const ownerClerkId = (post as any)?.userId;
      if (ownerClerkId && ownerClerkId !== me.id) {
        const recipient = await User.findByClerkId(ownerClerkId);
        const sender = senderUser;
        if (recipient) {
          const title = "New comment on your post";
          const message = `${doc.userName} commented: ${text.slice(0, 80)}`;
          await Notification.createNotification(
            (recipient as any)._id.toString(),
            "system",
            title,
            message,
            (sender as any)?._id?.toString(),
            { postId: params.id, commentId: res.insertedId.toString(), actorClerkId: me.id }
          );
        }
      }
    } catch {}
    return NextResponse.json({ _id: res.insertedId, ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to post comment" }, { status: 500 });
  }
}
