import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StreamClient } from "@stream-io/node-sdk";

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

    // Stream server client for Video tokens
    const serverClient = new StreamClient(API_KEY, API_SECRET);

    // Create a token valid for Video (and compatible services)
    const token = serverClient.createToken(userId);

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
