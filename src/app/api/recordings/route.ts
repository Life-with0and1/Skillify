import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import Recording from "@/models/Recording";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { callId, title, url, otherUserId } = body || {};
    if (!callId) return NextResponse.json({ error: "callId is required" }, { status: 400 });

    await dbConnect();
    const rec = await Recording.create({
      userId,
      otherUserId,
      callId,
      title: title || `Call ${new Date().toLocaleString()}`,
      url: url || undefined,
    });

    return NextResponse.json({ recording: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const before = searchParams.get("before"); // ISO date cursor
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(String(limitParam || '20'), 10) || 20, 1), 50);

    await dbConnect();
    const filter: any = { userId };
    if (q) filter.title = { $regex: q, $options: "i" };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d.getTime())) filter.createdAt = { $lt: d };
    }

    const recs = await Recording.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
    const hasMore = recs.length > limit;
    const items = hasMore ? recs.slice(0, limit) : recs;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : null;
    return NextResponse.json({ recordings: items, nextCursor, hasMore }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { id, title } = body || {};
    if (!id || typeof title !== "string") return NextResponse.json({ error: "id and title required" }, { status: 400 });
    await dbConnect();
    const rec = await Recording.findOne({ _id: id, userId });
    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
    rec.title = title;
    await rec.save();
    return NextResponse.json({ recording: rec }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await dbConnect();
    const res = await Recording.deleteOne({ _id: id, userId });
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
