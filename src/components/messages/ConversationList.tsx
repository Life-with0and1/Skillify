"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { listInbox, InboxItem } from "@/lib/api";
import { useUser } from "@clerk/nextjs";

interface ConversationListProps {
  selectedClerkId?: string;
  onSelect?: (clerkId: string) => void;
}

export default function ConversationList({ selectedClerkId, onSelect }: ConversationListProps) {
  const { isLoaded } = useUser();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
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
        const res = await listInbox();
        if (res.conversations) setItems(res.conversations);
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded) load();
  }, [isLoaded]);

  // Save unread state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('unreadChats', JSON.stringify(Array.from(unreadByUser)));
    }
  }, [unreadByUser]);

  // Listen for unread/read events keyed by clerkId
  useEffect(() => {
    const onUnreadUser = (e: any) => {
      const detail = e?.detail as { clerkId?: string };
      setUnreadByUser((prev) => new Set(prev).add(detail.clerkId!));
    };
    const onReadUser = (e: any) => {
      const detail = e?.detail as { clerkId?: string };
      if (!detail?.clerkId) return;
      setUnreadByUser((prev) => {
        const n = new Set(prev);
        n.delete(detail.clerkId!);
        return n;
      });
    };
    window.addEventListener("messages:unread-user", onUnreadUser as EventListener);
    window.addEventListener("messages:read-user", onReadUser as EventListener);
    return () => {
      window.removeEventListener("messages:unread-user", onUnreadUser as EventListener);
      window.removeEventListener("messages:read-user", onReadUser as EventListener);
    };
  }, []);

  return (
    <aside className="w-80 bg-white border-r h-screen flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search for people..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading conversations…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <i className="fas fa-comment-dots text-3xl text-gray-300 mb-3" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start chatting with other users to see your conversations here</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const isUnread = unreadByUser.has(item.other.clerkId);
              const isSelected = selectedClerkId === item.other.clerkId;
              const messageDate = new Date(item.updatedAt || Date.now());
              const formattedDate = messageDate.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              });

              return (
                <Link
                  key={item.id}
                  href={`/messages/${item.other.clerkId}`}
                  onClick={(e) => {
                    // Mark as read when clicked
                    window.dispatchEvent(new CustomEvent("messages:read-user", { detail: { clerkId: item.other.clerkId } }));
                    onSelect?.(item.other.clerkId);
                  }}
                  className={`block p-4 hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50 border-r-2 border-blue-600" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className={`text-sm font-medium ${
                          isUnread ? "text-blue-600 font-semibold" : "text-gray-900"
                        }`}>
                          {item.other.name}
                        </h3>
                        {isUnread && (
                          <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">{formattedDate}</span>
                        <span className={`text-sm truncate ${
                          isUnread ? "text-blue-600" : "text-gray-600"
                        }`}>
                          {item.lastMessage || "No messages yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
