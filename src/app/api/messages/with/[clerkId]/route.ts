import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { StreamChat } from "stream-chat";
import crypto from "crypto";

export async function GET(_req: NextRequest, { params }: { params: { clerkId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const otherId = params.clerkId;

    await dbConnect();

    const convo = await Conversation.upsertBetween(userId, otherId);

    // Ensure Stream DM channel exists so client can watch and receive events
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          { id: userId },
          { id: otherId },
        ]);
        const sorted = [userId, otherId].sort().join("|");
        const hash = crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 56);
        const dmId = `dm_${hash}`;
        const channel = serverClient.channel("messaging", dmId, { members: [userId, otherId] });
        await channel.create().catch(() => {});
      }
    } catch (e) {
      // Non-fatal: Stream might be misconfigured locally; continue serving thread
      console.warn("STREAM: failed to ensure DM channel on GET", e);
    }

    const messages = await Message.find({ conversation: convo._id })
      .sort({ createdAt: 1 })
      .select("senderId recipientId text createdAt")
      .lean();

    // Recompute channelId to return to client
    let channelId: string | undefined = undefined;
    try {
      const sorted = [userId, otherId].sort().join("|");
      const hash = crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 56);
      channelId = `dm_${hash}`;
    } catch {}

    return NextResponse.json({ conversationId: String(convo._id), channelId, messages });
  } catch (e) {
    console.error("Thread GET error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { clerkId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const otherId = params.clerkId;
    const body = await req.json();
    const text = (body?.text || "").trim();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

    await dbConnect();

    const convo = await Conversation.upsertBetween(userId, otherId);

    const msg = await Message.create({ conversation: convo._id, senderId: userId, recipientId: otherId, text });
    await Conversation.updateOne({ _id: convo._id }, { $set: { lastMessage: text, lastSenderId: userId } });

    // Also broadcast via Stream to real-time clients
    try {
      const API_KEY = process.env.STREAM_KEY;
      const API_SECRET = process.env.STREAM_SECRET;
      if (API_KEY && API_SECRET) {
        const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
        await serverClient.upsertUsers([
          { id: userId },
          { id: otherId },
        ]);
        const sorted = [userId, otherId].sort().join("|");
        const hash = crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 56);
        const dmId = `dm_${hash}`;
        const channel = serverClient.channel("messaging", dmId, { members: [userId, otherId] });
        await channel.create().catch(() => {});
        // Send as the real user so event.message.user.id equals the Clerk id
        await channel.sendMessage({ text, user_id: userId });
      }
    } catch (e) {
      console.warn("STREAM: failed to send DM message", e);
    }

    return NextResponse.json({ message: { id: String(msg._id), senderId: msg.senderId, recipientId: msg.recipientId, text: msg.text, createdAt: msg.createdAt } });
  } catch (e) {
    console.error("Thread POST error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
