"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/api";

interface IncomingState {
  url: string;
  fromId: string;
}

export default function IncomingCallListener() {
  const { user } = useUser();
  const myId = user?.id;
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingState | null>(null);

  useEffect(() => {
    const onChat = (e: any) => {
      try {
        const detail = e?.detail as { userId?: string; text?: string } | undefined;
        if (!detail?.text) return;
        // Ignore messages sent by me
        if (detail.userId && myId && detail.userId === myId) return;
        const m = String(detail.text);
        // Match original pattern OR any call URL
        let url: string | null = null;
        const match = m.match(/Join\s+video\s+call:\s+(https?:\/\/\S+)/i);
        if (match && match[1]) url = match[1];
        if (!url) {
          const anyUrl = m.match(/https?:\/\/\S+/i);
          if (anyUrl && anyUrl[0] && /\/call\//i.test(anyUrl[0])) url = anyUrl[0];
        }
        if (url) {
          // Prevent duplicate modals
          setIncoming((cur) => cur || { url, fromId: detail.userId || "" });
        }
      } catch {}
    };
    window.addEventListener("chat:message", onChat as EventListener);
    return () => window.removeEventListener("chat:message", onChat as EventListener);
  }, [myId]);

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-4">
        <div className="font-semibold mb-2">Incoming call</div>
        <p className="text-sm text-gray-600 mb-4">You are being invited to join a video call.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={async () => {
              try {
                // Parse callId from URL: .../call/<callId>?...
                const m = incoming.url.match(/\/call\/([^?]+)/i);
                const callId = m && m[1] ? m[1] : undefined;
                if (incoming.fromId && callId) {
                  await sendMessage(incoming.fromId, `CALL_DECLINED:${callId}`);
                } else if (incoming.fromId) {
                  await sendMessage(incoming.fromId, `CALL_DECLINED`);
                }
              } catch {}
              setIncoming(null);
            }}
            className="px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
          >
            Decline
          </button>
          <button
            onClick={() => {
              const url = incoming.url;
              setIncoming(null);
              try {
                const local = typeof window !== "undefined" ? window.location.origin : "";
                const path = String(url).replace(local, "");
                router.push(path);
              } catch {
                window.location.href = String(url);
              }
            }}
            className="px-3 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
