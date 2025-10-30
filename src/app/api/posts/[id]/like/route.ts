import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { currentUser } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDb();
    const coll = db.collection("posts");
    const _id = new ObjectId(params.id);
    await coll.updateOne(
      { _id },
      { $addToSet: { likedBy: me.id }, $inc: { likes: 1 } } as any,
    );
    // notify post owner if not self using Notification model
    try {
      const post = await coll.findOne({ _id } as any);
      const ownerClerkId = (post as any)?.userId;
      if (ownerClerkId && ownerClerkId !== me.id) {
        await dbConnect();
        const recipient = await User.findByClerkId(ownerClerkId);
        const sender = await User.findByClerkId(me.id);
        if (recipient) {
          const title = "New like on your post";
          const message = `${sender?.fullName || me.fullName || me.username || me.id} liked your post`;
          await Notification.createNotification(
            (recipient as any)._id.toString(),
            "system",
            title,
            message,
            (sender as any)?._id?.toString(),
            { postId: String(_id), actorClerkId: me.id }
          );
        }
      }
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to like" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDb();
    const coll = db.collection("posts");
    const _id = new ObjectId(params.id);
    await coll.updateOne(
      { _id },
      { $pull: { likedBy: me.id }, $inc: { likes: -1 } } as any,
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to unlike" }, { status: 500 });
  }
}
