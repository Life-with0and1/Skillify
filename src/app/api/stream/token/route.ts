import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const API_KEY = process.env.STREAM_KEY;
    const API_SECRET = process.env.STREAM_SECRET;

    if (!API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: "Stream credentials are not configured" },
        { status: 500 }
      );
    }

    // Server-side Stream client (safe: runs only on server)
    const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

    // Issue a user token using the Clerk userId as Stream user id
    const token = serverClient.createToken(userId);

    // Return token and public key only; no secrets
    return NextResponse.json(
      { token, apiKey: API_KEY, userId },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}