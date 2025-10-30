import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const posts = db.collection("posts");
    const comments = db.collection("comments");
    const _id = new ObjectId(params.id);

    const post = await posts.findOne({ _id } as any);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((post as any).userId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await posts.deleteOne({ _id } as any);
    await comments.deleteMany({ postId: _id } as any);

    try {
      await dbConnect();
      await Notification.deleteMany({ "data.postId": String(_id) } as any);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete post" }, { status: 500 });
  }
}
