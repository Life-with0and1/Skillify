"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  StreamVideoClient,
  StreamVideo,
  Call,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { sendMessage } from "@/lib/api";

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>();
  const { user } = useUser();
  const me = user?.id || "";
  const router = useRouter();
  const qp = useSearchParams();
  const other = qp.get("other") || "";
  const isCaller = qp.get("caller") === "1";

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/stream/video-token", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error || `Token endpoint failed (${res.status})`;
          console.error("VIDEO: token fetch failed", msg);
          setError(msg);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setApiKey(data.apiKey);
        setToken(data.token);
      } catch (e: any) {
        console.error("VIDEO: token fetch error", e);
        setError(e?.message || "Failed to fetch token");
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!apiKey || !token || !me) return;
    try {
      const c = new StreamVideoClient({ apiKey, user: { id: me }, token });
      setClient(c);
      return () => { try { (c as any)?.disconnectUser?.(); } catch {} };
    } catch (e: any) {
      console.error("VIDEO: client init error", e);
      setError(e?.message || "Failed to initialize video client");
    }
  }, [apiKey, token, me]);

  useEffect(() => {
    if (!client || !callId) return;
    const cl = client.call("default", String(callId));
    setCall(cl);
  }, [client, callId]);

  useEffect(() => {
    if (!call || !me) return;
    (async () => {
      try {
        if (isCaller) {
          console.log("VIDEO: creating call", { callId, me, other });
          await call.join({ create: true });
        } else {
          console.log("VIDEO: joining call", { callId, me });
          await call.join();
        }
        try {
          await call.camera.enable();
          await call.microphone.enable();
        } catch (e) {
          console.warn("VIDEO: device enable warning", e);
        }
      } catch (e: any) {
        console.error("VIDEO: join error", e);
        setError(e?.message || "Failed to join call");
      }
    })();
  }, [call, me, isCaller, other]);

  const ready = useMemo(() => !!client && !!call, [client, call]);

  // If the other user declines, cut the call for me as well
  useEffect(() => {
    const onChat = async (e: any) => {
      try {
        const detail = e?.detail as { userId?: string; text?: string } | undefined;
        if (!detail?.text) return;
        // Only react to messages from the other participant
        if (detail.userId && detail.userId === me) return;
        const text = String(detail.text);
        const declinedForThis = new RegExp(`^CALL_DECLINED:?${callId ? String(callId).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") : ''}`, 'i').test(text) || /^CALL_DECLINED$/i.test(text);
        if (declinedForThis) {
          try { await call?.leave?.(); } catch {}
          if (other) router.push(`/messages/${encodeURIComponent(other)}`);
          else router.back();
        }
      } catch {}
    };
    window.addEventListener('chat:message', onChat as EventListener);
    return () => window.removeEventListener('chat:message', onChat as EventListener);
  }, [call, callId, me, other, router]);

  // React to built-in Leave button: when calling state becomes LEFT, navigate away
  useEffect(() => {
    if (!call) return;
    let active = true;
    const timer = setInterval(() => {
      if (!active) return;
      try {
        const st: any = (call as any)?.state?.callingState;
        if (st === CallingState.LEFT || st === 'left') {
          clearInterval(timer);
          // Notify the other participant in chat that the call ended
          try {
            if (other) {
              sendMessage(other, "🔚 Call ended").catch(() => {});
            }
          } catch {}
          if (other) router.push(`/messages/${encodeURIComponent(other)}`);
          else router.back();
        }
      } catch {}
    }, 400);
    return () => { active = false; clearInterval(timer); };
  }, [call, other, router]);

  // Listen for recording start/stop from built-in controls and persist on stop
  useEffect(() => {
    if (!call) return;
    const onStarted = () => setRecording(true);
    const onStopped = async () => {
      setRecording(false);
      try {
        // Try to fetch recordings to get an asset URL
        // If not available immediately, save without URL; webhook can update later
        let url: string | undefined;
        try {
          const list: any = await (call as any).queryRecordings?.();
          const first = Array.isArray(list?.recordings) ? list.recordings[0] : undefined;
          url = first?.url || first?.file?.url;
        } catch {}
        await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: String(callId), otherUserId: other, title: `Recording ${new Date().toLocaleString()}`, url }),
        });
      } catch {}
    };
    (call as any).on?.('call.recording_started', onStarted);
    (call as any).on?.('call.recording_stopped', onStopped);
    return () => {
      try {
        (call as any).off?.('call.recording_started', onStarted);
        (call as any).off?.('call.recording_stopped', onStopped);
      } catch {}
    };
  }, [call, callId, other]);

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-red-600 font-semibold">Call error</div>
        <div className="text-sm text-gray-700">{String(error)}</div>
        <button onClick={() => router.back()} className="mt-2 px-3 py-2 rounded bg-gray-800 text-white">Go back</button>
      </div>
    );
  }

  if (!ready) return <div className="p-6">Connecting...</div>;

  return (
    <StreamVideo client={client!}>
      <StreamCall call={call!}>
        <StreamTheme>
          <div className="fixed inset-0 z-[1000] bg-white text-black flex flex-col">
            <div className="flex-1 min-h-0">
              <SpeakerLayout />
            </div>
            <div className="border-t border-gray-200">
              <CallControls />
            </div>
          </div>
        </StreamTheme>
      </StreamCall>
    </StreamVideo>
  );
}
