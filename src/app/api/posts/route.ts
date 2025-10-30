import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);
    const cursor = url.searchParams.get("cursor"); // ISO date string for pagination
    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").map(t => t.trim()).filter(Boolean) : undefined;
    const includeSelfParam = url.searchParams.get("includeSelf");
    const includeSelf = includeSelfParam === '1' || includeSelfParam === 'true';
    const userId = url.searchParams.get("userId");

    const db = await getDb();
    const coll = db.collection("posts");

    const q: any = {};
    if (cursor) q.createdAt = { $lt: new Date(cursor) };
    if (tags && tags.length) q.tags = { $in: tags };
    if (userId) {
      q.userId = userId;
    } else {
      // Exclude my own posts by default; allow includeSelf flag for dashboard use-cases
      if (!includeSelf) {
        try {
          const me = await currentUser();
          if (me?.id) q.userId = { $ne: me.id };
        } catch {}
      }
    }

    const items = await coll
      .find(q)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = items.length > limit;
    const list = hasMore ? items.slice(0, limit) : items;

    return NextResponse.json({
      posts: list.map(p => ({
        _id: p._id?.toString?.() || String(p._id),
        userId: p.userId,
        userName: p.userName,
        userAvatar: p.userAvatar,
        text: p.text,
        images: p.images || [],
        tags: p.tags || [],
        likes: p.likes || 0,
        likedBy: p.likedBy || [],
        createdAt: p.createdAt,
      })),
      nextCursor: hasMore ? list[list.length - 1]?.createdAt?.toISOString?.() : null,
      hasMore,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const text = String(body?.text || "").trim();
    const images = Array.isArray(body?.images) ? body.images.map(String) : [];
    const tags = Array.isArray(body?.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });
    if (tags.length < 2) return NextResponse.json({ error: "At least 2 tags required" }, { status: 400 });

    const doc = {
      userId: me.id,
      userName: me.fullName || me.username || me.id,
      userAvatar: me.imageUrl || "",
      text,
      images,
      tags,
      likes: 0,
      likedBy: [],
      createdAt: new Date(),
    };
    const db = await getDb();
    const coll = db.collection("posts");
    const res = await coll.insertOne(doc as any);
    return NextResponse.json({ _id: res.insertedId.toString(), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create post" }, { status: 500 });
  }
}
