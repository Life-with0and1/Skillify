import 'stream-chat';

declare module 'stream-chat' {
  interface Attachment {
    custom?: {
      notifType: string;
      fromClerkId?: string;
      fromFullName?: string;
      profileUrl?: string;
    };
  }
}

// This file doesn't need to export anything since we're just augmenting types
export {};
