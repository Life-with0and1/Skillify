// API utility functions for user operations

export interface ApiResponse<T> {
  user?: T;
  users?: T;
  error?: string;
  message?: string;
}

// List connected users for starting new chats
export async function listConnections(): Promise<{ users?: ConnectionLite[]; error?: string }> {
  try {
    const res = await fetch(`/api/connections/list`, { headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load connections");
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Messaging types
export interface InboxItem {
  id: string;
  other: { clerkId: string; name: string; avatar: string };
  lastMessage: string;
  lastSenderId: string | null;
  updatedAt: string;
}

export interface MessageItem {
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
}

export interface ConnectionLite {
  clerkId: string;
  name: string;
  avatar: string;
}

export interface UserSkills {
  skillsTeaching: Array<{
    skill: string;
  }>;
  skillsLearning: Array<{
    skill: string;
  }>;
}

// Get user data from database
export async function getUser(clerkId: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`/api/users/${clerkId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch user");
    }

    return data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// List inbox conversations
export async function listInbox(): Promise<{ conversations?: InboxItem[]; error?: string }> {
  try {
    const res = await fetch(`/api/messages/inbox`, { headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load inbox");
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Get thread with a user
export async function getThread(clerkId: string): Promise<{ conversationId?: string; messages?: MessageItem[]; error?: string }> {
  try {
    const res = await fetch(`/api/messages/with/${clerkId}`, { headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load thread");
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Send a message to a user
export async function sendMessage(clerkId: string, text: string): Promise<{ message?: any; error?: string }> {
  try {
    const res = await fetch(`/api/messages/with/${clerkId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send message");
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Update user profile
export async function updateUser(
  clerkId: string,
  userData: any
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`/api/users/${clerkId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update user");
    }

    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Update user skills
export async function updateUserSkills(
  clerkId: string,
  skills: UserSkills
): Promise<ApiResponse<UserSkills>> {
  try {
    const response = await fetch(`/api/users/${clerkId}/skills`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(skills),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update skills");
    }

    return data;
  } catch (error) {
    console.error("Error updating skills:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Add a single skill
export async function addSkill(
  clerkId: string,
  skill: string,
  type: "teaching" | "learning"
): Promise<ApiResponse<UserSkills>> {
  try {
    const response = await fetch(`/api/users/${clerkId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ skill, type }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to add skill");
    }

    return data;
  } catch (error) {
    console.error("Error adding skill:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Remove a skill
export async function removeSkill(
  clerkId: string,
  skill: string,
  type: "teaching" | "learning"
): Promise<ApiResponse<UserSkills>> {
  try {
    const response = await fetch(`/api/users/${clerkId}/skills`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ skill, type }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to remove skill");
    }

    return data;
  } catch (error) {
    console.error("Error removing skill:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// List users except current
export async function listUsers(params?: { q?: string; sort?: "rating" | "reviews" | "recent" | "connections" | "smart"; smart?: boolean }): Promise<ApiResponse<any[]>> {
  try {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.smart) qs.set("smart", "1");
    const url = `/api/users${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to list users");
    }
    return data;
  } catch (error) {
    console.error("Error listing users:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    } as any;
  }
}
