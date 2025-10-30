"use client";

import React from "react";
import ChatWindow from "@/components/messages/ChatWindow";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams<{ clerkId: string }>();
  const clerkId = String(params?.clerkId || "");

  return <ChatWindow clerkId={clerkId} />;
}
