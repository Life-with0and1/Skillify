"use client";

import React from "react";
import ChatSidebar from "@/components/messages/ChatSidebar";
import { usePathname } from "next/navigation";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Detect if we're on a specific chat route like /messages/[clerkId]
  const isChatRoute = /\/messages\/.+/.test(pathname || "");

  return (
    <div className="h-screen bg-gray-50 flex p-4 sm:p-6">
      {/* Sidebar: visible on mobile only on /messages, and always on md+ */}
      <aside className={`${isChatRoute ? "hidden" : "block"} md:block w-full md:w-80 bg-white border-r shadow-sm rounded-lg md:rounded-none flex flex-col min-h-0`}>
        <ChatSidebar />
      </aside>
      {/* Main: visible on mobile only on chat route, and always on md+ */}
      <main className={`${isChatRoute ? "block" : "hidden"} md:block flex-1 bg-white rounded-lg md:rounded-none md:ml-4 flex min-h-0`}>
        <div className="h-full w-full p-4 sm:p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
