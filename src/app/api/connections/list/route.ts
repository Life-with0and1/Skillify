import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/connections/list - return connected users for the current user
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const me = await User.findOne({ clerkId: userId }).select("connections");
    if (!me) return NextResponse.json({ users: [] });

    const users = await User.find({ _id: { $in: me.connections || [] } })
      .select("clerkId fullName avatar")
      .lean();

    const data = users.map((u: any) => ({
      clerkId: u.clerkId,
      name: u.fullName,
      avatar: u.avatar || "/default-avatar.png",
    }));

    return NextResponse.json({ users: data });
  } catch (e) {
    console.error("List connections error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
