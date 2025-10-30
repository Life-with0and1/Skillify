import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { StreamChat } from "stream-chat";

// POST - Create or sync current user with database
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    console.log("=== AUTH DEBUG ===");
    console.log("userId from auth():", userId);

    if (!userId) {
      console.log("No userId found - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not found in Clerk" },
        { status: 404 }
      );
    }

    await dbConnect();

    // Check if user already exists
    let dbUser = await User.findByClerkId(userId);

    if (dbUser) {
      // Update existing user
      // Do NOT overwrite name fields here; only sync non-destructive fields
      dbUser = await User.findOneAndUpdate(
        { clerkId: userId },
        {
          email: user.emailAddresses[0]?.emailAddress,
          avatar: user.imageUrl,
          lastActive: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new user
      dbUser = await User.create({
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        avatar: user.imageUrl,
        bio: "Passionate about learning and sharing knowledge. Always excited to connect with fellow learners!",
        location: "",
        skillsTeaching: [
          { skill: "React.js" },
          { skill: "Node.js" },
          { skill: "TypeScript" },
          { skill: "UI/UX Design" },
        ],
        skillsLearning: [
          { skill: "Python" },
          { skill: "Machine Learning" },
          { skill: "DevOps" },
          { skill: "Mobile Development" },
        ],
        availability: ["Evenings", "Weekends"],
        rating: 4.2,
        totalReviews: 8,
        connections: [],
        onboardingComplete: true,
        isActive: true,
        joinedAt: new Date(),
        lastActive: new Date(),
      });
    }

    // Upsert user into Stream (one-time per sign-in/signup, id = Clerk userId)
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUser({
          id: dbUser.clerkId,
          name: dbUser.fullName || `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim(),
          image: dbUser.avatar || undefined,
        });
      }
    } catch (e) {
      console.error("Stream upsert user failed (non-fatal)", e);
    }

    return NextResponse.json({
      user: dbUser,
      message: dbUser
        ? "User synced successfully"
        : "User created successfully",
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
