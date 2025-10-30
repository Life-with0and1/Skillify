"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { StreamChat } from "stream-chat";
import { toast } from "react-hot-toast";

let chatClient: StreamChat | null = null;

export default function StreamBootstrapper() {
  const { isSignedIn } = useAuth();
  const connectingRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      // Disconnect when the user signs out
      if (chatClient) {
        chatClient.disconnectUser();
        chatClient = null;
      }
      return;
    }

    // Prevent duplicate connects
    if (connectingRef.current || chatClient) return;
    connectingRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/stream/token", { method: "POST" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to fetch Stream token");
        }
        const { token, apiKey, userId } = await res.json();

        const client = StreamChat.getInstance(apiKey);
        await client.connectUser({ id: userId }, token);
        chatClient = client;
        try { (window as any).chatClient = client; } catch {}
        console.log("STREAM: connected as", userId);
        // Prompt UI to refresh inbox/unread immediately on connect
        try { window.dispatchEvent(new CustomEvent('messages:refresh')); } catch {}

        // Ensure and watch per-user notifications channel
        try {
          const notifId = `notifications_${userId}`;
          const notifCh = client.channel('messaging', notifId, { members: [userId] });
          await notifCh.create().catch(() => {});
          await notifCh.watch();
          console.log('STREAM: notifications channel ready', notifId);
        } catch (e) {
          console.warn('STREAM: notifications channel watch failed');
        }

        // Watch user's DM channels so message events are delivered
        const runQuery = async () => {
          try {
            const channels = await client.queryChannels(
              { type: 'messaging', members: { $in: [userId] } },
              { last_message_at: -1 },
              { watch: true, state: true, limit: 30 }
            );
            console.log("STREAM: watching DM channels count", channels.length);
          } catch (e) {
            console.warn("STREAM: queryChannels failed", e);
          }
        };
        await runQuery();
        const queryInterval = setInterval(runQuery, 15000);

        // Rewatch channels and refresh UI on reconnects
        client.on((e) => {
          const t = (e as any)?.type as string | undefined;
          if (t === 'connection.changed' && (e as any)?.online) {
            runQuery();
            try { window.dispatchEvent(new CustomEvent('messages:refresh')); } catch {}
          }
        });

        // Allow UI to request watching a specific DM channel
        const onWatchDm = (ev: any) => {
          try {
            const chId = ev?.detail?.channelId as string | undefined;
            if (!chId) return;
            const providedMembers = Array.isArray(ev?.detail?.members) ? ev.detail.members.filter(Boolean) : undefined;
            const parsedMembers = (!providedMembers && chId.startsWith('dm_')) ? chId.slice(3).split('_').filter(Boolean) : undefined;
            const members = providedMembers && providedMembers.length >= 2 ? providedMembers : parsedMembers;
            const ch = client.channel('messaging', chId, members ? { members } : undefined);
            ch.watch().catch(() => {});
          } catch {}
        };
        window.addEventListener('stream:watch-dm', onWatchDm as EventListener);

        // Listen for user-level notification events and refresh UI instantly
        client.on((event) => {
          const tAny = (event as any)?.type as string | undefined;
          const t = tAny; // treat as dynamic string to allow custom events
          const kind = (event as any)?.notifType as string | undefined;
          console.log("STREAM: event received", { type: t, notifType: kind, raw: event });

          // Handle custom per-user notification channel events FIRST so they don't get filtered out
          if (t === 'connection_request' || t === 'connection_accepted' || t === 'connection_withdrawn') {
            try {
              const who = (event as any)?.fromFullName || (event as any)?.user?.name || 'Someone';
              if (t === 'connection_request') {
                try { toast.success(`${who} sent you a connection request`); } catch {}
              } else if (t === 'connection_accepted') {
                try { toast.success(`${who} accepted your connection request`); } catch {}
              } else if (t === 'connection_withdrawn') {
                try { toast('A connection request was withdrawn', { icon: '⚠️' }); } catch {}
              }
              window.dispatchEvent(new CustomEvent('notifications:increment', { detail: { delta: 1 } }));
              window.dispatchEvent(new CustomEvent('notifications:refresh'));
            } catch {}
            return;
          }

          // When you're added to a channel, start watching it so you can receive message events
          if (t === 'notification.added_to_channel' || t === 'channel.created') {
            try {
              const cid = (event as any)?.cid as string | undefined; // e.g. "messaging:dm_userA_userB"
              const channelId = cid ? cid.split(":")[1] : (event as any)?.channel?.id;
              if (channelId) {
                const ch = client.channel('messaging', channelId);
                ch.watch().catch(() => {});
                window.dispatchEvent(new CustomEvent('messages:refresh'));
              }
            } catch {}
          }

          // We support both legacy custom types and unified user.notification with notifType
          const isLegacy = t === "notification.connection_request" || t === "notification.connection_accepted" || t === "notification.connection_withdrawn";
          const isUnified = t === "user.notification" && !!kind;
          const isDMMessage = t === "message.new" && !!(event as any)?.message?.custom?.notifType;
          const isDMNotification = t === "notification.message_new" && !!(event as any)?.message?.custom?.notifType;
          // Also forward real-time chat messages
          if (t === "message.new" || t === "notification.message_new") {
            try {
              const cid = (event as any)?.cid as string | undefined; // e.g. "messaging:dm_userA_userB"
              const channelId = cid ? cid.split(":")[1] : (event as any)?.channel?.id;
              const msg = (event as any)?.message;
              window.dispatchEvent(new CustomEvent("chat:message", {
                detail: {
                  channelId,
                  userId: msg?.user?.id,
                  text: msg?.text,
                  createdAt: msg?.created_at,
                },
              }));
              // Trigger UI refreshes and unread badge updates (with retries for DB consistency)
              window.dispatchEvent(new CustomEvent("messages:refresh"));
              setTimeout(() => window.dispatchEvent(new CustomEvent("messages:refresh")), 250);
              setTimeout(() => window.dispatchEvent(new CustomEvent("messages:refresh")), 1000);
              const me = (client as any)?.user?.id as string | undefined;
              if (msg?.user?.id && msg.user.id !== me) {
                window.dispatchEvent(new CustomEvent("messages:unread", { detail: { channelId, fromId: msg.user.id } }));
                // Also emit unread keyed by sender's clerkId for conversation list highlighting
                window.dispatchEvent(new CustomEvent("messages:unread-user", { detail: { clerkId: msg.user.id } }));
              }
            } catch {}
          }

          if (!isLegacy && !isUnified && !isDMMessage && !isDMNotification) return;

          // Optimistically bump badge immediately
          window.dispatchEvent(new CustomEvent("notifications:increment", { detail: { delta: 1 } }));
          // Immediate refresh
          window.dispatchEvent(new CustomEvent("notifications:refresh"));
          // Staged retries to avoid race with DB write
          setTimeout(() => window.dispatchEvent(new CustomEvent("notifications:refresh")), 250);
          setTimeout(() => window.dispatchEvent(new CustomEvent("notifications:refresh")), 1000);

          // Toast UX
          try {
            const who = (event as any)?.fromFullName || (event as any)?.message?.user?.name || "Someone";
            const k = isUnified ? kind : (isDMMessage || isDMNotification) ? (event as any)?.message?.custom?.notifType : (t ? t.split(".")[1] : "");
            if (k === "connection_request") {
              toast.success(`${who} sent you a connection request`);
            } else if (k === "connection_accepted") {
              toast.success(`${who} accepted your connection request`);
            } else if (k === "connection_withdrawn") {
              toast("A connection request was withdrawn", { icon: "⚠️" });
            }
          } catch {}
        });
      } catch (e: any) {
        console.error("STREAM: bootstrap failed", e);
        try { toast.error(e?.message || "Stream connect failed"); } catch {}
      } finally {
        connectingRef.current = false;
      }
    })();
  }, [isSignedIn]);

  return null;
}
