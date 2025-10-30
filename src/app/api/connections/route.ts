import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { StreamChat } from "stream-chat";

// Send connection request
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }

    // Check if targetUserId is a Clerk ID (starts with 'user_') or MongoDB ObjectId
    let findTargetUserPromise;
    if (targetUserId.startsWith('user_')) {
      findTargetUserPromise = User.findByClerkId(targetUserId);
    } else {
      findTargetUserPromise = User.findById(targetUserId);
    }

    // Find both users
    const [currentUser, targetUser] = await Promise.all([
      User.findByClerkId(userId),
      findTargetUserPromise,
    ]);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert to MongoDB ObjectId for connection operations
    const targetUserObjectId = targetUser._id.toString();

    // Check if already connected or request already sent
    const connectionStatus = currentUser.getConnectionStatus(targetUserObjectId);
    
    if (connectionStatus === "connected") {
      return NextResponse.json(
        { error: "Already connected" },
        { status: 400 }
      );
    }

    if (connectionStatus === "request_sent") {
      return NextResponse.json(
        { error: "Connection request already sent" },
        { status: 400 }
      );
    }

    // Send connection request - use MongoDB ObjectIds
    await currentUser.sendConnectionRequest(targetUserObjectId);
    await targetUser.receiveConnectionRequest(currentUser._id.toString());

    // Create notification for target user - use MongoDB ObjectId for recipient
    try {
      await Notification.createNotification(
        targetUserObjectId,
        "connection_request",
        "New Connection Request",
        `${currentUser.fullName} wants to connect with you`,
        currentUser._id.toString(),
        {
          connectionRequestId: currentUser._id.toString(),
          profileUrl: `/profile/${currentUser.clerkId}`,
        }
      );
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the whole request if notification fails
    }

    // Send real-time Stream event to recipient AND system message in a DM channel
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          { id: currentUser.clerkId, name: currentUser.fullName, image: currentUser.avatar || undefined },
          { id: targetUser.clerkId, name: targetUser.fullName, image: targetUser.avatar || undefined },
        ]);
        // User-level event
        await serverClient.sendUserEvent(
          {
            type: "user.notification",
            notifType: "connection_request",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
            profileUrl: `/profile/${currentUser.clerkId}`,
          } as any,
          [targetUser.clerkId]
        );
        console.log("STREAM: sent user.notification (connection_request) to", targetUser.clerkId);

        // DM system message (guaranteed 'message.new')
        const dmId = `dm_${[currentUser.clerkId, targetUser.clerkId].sort().join("_")}`;
        const channel = serverClient.channel("messaging", dmId, {
          members: [currentUser.clerkId, targetUser.clerkId],
        });
        await channel.create().catch(() => {});
        await channel.sendMessage({
          text: `${currentUser.fullName} sent a connection request`,
          type: "system",
          fromClerkId: currentUser.clerkId,
          profileUrl: `/profile/${currentUser.clerkId}`,
          custom: { notifType: "connection_request" },
        } as any);
        console.log("STREAM: sent system message (connection_request) on", dmId);

        // Also send to recipient's notifications channel for instant UI update
        try {
          const notifId = `notifications_${targetUser.clerkId}`;
          const notifCh = serverClient.channel("messaging", notifId, { members: [targetUser.clerkId] });
          await notifCh.create().catch(() => {});
          await notifCh.sendEvent({
            type: "connection_request",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
            profileUrl: `/profile/${currentUser.clerkId}`,
          } as any);
          // Fallback: also send a tiny message to trigger message.new
          await notifCh.sendMessage({
            text: `${currentUser.fullName} sent you a connection request`,
            type: "system",
            custom: { notifType: "connection_request" },
          } as any).catch(() => {});
        } catch {}
      } else {
        console.warn("STREAM: missing API key/secret, skipping event emit");
      }
    } catch (e) {
      console.error("Stream event send failed (request)", e);
    }

    return NextResponse.json({
      message: "Connection request sent successfully",
      status: "request_sent",
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Accept connection request
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { senderId, notificationId } = await request.json();

    if (!senderId) {
      return NextResponse.json(
        { error: "Sender ID is required" },
        { status: 400 }
      );
    }

    // Check if senderId is a Clerk ID or MongoDB ObjectId
    let findSenderUserPromise;
    if (senderId.startsWith('user_')) {
      findSenderUserPromise = User.findByClerkId(senderId);
    } else {
      findSenderUserPromise = User.findById(senderId);
    }

    // Find both users
    const [currentUser, senderUser] = await Promise.all([
      User.findByClerkId(userId),
      findSenderUserPromise,
    ]);

    if (!currentUser || !senderUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert to MongoDB ObjectId for connection operations
    const senderUserObjectId = senderUser._id.toString();

    // Accept the connection request - use MongoDB ObjectIds
    await currentUser.acceptConnectionRequest(senderUserObjectId);
    await senderUser.withdrawConnectionRequest(currentUser._id.toString());
    
    // Add connection to sender as well
    if (!senderUser.connections.includes(currentUser._id)) {
      senderUser.connections.push(currentUser._id);
      await senderUser.save();
    }

    // Update the original notification: convert request to accepted for the recipient
    if (notificationId) {
      const original = await Notification.findOne({
        _id: notificationId,
        recipient: currentUser._id,
      });

      if (original && original.type === "connection_request") {
        await Notification.findByIdAndUpdate(notificationId, {
          type: "connection_accepted",
          title: "Connection Accepted",
          message: `You are now connected with ${senderUser.fullName}`,
          read: true,
        });
      } else if (original) {
        await Notification.findByIdAndUpdate(notificationId, { read: true });
      }
    }

    // Create notification for sender about acceptance - use MongoDB ObjectId for recipient
    try {
      await Notification.createNotification(
        senderUserObjectId,
        "connection_accepted",
        "Connection Accepted",
        `${currentUser.fullName} accepted your connection request`,
        currentUser._id.toString(),
        {
          profileUrl: `/profile/${currentUser.clerkId}`,
        }
      );
    } catch (notificationError) {
      console.error("Failed to create connection accepted notification:", notificationError);
      // Don't fail the whole request if notification fails
    }

    // Send real-time Stream event to the original sender AND DM system message
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          { id: currentUser.clerkId, name: currentUser.fullName, image: currentUser.avatar || undefined },
          { id: senderUser.clerkId, name: senderUser.fullName, image: senderUser.avatar || undefined },
        ]);
        await serverClient.sendUserEvent(
          {
            type: "user.notification",
            notifType: "connection_accepted",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
            profileUrl: `/profile/${currentUser.clerkId}`,
          } as any,
          [senderUser.clerkId]
        );
        console.log("STREAM: sent user.notification (connection_accepted) to", senderUser.clerkId);

        const dmId = `dm_${[currentUser.clerkId, senderUser.clerkId].sort().join("_")}`;
        const channel = serverClient.channel("messaging", dmId, {
          members: [currentUser.clerkId, senderUser.clerkId],
        });
        await channel.create().catch(() => {});
        await channel.sendMessage({
          text: `${currentUser.fullName} accepted your connection request`,
          type: "system",
          fromClerkId: currentUser.clerkId,
          profileUrl: `/profile/${currentUser.clerkId}`,
          custom: { notifType: "connection_accepted" },
        } as any);
        console.log("STREAM: sent system message (connection_accepted) on", dmId);

        // Also notify the original sender via their notifications channel
        try {
          const notifId = `notifications_${senderUser.clerkId}`;
          const notifCh = serverClient.channel("messaging", notifId, { members: [senderUser.clerkId] });
          await notifCh.create().catch(() => {});
          await notifCh.sendEvent({
            type: "connection_accepted",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
            profileUrl: `/profile/${currentUser.clerkId}`,
          } as any);
          // Fallback: also send a tiny message to trigger message.new
          await notifCh.sendMessage({
            text: `${currentUser.fullName} accepted your connection request`,
            type: "system",
            custom: { notifType: "connection_accepted" },
          } as any).catch(() => {});
        } catch {}
      } else {
        console.warn("STREAM: missing API key/secret, skipping event emit");
      }
    } catch (e) {
      console.error("Stream event send failed (accepted)", e);
    }

    return NextResponse.json({
      message: "Connection request accepted successfully",
      status: "connected",
    });
  } catch (error) {
    console.error("Error accepting connection request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Withdraw connection request
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }

    // Check if targetUserId is a Clerk ID or MongoDB ObjectId
    let findTargetUserPromise;
    if (targetUserId.startsWith('user_')) {
      findTargetUserPromise = User.findByClerkId(targetUserId);
    } else {
      findTargetUserPromise = User.findById(targetUserId);
    }

    // Find both users
    const [currentUser, targetUser] = await Promise.all([
      User.findByClerkId(userId),
      findTargetUserPromise,
    ]);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert to MongoDB ObjectId for connection operations
    const targetUserObjectId = targetUser._id.toString();

    // Withdraw the connection request - use MongoDB ObjectIds
    await currentUser.withdrawConnectionRequest(targetUserObjectId);
    await targetUser.removeReceivedConnectionRequest(currentUser._id.toString());

    // Remove any connection request notifications - use MongoDB ObjectId for recipient
    await Notification.deleteMany({
      recipient: targetUserObjectId,
      sender: currentUser._id,
      type: "connection_request",
    });

    // Send real-time Stream event for withdrawal
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          { id: currentUser.clerkId, name: currentUser.fullName, image: currentUser.avatar || undefined },
          { id: targetUser.clerkId, name: targetUser.fullName, image: targetUser.avatar || undefined },
        ]);
        await serverClient.sendUserEvent(
          {
            type: "user.notification",
            notifType: "connection_withdrawn",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
          } as any,
          [targetUser.clerkId]
        );
        console.log("STREAM: sent user.notification (connection_withdrawn) to", targetUser.clerkId);

        // Also send to target's notifications channel
        try {
          const notifId = `notifications_${targetUser.clerkId}`;
          const notifCh = serverClient.channel("messaging", notifId, { members: [targetUser.clerkId] });
          await notifCh.create().catch(() => {});
          await notifCh.sendEvent({
            type: "connection_withdrawn",
            fromClerkId: currentUser.clerkId,
            fromFullName: currentUser.fullName,
          } as any);
          // Fallback: also send a tiny message to trigger message.new
          await notifCh.sendMessage({
            text: `A connection request was withdrawn`,
            type: "system",
            custom: { notifType: "connection_withdrawn" },
          } as any).catch(() => {});
        } catch {}
      } else {
        console.warn("STREAM: missing API key/secret, skipping event emit");
      }
    } catch (e) {
      console.error("Stream event send failed (withdraw)", e);
    }

    // Also emit DM system message for withdrawal
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        const dmId = `dm_${[currentUser.clerkId, targetUser.clerkId].sort().join("_")}`;
        const channel = serverClient.channel("messaging", dmId, {
          members: [currentUser.clerkId, targetUser.clerkId],
        });
        await channel.create().catch(() => {});
        await channel.sendMessage({
          text: `${currentUser.fullName} withdrew their connection request`,
          type: "system",
          fromClerkId: currentUser.clerkId,
          custom: { notifType: "connection_withdrawn" },
        } as any);
        console.log("STREAM: sent system message (connection_withdrawn) on", dmId);
      }
    } catch (e) {
      console.error("Stream DM message failed (withdraw)", e);
    }

    // Don't create withdrawal notification - user doesn't need to know about withdrawn requests
    // This prevents notification clutter when requests are withdrawn

    return NextResponse.json({
      message: "Connection request withdrawn successfully",
      status: "not_connected",
    });
  } catch (error) {
    console.error("Error withdrawing connection request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get connection status between users
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const currentUser = await User.findByClerkId(userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If targetUserId is a Clerk ID, we need to find the MongoDB ObjectId first
    let targetUserObjectId = targetUserId;
    if (targetUserId.startsWith('user_')) {
      const targetUser = await User.findByClerkId(targetUserId);
      if (targetUser) {
        targetUserObjectId = targetUser._id.toString();
      } else {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }
    }

    const connectionStatus = currentUser.getConnectionStatus(targetUserObjectId);

    return NextResponse.json({
      status: connectionStatus,
    });
  } catch (error) {
    console.error("Error getting connection status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
