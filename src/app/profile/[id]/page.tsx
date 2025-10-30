"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { getUser } from "@/lib/api";
import { toast } from "react-hot-toast";
import { LoadingSpinner, PageLoader } from "@/components/LoadingSpinner";

const ProfilePage: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const { user: currentUser } = useUser();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type ConnectionStatus = "not_connected" | "request_sent" | "request_received" | "connected";
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("not_connected");
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [recQ, setRecQ] = useState("");
  const [recFriend, setRecFriend] = useState("");
  const [friendNames, setFriendNames] = useState<Record<string, string>>({});
  type PPost = {
    id: string;
    text: string;
    images?: string[];
    tags?: string[];
    createdAt?: string;
    likes: number;
  };
  const [posts, setPosts] = useState<PPost[]>([]);
  const [pNext, setPNext] = useState<string | null>(null);
  const [pHasMore, setPHasMore] = useState<boolean>(true);
  const [pLoading, setPLoading] = useState<boolean>(false);
  const [pLoadingMore, setPLoadingMore] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await getUser(id);

        if (response.user) {
          setUser(response.user);
        } else {
          setError("User not found");
        }
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const timeAgo = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const diff = Math.max(0, Date.now() - d.getTime());
    const m = Math.floor(diff / (1000 * 60));
    if (m < 1) return "just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dy = Math.floor(h / 24);
    if (dy < 7) return `${dy}d`;
    const w = Math.floor(dy / 7);
    if (w < 52) return `${w}w`;
    const y = Math.floor(dy / 365);
    return `${y}y`;
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        if (!id) return;
        setPLoading(true);
        const qs = new URLSearchParams();
        qs.set("limit", "10");
        qs.set("userId", id);
        qs.set("includeSelf", "true");
        const res = await fetch(`/api/posts?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load posts");
        const mapped: PPost[] = (data.posts || []).map((p: any) => ({
          id: String(p._id),
          text: p.text || "",
          images: Array.isArray(p.images) ? p.images : [],
          tags: Array.isArray(p.tags) ? p.tags : [],
          createdAt: p.createdAt,
          likes: Number(p.likes || 0),
        }));
        setPosts(mapped);
        setPNext(data.nextCursor || null);
        setPHasMore(!!data.hasMore);
      } catch {
      } finally {
        setPLoading(false);
      }
    };
    loadInitial();
  }, [id]);

  useEffect(() => {
    if (!bottomRef.current) return;
    const el = bottomRef.current;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting) return;
      if (pLoadingMore || !pHasMore) return;
      (async () => {
        try {
          setPLoadingMore(true);
          const qs = new URLSearchParams();
          qs.set("limit", "10");
          qs.set("userId", id);
          qs.set("includeSelf", "true");
          if (pNext) qs.set("cursor", pNext);
          const res = await fetch(`/api/posts?${qs.toString()}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Failed to load posts");
          const mapped: PPost[] = (data.posts || []).map((p: any) => ({
            id: String(p._id),
            text: p.text || "",
            images: Array.isArray(p.images) ? p.images : [],
            tags: Array.isArray(p.tags) ? p.tags : [],
            createdAt: p.createdAt,
            likes: Number(p.likes || 0),
          }));
          setPosts(prev => [...prev, ...mapped]);
          setPNext(data.nextCursor || null);
          setPHasMore(!!data.hasMore);
        } catch {
        } finally {
          setPLoadingMore(false);
        }
      })();
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [id, pNext, pHasMore, pLoadingMore]);

  // Load recordings for own profile
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        if (!id || currentUser?.id !== id) return;
        setRecLoading(true);
        setRecError(null);
        const qs = new URLSearchParams();
        if (recQ) qs.set("q", recQ);
        if (recFriend) qs.set("friend", recFriend);
        const res = await fetch(`/api/recordings${qs.toString() ? `?${qs.toString()}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load recordings");
        setRecordings(Array.isArray(data.recordings) ? data.recordings : []);
      } catch (e: any) {
        setRecError(e?.message || "Failed to load recordings");
      } finally {
        setRecLoading(false);
      }
    };
    loadRecordings();
  }, [id, currentUser?.id, recQ, recFriend]);

  // Resolve names for otherUserId shown in recordings
  useEffect(() => {
    const resolveNames = async () => {
      try {
        const unique = Array.from(new Set((recordings || []).map((r: any) => r.otherUserId).filter(Boolean)));
        const missing = unique.filter(u => !friendNames[u!]);
        if (missing.length === 0) return;
        const entries: [string, string][] = [];
        for (const uid of missing) {
          try {
            const res = await getUser(uid as string);
            const nm = (res as any)?.user?.fullName || (uid as string);
            entries.push([uid as string, nm]);
          } catch {
            entries.push([uid as string, uid as string]);
          }
        }
        setFriendNames(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch {}
    };
    if ((recordings || []).length) resolveNames();
  }, [recordings]);

  // Fetch connection status for this profile (id is Clerk ID in route)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        if (!id) return;
        const res = await fetch(`/api/connections?targetUserId=${id}`);
        if (res.ok) {
          const data = await res.json();
          setConnectionStatus(data.status as ConnectionStatus);
          setStatusLoaded(true);
        } else {
          // Error handled by state
          setStatusLoaded(true);
        }
      } catch (e) {
        // Error handled by state
        setStatusLoaded(true);
      }
    };
    fetchStatus();
  }, [id]);

  const handleConnection = async () => {
    if (!id) return;
    setConnLoading(true);
    try {
      if (connectionStatus === "not_connected") {
        const response = await fetch("/api/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: id }),
        });
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection request sent!");
          // Force re-fetch to ensure status is updated
          setTimeout(async () => {
            try {
              const res = await fetch(`/api/connections?targetUserId=${id}`);
              if (res.ok) {
                const data = await res.json();
                setConnectionStatus(data.status as ConnectionStatus);
              }
            } catch (e) {}
          }, 100);
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to send connection request");
        }
      } else if (connectionStatus === "request_sent") {
        const response = await fetch("/api/connections", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: id }),
        });
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection request withdrawn");
          // Force re-fetch to ensure status is updated
          setTimeout(async () => {
            try {
              const res = await fetch(`/api/connections?targetUserId=${id}`);
              if (res.ok) {
                const data = await res.json();
                setConnectionStatus(data.status as ConnectionStatus);
              }
            } catch (e) {}
          }, 100);
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to withdraw request");
        }
      } else if (connectionStatus === "request_received") {
        const response = await fetch("/api/connections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: id }),
        });
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection accepted!");
          // Force re-fetch to ensure status is updated
          setTimeout(async () => {
            try {
              const res = await fetch(`/api/connections?targetUserId=${id}`);
              if (res.ok) {
                const data = await res.json();
                setConnectionStatus(data.status as ConnectionStatus);
              }
            } catch (e) {}
          }, 100);
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to accept connection");
        }
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setConnLoading(false);
    }
  };

  if (loading || !statusLoaded) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>User not found</div>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star text-yellow-400"></i>);
    }

    if (hasHalfStar) {
      stars.push(
        <i key="half" className="fas fa-star-half-alt text-yellow-400"></i>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <i key={`empty-${i}`} className="far fa-star text-gray-300"></i>
      );
    }

    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SignedOut>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md mx-4">
            <i className="fas fa-lock text-4xl text-gray-300 mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Profile Access Restricted
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to view user profiles and connect with other
              members.
            </p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Sign In to View Profile
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                <Image
                  src={user.avatar || "/default-avatar.png"}
                  alt={user.fullName || "User"}
                  fill
                  className="rounded-full object-cover"
                  sizes="128px"
                />
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {user.fullName || "Not specified"}
                </h1>
                <div className="flex items-center justify-center lg:justify-start space-x-1 mb-2">
                  {renderStars(user.rating || 0)}
                  <span className="text-base sm:text-lg text-gray-600 ml-2">
                    {user.rating || 0} ({user.totalReviews || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center justify-center lg:justify-start text-gray-600 mb-2 text-sm sm:text-base">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  {user.location || "Not specified"}
                </div>
                <div className="flex items-center justify-center lg:justify-start text-gray-600 mb-2 text-sm sm:text-base">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Joined{" "}
                  {user.joinedAt
                    ? new Date(user.joinedAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    : "Recently"}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 w-full sm:w-auto lg:w-auto">
                {currentUser?.id !== user.clerkId && statusLoaded && (
                  <>
                    {connectionStatus === "connected" && (
                      <Link
                        href={`/messages/${user.clerkId}`}
                        className="px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base bg-green-600 text-white hover:bg-green-700 text-center"
                      >
                        <i className="fas fa-comment-dots mr-2"></i>
                        Message
                      </Link>
                    )}
                    {connectionStatus !== "connected" && (
                      <button
                        onClick={handleConnection}
                        disabled={connLoading}
                        className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base border ${
                          connectionStatus === "request_sent"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-600 hover:bg-yellow-200"
                            : connectionStatus === "request_received"
                            ? "bg-green-100 text-green-800 border-green-600 hover:bg-green-200"
                            : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                        }`}
                      >
                        {connectionStatus === "request_sent"
                          ? (connLoading ? "Withdrawing..." : "Withdraw Request")
                          : connectionStatus === "request_received"
                          ? (connLoading ? "Accepting..." : "Accept Request")
                          : (connLoading ? "Connecting..." : "Connect")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* About */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  About
                </h2>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  {user.bio || "No bio available"}
                </p>
              </div>

              {/* Skills to Teach */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  Skills I Can Teach ({user.skillsTeaching?.length || 0})
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {(user.skillsTeaching || []).map(
                    (skill: any, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3 sm:p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-1 sm:space-y-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            {skill.skill}
                          </h3>
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                          Ready to share knowledge and help others learn this
                          skill
                        </p>
                      </div>
                    )
                  )}
                  {(!user.skillsTeaching ||
                    user.skillsTeaching.length === 0) && (
                    <p className="text-gray-500 text-sm">
                      No teaching skills listed yet
                    </p>
                  )}
                </div>
              </div>

              {/* Skills to Learn */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  Skills I Want to Learn ({user.skillsLearning?.length || 0})
                </h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(user.skillsLearning || []).map(
                    (skill: any, index: number) => (
                      <span
                        key={index}
                        className="bg-purple-50 text-purple-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                      >
                        {skill.skill}
                      </span>
                    )
                  )}
                  {(!user.skillsLearning ||
                    user.skillsLearning.length === 0) && (
                    <p className="text-gray-500 text-sm">
                      No learning goals listed yet
                    </p>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  Reviews ({user.totalReviews || 0})
                </h2>
                <div className="space-y-4">
                  {user.totalReviews > 0 ? (
                    <>
                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center mb-2">
                          <div className="flex text-yellow-400 mr-2">
                            {"★".repeat(5)}
                          </div>
                          <span className="text-sm text-gray-600">5.0</span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          "Great teacher! Very patient and knowledgeable. Highly
                          recommend for anyone looking to learn."
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          - Anonymous • 2 days ago
                        </p>
                      </div>
                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center mb-2">
                          <div className="flex text-yellow-400 mr-2">
                            {"★".repeat(4)}
                          </div>
                          <span className="text-sm text-gray-600">4.0</span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          "Excellent communication and clear explanations. Made
                          learning fun and engaging."
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          - Anonymous • 1 week ago
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">No reviews yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Posts</h2>
                {pLoading && (
                  <div className="text-sm text-gray-500">Loading posts...</div>
                )}
                {!pLoading && posts.length === 0 && (
                  <div className="text-sm text-gray-500">No posts yet</div>
                )}
                <div className="space-y-4">
                  {posts.map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100">
                          <Image src={user.avatar || "/default-avatar.png"} alt={user.fullName || "User"} width={36} height={36} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{user.fullName || "User"}</div>
                          <div className="text-xs text-gray-500">{timeAgo(p.createdAt)}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-gray-800 whitespace-pre-wrap text-sm">{p.text}</div>
                      {Array.isArray(p.images) && p.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {p.images.map((src, idx) => (
                            <img key={idx} src={src} alt="post" className="w-full h-36 object-cover rounded-lg border" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                  {pLoadingMore && (
                    <div className="text-center text-xs text-gray-500">Loading more...</div>
                  )}
                  {!pLoading && !pHasMore && posts.length > 0 && (
                    <div className="text-center text-xs text-gray-400">No more posts</div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6 order-first lg:order-last">
              {/* Previous meetings (only for own profile) */}
              {currentUser?.id === user.clerkId && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Previous meetings</h3>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input
                      value={recQ}
                      onChange={(e) => setRecQ(e.target.value)}
                      placeholder="Filter by recording name"
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      value={recFriend}
                      onChange={(e) => setRecFriend(e.target.value)}
                      placeholder="Filter by friend (Clerk ID)"
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  {recLoading && <div className="text-sm text-gray-500">Loading recordings...</div>}
                  {recError && <div className="text-sm text-red-600">{recError}</div>}
                  {!recLoading && !recError && (
                    <div className="space-y-3">
                      {(recordings || []).length === 0 && (
                        <div className="text-sm text-gray-500">No recordings found</div>
                      )}
                      {(recordings || []).map((r: any) => (
                        <div key={r._id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <input
                              defaultValue={r.title || "Untitled recording"}
                              onBlur={async (e) => {
                                const title = e.target.value.trim() || "Untitled recording";
                                try {
                                  const res = await fetch('/api/recordings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r._id, title }) });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data?.error || 'Rename failed');
                                  }
                                  toast.success('Title updated');
                                } catch (err: any) {
                                  toast.error(err?.message || 'Rename failed');
                                }
                              }}
                              className="flex-1 px-2 py-1 border rounded-md text-sm"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/recordings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r._id }) });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data?.error || 'Delete failed');
                                  }
                                  setRecordings(prev => prev.filter(x => x._id !== r._id));
                                  toast.success('Deleted');
                                } catch (err: any) {
                                  toast.error(err?.message || 'Delete failed');
                                }
                              }}
                              className="px-3 py-1.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <span>With: {friendNames[r.otherUserId] || r.otherUserId || 'Unknown'}</span>
                            <span>Date: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</span>
                            {r.url && (
                              <Link href={r.url} target="_blank" className="text-blue-600 hover:underline">Open recording</Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Stats */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Profile Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Connections</span>
                    <span className="text-blue-600 font-semibold">
                      {user.connections?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      Skills Teaching
                    </span>
                    <span className="text-green-600 font-semibold">
                      {user.skillsTeaching?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      Skills Learning
                    </span>
                    <span className="text-purple-600 font-semibold">
                      {user.skillsLearning?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Total Reviews</span>
                    <span className="text-orange-600 font-semibold">
                      {user.totalReviews || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      Profile Rating
                    </span>
                    <span className="text-yellow-600 font-semibold">
                      {user.rating || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Availability
                </h3>
                <div className="space-y-2">
                  {(user.availability || []).map(
                    (time: string, index: number) => (
                      <div key={index} className="flex items-center">
                        <i className="fas fa-clock text-green-500 mr-2"></i>
                        <span className="text-gray-700 text-sm sm:text-base">
                          {time}
                        </span>
                      </div>
                    )
                  )}
                  {(!user.availability || user.availability.length === 0) && (
                    <p className="text-gray-500 text-sm">Not specified</p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <i className="fas fa-envelope text-gray-400 mr-3"></i>
                    <span className="text-gray-700 text-sm sm:text-base break-all">
                      {user.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {currentUser?.id !== user.clerkId && statusLoaded && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {connectionStatus === "connected" ? (
                      <Link
                        href={`/messages/${user.clerkId}`}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors text-center block"
                      >
                        <i className="fas fa-comment-dots mr-2"></i>
                        Message
                      </Link>
                    ) : (
                      <button
                        onClick={handleConnection}
                        disabled={connLoading}
                        className={`w-full px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${connectionStatus === "request_sent"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-600 hover:bg-yellow-200"
                          : connectionStatus === "request_received"
                          ? "bg-green-100 text-green-800 border border-green-600 hover:bg-green-200"
                          : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                        }`}
                      >
                        {connectionStatus === "request_sent"
                          ? (connLoading ? "Withdrawing..." : "Withdraw Request")
                          : connectionStatus === "request_received"
                          ? (connLoading ? "Accepting..." : "Accept Request")
                          : (connLoading ? "Connecting..." : "Connect")}
                      </button>
                    )}
                    <button className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors">
                      <i className="fas fa-star mr-2"></i>
                      Rate & Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
};

export default ProfilePage;
