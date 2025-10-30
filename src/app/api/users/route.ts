import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { StreamChat } from "stream-chat";

// GET /api/users - list all users except the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    await dbConnect();

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const sortParam = (url.searchParams.get("sort") || "").toLowerCase();
    const smart = url.searchParams.get("smart") === "1";

    const query: any = { isActive: true };
    if (userId) {
      query.clerkId = { $ne: userId };
    }

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { fullName: { $regex: regex } },
        { location: { $regex: regex } },
        { "skillsTeaching.skill": { $regex: regex } },
      ];
    }

    // Smart match: require skills overlap with current user
    if (smart) {
      if (!userId) {
        return NextResponse.json({ users: [] });
      }
      const me = await User.findOne({ clerkId: userId }).select(
        "skillsTeaching skillsLearning"
      );
      const myTeach: string[] = (me?.skillsTeaching || []).map((s: any) => s.skill);
      const myLearn: string[] = (me?.skillsLearning || []).map((s: any) => s.skill);
      if ((myTeach?.length || 0) === 0 && (myLearn?.length || 0) === 0) {
        return NextResponse.json({ users: [] });
      }
      const smartOr: any[] = [];
      if (myTeach.length > 0) {
        smartOr.push({ "skillsLearning.skill": { $in: myTeach } });
      }
      if (myLearn.length > 0) {
        smartOr.push({ "skillsTeaching.skill": { $in: myLearn } });
      }
      if (smartOr.length > 0) {
        // Combine with existing query using $and
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: smartOr }];
          delete query.$or;
        } else {
          query.$or = smartOr;
        }
      }
    }

    // Sorting map for simple find() sorts
    const sortMap: Record<string, any> = {
      rating: { rating: -1, totalReviews: -1 },
      reviews: { totalReviews: -1, rating: -1 },
      recent: { lastActive: -1 },
    };

    let users;
    if (sortParam === "connections") {
      // Use aggregation to sort by connections count
      users = await User.aggregate([
        { $match: query },
        {
          $addFields: {
            connectionsCount: { $size: { $ifNull: ["$connections", []] } },
          },
        },
        { $sort: { connectionsCount: -1, rating: -1, totalReviews: -1 } },
        {
          $project: {
            clerkId: 1,
            fullName: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            avatar: 1,
            bio: 1,
            location: 1,
            rating: 1,
            totalReviews: 1,
            skillsTeaching: 1,
            skillsLearning: 1,
            availability: 1,
            joinedAt: 1,
            lastActive: 1,
          },
        },
      ]);
    } else {
      const sort = sortMap[sortParam] || { rating: -1, totalReviews: -1 };
      users = await User.find(query)
        .select(
          "clerkId fullName firstName lastName email avatar bio location rating totalReviews skillsTeaching skillsLearning availability joinedAt lastActive"
        )
        .sort(sort);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users - create current authenticated user in Mongo and upsert to Stream
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const firstName = (body?.firstName || "").trim();
    const lastName = (body?.lastName || "").trim();
    const email = (body?.email || "").trim();
    const image = (body?.avatar || body?.image || "").trim();
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();

    await dbConnect();

    // If user already exists, return it (idempotent)
    const existing = await User.findOne({ clerkId: userId });
    if (existing) {
      return NextResponse.json({ user: existing, created: false });
    }

    const user = await User.create({
      clerkId: userId,
      email: email || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      fullName: fullName || undefined,
      avatar: image || undefined,
      bio: "",
      location: "",
      skillsTeaching: [],
      skillsLearning: [],
      availability: [],
      rating: 0,
      totalReviews: 0,
      connections: [],
      onboardingComplete: false,
      isActive: true,
      joinedAt: new Date(),
      lastActive: new Date(),
    });

    // Upsert to Stream immediately
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          {
            id: userId,
            name: fullName || undefined,
            image: image || undefined,
          },
        ]);
      }
    } catch (e) {
      // Non-fatal; DB insert succeeded
      console.warn("STREAM: upsert user failed on POST /api/users", e);
    }

    return NextResponse.json({ user, created: true });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
