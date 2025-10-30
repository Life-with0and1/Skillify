"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { listInbox, listConnections, InboxItem, ConnectionLite } from "@/lib/api";
import { useUser } from "@clerk/nextjs";

export default function ChatSidebar() {
  const { user } = useUser();
  const myId = user?.id || "";
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionLite[]>([]);
  const [unreadByUser, setUnreadByUser] = useState<Set<string>>(() => {
    // Load unread state from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unreadChats');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [inboxRes, connRes] = await Promise.all([listInbox(), listConnections()]);
        if (inboxRes.conversations) setItems(inboxRes.conversations);
        if (connRes.users) setConnections(connRes.users);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Live refresh and unread tracking
    const onRefresh = () => load();
    const onUnread = (e: any) => {
      const detail = e?.detail as { channelId?: string; fromId?: string };
      if (!detail?.fromId) return;
      setUnreadByUser(prev => new Set(prev).add(detail.fromId!));
    };
    const onRead = (e: any) => {
      const detail = e?.detail as { channelId?: string };
      if (!detail?.channelId) return;
      // For read events, we need to find which user this channel belongs to
      const channelUsers = detail.channelId.slice(3).split('_').filter(Boolean);
      const otherUser = channelUsers.find(id => id !== myId);
      if (otherUser) {
        setUnreadByUser(prev => {
          const next = new Set(prev);
          next.delete(otherUser);
          return next;
        });
      }
    };
    const onUnreadUser = (e: any) => {
      const detail = e?.detail as { clerkId?: string };
      if (!detail?.clerkId) return;
      setUnreadByUser(prev => new Set(prev).add(detail.clerkId!));
    };
    const onReadUser = (e: any) => {
      const detail = e?.detail as { clerkId?: string };
      if (!detail?.clerkId) return;
      setUnreadByUser(prev => {
        const next = new Set(prev);
        next.delete(detail.clerkId!);
        return next;
      });
    };
    window.addEventListener("messages:refresh", onRefresh as EventListener);
    window.addEventListener("messages:unread", onUnread as EventListener);
    window.addEventListener("messages:read", onRead as EventListener);
    window.addEventListener("messages:unread-user", onUnreadUser as EventListener);
    window.addEventListener("messages:read-user", onReadUser as EventListener);
    return () => {
      window.removeEventListener("messages:refresh", onRefresh as EventListener);
      window.removeEventListener("messages:unread", onUnread as EventListener);
      window.removeEventListener("messages:read", onRead as EventListener);
      window.removeEventListener("messages:unread-user", onUnreadUser as EventListener);
      window.removeEventListener("messages:read-user", onReadUser as EventListener);
    };
  }, []);

  // Save unread state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('unreadChats', JSON.stringify(Array.from(unreadByUser)));
    }
  }, [unreadByUser]);

  const filteredInbox = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c => c.other.name.toLowerCase().includes(q));
  }, [query, items]);

  const filteredConnections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(u => u.name.toLowerCase().includes(q));
  }, [query, connections]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center gap-2">
        <i className="fas fa-comments text-gray-600"></i>
        <h2 className="font-semibold">Messages</h2>
      </div>
      <div className="p-3">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y">
        {loading && (
          <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
        )}
        {!loading && query.trim() !== "" && filteredConnections.map(user => (
          <Link key={user.clerkId} href={`/messages/${user.clerkId}`} className="flex items-center gap-3 p-3 hover:bg-gray-50">
            <div className="relative w-10 h-10">
              <Image src={user.avatar} alt={user.name} fill className="rounded-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">Start a new chat</p>
            </div>
          </Link>
        ))}
        {!loading && query.trim() === "" && filteredInbox.map(chat => {
          const hasUnread = unreadByUser.has(chat.other.clerkId);
          return (
          <Link key={chat.other.clerkId} href={`/messages/${chat.other.clerkId}`} className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${hasUnread ? "bg-blue-50" : ""}`}>
            <div className="relative w-10 h-10">
              <Image src={chat.other.avatar} alt={chat.other.name} fill className="rounded-full object-cover" />
              {hasUnread && (<span className="absolute -top-0 -right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`truncate ${hasUnread ? "font-semibold text-blue-900" : "font-medium"}`}>{chat.other.name}</p>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{new Date(chat.updatedAt).toLocaleDateString()}</span>
              </div>
              <p className={`text-sm truncate ${hasUnread ? "text-blue-700" : "text-gray-600"}`}>{chat.lastMessage}</p>
            </div>
          </Link>
        );})}
        {!loading && ((query.trim() !== "" && filteredConnections.length === 0) || (query.trim() === "" && filteredInbox.length === 0)) && (
          <div className="p-6 text-center text-gray-500 text-sm">No results</div>
        )}
      </div>
    </div>
  );
}
