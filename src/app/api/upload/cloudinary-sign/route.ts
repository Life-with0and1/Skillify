import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const missing: string[] = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY or NEXT_PUBLIC_CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
    if (missing.length) {
      return NextResponse.json({ error: `Cloudinary env vars missing: ${missing.join(', ')}` }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Sign minimal params; if you use an unsigned preset, you can omit signature entirely.
    // Here we sign by timestamp (and optionally upload_preset if provided)
    const paramsToSign: Record<string, string | number> = { timestamp };
    if (uploadPreset) paramsToSign.upload_preset = uploadPreset;

    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");
    const toSign = `${sorted}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    return NextResponse.json({ cloudName, apiKey, timestamp, signature, uploadPreset });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create signature" }, { status: 500 });
  }
}
