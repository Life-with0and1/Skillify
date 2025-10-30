"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getThread, sendMessage, MessageItem, getUser as getUserApi } from "@/lib/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ChatWindow({ clerkId }: { clerkId: string }) {
  const { user } = useUser();
  const myId = user?.id;
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [other, setOther] = useState<{ name: string; avatar: string } | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<{ url: string; fromId: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    try { bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }); } catch {}
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getThread(clerkId);
        if (res.messages) setMessages(res.messages);
        // Prefer server-provided hashed channel id; fallback to computed
        const computed = `dm_${[myId || "", clerkId].sort().join("_")}`;
        const cid = (res as any)?.channelId || computed;
        setChannelId(cid);
        // Ask Stream client to watch this channel immediately
        try {
          if (myId && clerkId && cid) {
            window.dispatchEvent(new CustomEvent("stream:watch-dm", { detail: { channelId: cid, members: [myId, clerkId] } }));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    // Ensure we have both participants before creating/ watching the DM channel
    if (clerkId && myId) {
      load();
    }
  }, [clerkId, myId]);

  // Expose the currently open channel globally so other listeners can compare
  useEffect(() => {
    try {
      if (channelId) (window as any).currentChannelId = channelId;
    } catch {}
    return () => {
      try { if ((window as any).currentChannelId === channelId) (window as any).currentChannelId = null; } catch {}
    };
  }, [channelId]);

  // Clear unread highlighting when this chat is opened
  useEffect(() => {
    if (channelId && clerkId) {
      try {
        window.dispatchEvent(new CustomEvent("messages:read-user", { detail: { clerkId } }));
      } catch {}
    }
  }, [channelId, clerkId]);

  // Real-time update via Stream events forwarded by StreamBootstrapper
  useEffect(() => {
    if (!myId || !clerkId) return;
    const listener = (e: any) => {
      const detail = e?.detail as { channelId?: string; userId?: string; text?: string; createdAt?: string };
      const expected = channelId || `dm_${[myId, clerkId].sort().join("_")}`;
      const matchesChannel = !!detail?.channelId && detail.channelId === expected;
      if (!matchesChannel) return;
      if (!detail.text) return;
      // Ignore messages we just sent (optimistic already handled)
      if (detail.userId === myId) return;
      setMessages(prev => [...prev, { senderId: detail.userId || "", recipientId: detail.userId === myId ? clerkId : (myId || ""), text: detail.text!, createdAt: detail.createdAt || new Date().toISOString() }]);
      // Clear unread for this open channel
      window.dispatchEvent(new CustomEvent("messages:read", { detail: { channelId: expected } }));
      // Detect incoming call invite message and prompt Accept/Decline
      try {
        const m = String(detail.text);
        const match = m.match(/Join video call:\s+(https?:\/\/\S+)/i);
        if (match && match[1]) {
          setIncoming({ url: match[1], fromId: detail.userId || "" });
        }
      } catch {}
    };
    window.addEventListener("chat:message", listener as EventListener);
    return () => window.removeEventListener("chat:message", listener as EventListener);
  }, [clerkId, myId, channelId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (!loading) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Mark as read on mount and whenever window gains focus
  useEffect(() => {
    if (!myId || !clerkId) return;
    const cid = channelId || `dm_${[myId, clerkId].sort().join("_")}`;
    window.dispatchEvent(new CustomEvent("messages:read", { detail: { channelId: cid } }));
    const onFocus = () => {
      window.dispatchEvent(new CustomEvent("messages:read", { detail: { channelId: cid } }));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [clerkId, myId, channelId]);

  // Load other user's display info (name, avatar)
  useEffect(() => {
    const loadOther = async () => {
      try {
        const res = await getUserApi(clerkId);
        const u: any = (res as any).user;
        if (u) {
          setOther({ name: u.fullName || "Unknown", avatar: u.avatar || "/default-avatar.png" });
        } else {
          setOther({ name: clerkId, avatar: "/default-avatar.png" });
        }
      } catch {
        setOther({ name: clerkId, avatar: "/default-avatar.png" });
      }
    };
    if (clerkId) loadOther();
  }, [clerkId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const optimistic: MessageItem = { senderId: myId || "me", recipientId: clerkId, text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    const res = await sendMessage(clerkId, text);
    if (res.error) {
      // Rollback on error
      setMessages(prev => prev.filter(m => m !== optimistic));
      setInput(text);
      return;
    }
  };

  const otherHeader = useMemo(() => ({ name: other?.name || `Chat with ${clerkId}`, avatar: other?.avatar || "/default-avatar.png" }), [other, clerkId]);
  const callId = useMemo(() => {
    const a = String(myId || "").replace(/^user_/, "");
    const b = String(clerkId || "").replace(/^user_/, "");
    const [x, y] = [a, b].sort();
    // Short deterministic ID: max ~35 chars
    return `c_${x.slice(0,16)}_${y.slice(0,16)}`;
  }, [myId, clerkId]);
  const onStartCall = () => {
    if (!myId || !clerkId) return;
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/call/${encodeURIComponent(callId)}?other=${encodeURIComponent(myId)}`;
      // Send a message with the join link so the recipient can click to join
      sendMessage(clerkId, `Join video call: ${url}`).catch(() => {});
      // Ensure the DM channel is being watched globally so decline/accept messages reach all pages immediately
      try {
        const channelId = `dm_${[myId, clerkId].sort().join("_")}`;
        window.dispatchEvent(new CustomEvent("stream:watch-dm", { detail: { channelId, members: [myId, clerkId] } }));
      } catch {}
    } catch {}
    router.push(`/call/${encodeURIComponent(callId)}?other=${encodeURIComponent(clerkId)}&caller=1`);
  };

  return (
    <div className="h-full bg-white rounded-lg border shadow-sm flex flex-col">
      {incoming && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-4">
            <div className="font-semibold mb-2">Incoming call</div>
            <p className="text-sm text-gray-600 mb-4">{other?.name || "Someone"} is inviting you to join a video call.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={async () => {
                  try {
                    const m = incoming.url.match(/\/call\/([^?]+)/i);
                    const cId = m && m[1] ? m[1] : undefined;
                    if (incoming.fromId && cId) {
                      await sendMessage(incoming.fromId, `CALL_DECLINED:${cId}`);
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
                onClick={() => { const url = incoming.url; setIncoming(null); router.push(url.replace(window.location.origin, "")); }}
                className="px-3 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="relative w-10 h-10">
          <Image src={otherHeader.avatar} alt={otherHeader.name} fill className="rounded-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 px-3">
          <Link href={`/profile/${clerkId}`} className="font-semibold hover:underline truncate block">
            {otherHeader.name}
          </Link>
          <p className="text-xs text-gray-500">&nbsp;</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onStartCall} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Video Call
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-gray-50">
        {loading && <div className="text-center text-gray-500 text-sm">Loading...</div>}
        {!loading && messages.map((m, idx) => {
          const fromMe = m.senderId === myId;
          const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const text = String(m.text || "");
          const isEnded = /call ended/i.test(text);
          const isInvite = /^(?:Join\s+video\s+call:\s+)(https?:\/\/\S+)/i.test(text);
          if (isInvite) {
            // Do not render the invite line in chat; popup handles the UX
            return null;
          }
          return (
            <div key={idx} className={`w-full flex ${fromMe ? "justify-end" : "justify-start"}`}>
              <div className={`inline-block max-w-[280px] sm:max-w-[420px] lg:max-w-[520px]`}>
                {isEnded ? (
                  <div className={`px-3 py-2 rounded-lg text-sm ${fromMe ? "bg-blue-600 text-white" : "bg-white border"}`}>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-phone-slash text-red-600"></i>
                      <span>Call ended</span>
                    </div>
                  </div>
                ) : (
                  <div className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap [overflow-wrap:anywhere] ${fromMe ? "bg-blue-600 text-white" : "bg-white border"}`}>
                    {m.text}
                  </div>
                )}
                <div className={`text-[10px] text-gray-400 mt-1 ${fromMe ? "text-right" : "text-left"}`}>{time}</div>
              </div>
            </div>
          );
        })}
        {/* bottom sentinel for auto-scroll */}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Send
        </button>
      </div>
    </div>
  );
}