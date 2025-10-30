import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";

// Get user notifications
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") as "all" | "read" | "unread" || "all";
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Find user by Clerk ID
    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get notifications
    const notifications = await Notification.getUserNotifications(
      user._id.toString(),
      filter,
      limit,
      skip
    );

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(user._id.toString());

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { notificationId, markAllAsRead } = await request.json();

    // Find user by Clerk ID
    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (markAllAsRead) {
      // Mark all notifications as read
      await Notification.markAllAsRead(user._id.toString());
      return NextResponse.json({ message: "All notifications marked as read" });
    } else if (notificationId) {
      // Mark specific notification as read
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: user._id,
      });

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      await notification.markAsRead();
      return NextResponse.json({ message: "Notification marked as read" });
    } else {
      return NextResponse.json(
        { error: "Notification ID or markAllAsRead flag is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Find user by Clerk ID
    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete notification
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: user._id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
