"use client";

import React from "react";

export default function MessagesHome() {
  return (
    <div className="h-full flex items-center justify-center text-center p-8">
      <div>
        <i className="fas fa-comment-dots text-4xl text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold">Select a chat to start messaging</h2>
        <p className="text-gray-500 text-sm">Choose a conversation from the left sidebar.</p>
      </div>
    </div>
  );
}
