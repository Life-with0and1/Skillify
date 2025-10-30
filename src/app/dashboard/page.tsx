"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUser, updateUser, addSkill, removeSkill } from "@/lib/api";

const DashboardPage = () => {
  // Clerk user for authentication only
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  // Database user for all display data
  interface User {
  id: string;
  skillsTeaching: Array<{ skill: string }>;
  skillsLearning: Array<{ skill: string }>;
  avatar?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  joinedAt?: string | Date;
  rating?: number;
  totalReviews?: number;
  [key: string]: any; // For any additional properties that might exist
}

// ... other code ...

  const [dbUser, setDbUser] = useState<User | null>(null);
  const [skills, setSkills] = useState({
    teaching: [] as Array<{ skill: string }>,
    learning: [] as Array<{ skill: string }>,
  });
  const [newTeachingSkill, setNewTeachingSkill] = useState("");
  const [newLearningSkill, setNewLearningSkill] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Recordings state for Previous meetings
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [recBefore, setRecBefore] = useState<string | null>(null);
  const [recHasMore, setRecHasMore] = useState(false);
  const [recNextCursor, setRecNextCursor] = useState<string | null>(null);
  const [friendNames, setFriendNames] = useState<Record<string, string>>({});
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  // Tabs state
  const [activeTab, setActiveTab] = useState<'posts' | 'meetings'>('posts');
  const searchParams = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (deleteTarget) {
      console.log('[Dashboard] deleteTarget set:', deleteTarget);
    }
  }, [deleteTarget]);

  // My Posts state (UI-only, fetch via existing posts API)
  type MyPost = {
    id: string;
    userId?: string;
    text: string;
    images?: string[];
    tags?: string[];
    likes: number;
    liked: boolean;
    comments: Array<{ id: string; author: string; authorId?: string; authorAvatar?: string; text: string; replies?: Array<{ id: string; author: string; authorId?: string; authorAvatar?: string; text: string }>; isReplying?: boolean; replyDraft?: string }>;
    draft?: string;
    showComments?: boolean;
    commentsLoaded?: boolean;
    isCommenting?: boolean;
    createdAt?: string;
    isLiking?: boolean;
    isCommentsLoading?: boolean;
  };
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [mpLoading, setMpLoading] = useState(false);

  // Normalize for case/diacritic-insensitive compare
  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Sync user and load data when component mounts
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }

    if (isLoaded && isSignedIn && user?.id) {
      syncAndLoadUser();
    }
  }, [isSignedIn, isLoaded, router, user?.id]);

  // Function to sync user with database and load data
  const syncAndLoadUser = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // First, sync the user with database (create/update)
      const syncResponse = await fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!syncResponse.ok) {
        throw new Error("Failed to sync user");
      }

      // Then, get the updated user data
      const userData = await getUser(user.id);

      console.log("=== DASHBOARD DEBUG ===");
      console.log("Full userData response:", userData);
      console.log("userData.user:", userData.user);

      if (userData.user) {
        console.log("Setting dbUser with data:", {
          firstName: userData.user.firstName,
          lastName: userData.user.lastName,
          fullName: userData.user.fullName,
          avatar: userData.user.avatar,
          bio: userData.user.bio,
          location: userData.user.location,
          email: userData.user.email,
          skillsTeaching: userData.user.skillsTeaching,
          skillsLearning: userData.user.skillsLearning,
        });

        console.log("Profile completion calculation inputs:", {
          hasFirstName: !!userData.user.firstName,
          hasLastName: !!userData.user.lastName,
          hasAvatar: !!userData.user.avatar,
          hasBio: !!userData.user.bio,
          hasLocation: !!userData.user.location,
          locationValue: userData.user.location,
          teachingSkillsCount: userData.user.skillsTeaching?.length || 0,
          learningSkillsCount: userData.user.skillsLearning?.length || 0,
        });

        setDbUser(userData.user);
        setBio(userData.user.bio || "");
        setFullName(userData.user.fullName || "");
        setLocation(userData.user.location || "");
        setSkills({
          teaching: userData.user.skillsTeaching || [],
          learning: userData.user.skillsLearning || [],
        });
      } else {
        console.log("No user data found in response!");
        console.log("userData.error:", userData.error);
      }
    } catch (error) {
      console.error("Error syncing user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBioSave = async () => {
    if (!user?.id) return;

    try {
      const response = await updateUser(user.id, { bio });
      if (response.user) {
        setDbUser(response.user);
        setIsEditingBio(false);
      } else if (response.error) {
        console.error("Error updating bio:", response.error);
        alert("Failed to update bio. Please try again.");
      }
    } catch (error) {
      console.error("Error updating bio:", error);
      alert("Failed to update bio. Please try again.");
    }
  };

  const handleNameSave = async () => {
    if (!user?.id) return;

    try {
      // Update database with fullName
      const response = await updateUser(user.id, {
        fullName: fullName.trim(),
      });

      if (response.user) {
        setDbUser(response.user);
        setIsEditingName(false);
        // Resync to get updated data
        await syncAndLoadUser();
      } else if (response.error) {
        console.error("Error updating name:", response.error);
        alert("Failed to update name. Please try again.");
      }
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Failed to update name. Please try again.");
    }
  };

  const handleLocationSave = async () => {
    if (!user?.id) return;

    try {
      const response = await updateUser(user.id, { location });
      if (response.user) {
        setDbUser(response.user);
        setIsEditingLocation(false);
      } else if (response.error) {
        console.error("Error updating location:", response.error);
        alert("Failed to update location. Please try again.");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      alert("Failed to update location. Please try again.");
    }
  };

  const addSkillToDatabase = async (skillType: "teaching" | "learning") => {
    const skillText =
      skillType === "teaching"
        ? newTeachingSkill.trim()
        : newLearningSkill.trim();

    if (!user?.id || !skillText) return;

    try {
      console.log("Adding skill:", { skillText, skillType });
      const response = await addSkill(user.id, skillText, skillType);

      console.log("Add skill response:", response);

      if (response.user) {
        setSkills({
          teaching: response.user.skillsTeaching || [],
          learning: response.user.skillsLearning || [],
        });

        // Clear the appropriate input
        if (skillType === "teaching") {
          setNewTeachingSkill("");
        } else {
          setNewLearningSkill("");
        }

        // Also update dbUser to reflect changes immediately
        setDbUser((prev) =>
          prev && response?.user
            ? {
                ...prev,
                skillsTeaching: response.user.skillsTeaching || [],
                skillsLearning: response.user.skillsLearning || [],
              }
            : prev
        );
      } else if (response.error) {
        console.error("Error adding skill:", response.error);
        alert("Failed to add skill: " + response.error);
      }
    } catch (error) {
      console.error("Error adding skill:", error);
      alert("Failed to add skill. Please try again.");
    }
  };

  const removeSkillFromDatabase = async (
    skillToRemove: string,
    type: "teaching" | "learning"
  ) => {
    if (!user?.id) return;

    try {
      const response = await removeSkill(user.id, skillToRemove, type);

      if (response.user) {
        setSkills({
          teaching: response.user.skillsTeaching || [],
          learning: response.user.skillsLearning || [],
        });
      } else if (response.error) {
        console.error("Error removing skill:", response.error);
        alert("Failed to remove skill. Please try again.");
      }
    } catch (error) {
      console.error("Error removing skill:", error);
      alert("Failed to remove skill. Please try again.");
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && user?.id) {
      try {
        console.log("Starting image upload...");

        // Update user image via Clerk
        const result = await user?.setProfileImage({ file });
        console.log("Clerk image upload result:", result);

        // Wait a moment for Clerk to process
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Reload user from Clerk to get new image URL
        await user?.reload();

        // Update database with new avatar URL
        if (user?.imageUrl) {
          await updateUser(user.id, { avatar: user.imageUrl });
        }

        // Resync with database to update avatar in DB
        await syncAndLoadUser();

        setShowImageUpload(false);
        alert("Profile photo updated successfully!");
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image. Please try again.");
      }
    }
  };
  // Load recordings
  // - When searchTerm is empty: fetch first 5 and allow Load More by cursor
  // - When searching: fetch multiple pages (up to 100 items) so filtering can match deeper history
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        if (!user?.id) return;
        setRecLoading(true);
        setRecError(null);

        if (!searchTerm) {
          const qs = new URLSearchParams();
          if (recBefore) qs.set("before", recBefore);
          qs.set("limit", "5");
          const res = await fetch(`/api/recordings?${qs.toString()}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Failed to load recordings");
          const list = Array.isArray(data.recordings) ? data.recordings : [];
          if (recBefore) setRecordings((prev) => [...prev, ...list]);
          else setRecordings(list);
          setRecHasMore(!!data?.hasMore);
          setRecNextCursor(data?.nextCursor || null);
          return;
        }

        // Searching: collect up to 100 items so we can filter reliably
        let all: any[] = [];
        let cursor: string | null = null;
        let pages = 0;
        while (pages < 10) { // 10 * 10 = 100 items if limit=10
          const qs = new URLSearchParams();
          if (cursor) qs.set("before", cursor);
          qs.set("limit", "10");
          const res = await fetch(`/api/recordings?${qs.toString()}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Failed to load recordings");
          const list = Array.isArray(data.recordings) ? data.recordings : [];
          all = all.concat(list);
          if (!data?.hasMore || !data?.nextCursor) break;
          cursor = data.nextCursor;
          pages += 1;
        }
        setRecordings(all);
        setRecHasMore(false); // disable Load More during search
        setRecNextCursor(null);
      } catch (e: any) {
        setRecError(e?.message || "Failed to load recordings");
      } finally {
        setRecLoading(false);
      }
    };
    loadRecordings();
  }, [user?.id, recBefore, searchTerm]);

  // Resolve names for otherUserId (avoid showing raw Clerk IDs)
  useEffect(() => {
    const resolveNames = async () => {
      try {
        const unique = Array.from(new Set((recordings || []).map((r: any) => r.otherUserId).filter(Boolean)));
        const missing = unique.filter((u) => !friendNames[u!]);
        if (missing.length === 0) return;
        const entries: [string, string][] = [];
        for (const uid of missing) {
          try {
            const res = await getUser(uid as string);
            const nm = (res as any)?.user?.fullName || (res as any)?.user?.firstName || "";
            entries.push([uid as string, String(nm)]);
          } catch {
            // Keep empty so UI shows placeholder and filters don't hide it
            entries.push([uid as string, ""]);
          }
        }
        setFriendNames((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch {}
    };
    if ((recordings || []).length) resolveNames();
  }, [recordings, friendNames]);
  
  // Debounced live combined search (title or friend name)
  useEffect(() => {
    const t = setTimeout(() => {
      const v = searchInput.trim();
      setSearchTerm(v);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // When search is cleared, reset to initial (top 5) by clearing cursor and data
  useEffect(() => {
    if (searchTerm === "") {
      setRecBefore(null);
      setRecordings([]);
      setRecNextCursor(null);
    }
  }, [searchTerm]);

  // Load My Posts (standalone effect)
  useEffect(() => {
    const loadMine = async () => {
      try {
        if (!user?.id) return;
        setMpLoading(true);
        const res = await fetch('/api/posts?limit=50&includeSelf=1');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load posts');
        const list = Array.isArray(data.posts) ? data.posts : [];
        const mine = list.filter((p: any) => p.userId === user.id);
        const mapped = mine.map((p: any) => ({
          id: String(p._id),
          userId: p.userId,
          text: p.text || '',
          images: Array.isArray(p.images) ? p.images : [],
          tags: Array.isArray(p.tags) ? p.tags : [],
          likes: Number(p.likes || 0),
          liked: Array.isArray(p.likedBy) ? p.likedBy.includes(user.id) : false,
          comments: [],
          createdAt: p.createdAt,
        }));
        setMyPosts(mapped.sort((a: any, b: any) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())));
      } catch {
        setMyPosts([]);
      } finally {
        setMpLoading(false);
      }
    };
    loadMine();
  }, [user?.id]);

  // Open a specific post from notifications: /dashboard?openPost=<postId>
  useEffect(() => {
    const pid = searchParams?.get('openPost');
    if (!pid) return;
    // ensure we're on posts tab
    setActiveTab('posts');
    // try immediately, and also after myPosts updates
    const tryOpen = () => {
      const found = myPosts.find(p => p.id === pid);
      if (found) {
        setMyPosts(prev => prev.map(x => x.id === pid ? { ...x, showComments: true } : x));
      }
    };
    tryOpen();
  }, [searchParams, myPosts]);

  const loadCommentsForPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments`);
      const data = await res.json();
      if (res.ok) {
        const mapComment = (c: any): any => ({ id: String(c._id), author: c.userName, authorId: c.userId, authorAvatar: c.userAvatar, text: c.text, replies: Array.isArray(c.replies) ? c.replies.map(mapComment) : [] });
        const loaded = Array.isArray(data.comments)
          ? data.comments.map(mapComment)
          : [];
        setMyPosts(prev => prev.map(x => x.id === postId ? { ...x, comments: loaded, commentsLoaded: true } : x));
      }
    } catch {}
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {dbUser?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dbUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-gray-600">{(dbUser?.fullName || 'U').charAt(0)}</span>
                )}
              </div>
              <button
                onClick={() => setShowImageUpload(true)}
                className="absolute -bottom-2 -right-2 bg-white border border-gray-200 shadow-md rounded-full p-2 hover:bg-gray-50"
                title="Change photo"
              >
                <i className="fas fa-camera text-gray-700"></i>
              </button>
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Your full name"
                        />
                        <button onClick={handleNameSave} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Save</button>
                        <button onClick={() => setIsEditingName(false)} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{dbUser?.fullName || 'Your Name'}</span>
                        <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-gray-700" title="Edit name">
                          <i className="fas fa-pen"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-gray-500"></i>
                    {isEditingLocation ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="px-3 py-1.5 border rounded-lg text-sm"
                          placeholder="Your location"
                        />
                        <button onClick={handleLocationSave} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">Save</button>
                        <button onClick={() => setIsEditingLocation(false)} className="px-3 py-1.5 rounded border text-xs hover:bg-gray-50">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setIsEditingLocation(true)} className="hover:underline">
                        {dbUser?.location || 'Add location'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="sm:self-start w-full sm:w-auto">
                  <SignOutButton>
                    <button className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
                      <i className="fas fa-sign-out-alt mr-2"></i>
                      Logout
                    </button>
                  </SignOutButton>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Bio</span>
                  <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-blue-600 hover:text-blue-700 text-sm" title="Edit bio">
                    <i className={`fas fa-${isEditingBio ? 'times' : 'edit'}`}></i>
                  </button>
                </div>
                {isEditingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button onClick={handleBioSave} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm font-medium">Save</button>
                      <button onClick={() => setIsEditingBio(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-xl">
                    {bio || 'No bio added yet. Click edit to add one!'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-6 lg:col-start-3 lg:row-start-1">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">
                    Profile Completion
                  </span>
                  <span className="text-blue-600 font-semibold">
                    {(() => {
                      if (!dbUser) return "0%";
                      const nameScore =
                        dbUser.fullName || dbUser.firstName || dbUser.lastName
                          ? 25
                          : 0;
                      const avatarScore = dbUser.avatar ? 20 : 0;
                      const bioScore = dbUser.bio ? 20 : 0;
                      const locationScore = dbUser.location ? 15 : 0;
                      const teachingScore =
                        dbUser.skillsTeaching?.length > 0 ? 10 : 0;
                      const learningScore =
                        dbUser.skillsLearning?.length > 0 ? 10 : 0;
                      const total =
                        nameScore +
                        avatarScore +
                        bioScore +
                        locationScore +
                        teachingScore +
                        learningScore;
                      console.log("Profile Completion Debug:", {
                        name: nameScore,
                        avatar: avatarScore,
                        bio: bioScore,
                        location: locationScore,
                        teaching: teachingScore,
                        learning: learningScore,
                        total,
                      });
                      return Math.round(total) + "%";
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        dbUser
                          ? Math.round(
                              (dbUser.fullName ||
                              dbUser.firstName ||
                              dbUser.lastName
                                ? 25
                                : 0) +
                                (dbUser.avatar ? 20 : 0) +
                                (dbUser.bio ? 20 : 0) +
                                (dbUser.location ? 15 : 0) +
                                (dbUser.skillsTeaching?.length > 0 ? 10 : 0) +
                                (dbUser.skillsLearning?.length > 0 ? 10 : 0)
                            )
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Member Since</span>
                  <span className="text-green-600 font-semibold">
                    {dbUser?.joinedAt
                      ? new Date(dbUser.joinedAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Skill Rating</span>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">
                      {"★".repeat(Math.floor(dbUser?.rating || 0))}
                      {"☆".repeat(5 - Math.floor(dbUser?.rating || 0))}
                    </span>
                    <span className="text-gray-600 text-sm">
                      {(dbUser?.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Total Reviews</span>
                  <span className="text-purple-600 font-semibold">
                    {dbUser?.totalReviews || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-6">
            {/* Skills Management */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  My Skills
                </h2>
                <button
                  onClick={() => setIsEditingSkills(!isEditingSkills)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <i className="fas fa-edit mr-2"></i>
                  {isEditingSkills ? "Done" : "Manage Skills"}
                </button>
              </div>

              {/* Skills I'm Teaching */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <i className="fas fa-chalkboard-teacher text-blue-500 mr-2"></i>
                  Teaching ({skills.teaching.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.teaching.map((skillObj, index) => (
                    <div key={index} className="group relative">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {skillObj.skill}
                        {isEditingSkills && (
                          <button
                            onClick={() =>
                              removeSkillFromDatabase(
                                skillObj.skill,
                                "teaching"
                              )
                            }
                            className="ml-2 text-blue-600 hover:text-red-600 transition-colors"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                      </span>
                    </div>
                  ))}

                  {isEditingSkills && (
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        value={newTeachingSkill}
                        onChange={(e) => setNewTeachingSkill(e.target.value)}
                        placeholder="Add teaching skill"
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) =>
                          e.key === "Enter" && addSkillToDatabase("teaching")
                        }
                      />
                      <button
                        onClick={() => addSkillToDatabase("teaching")}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills I'm Learning */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <i className="fas fa-graduation-cap text-green-500 mr-2"></i>
                  Learning ({skills.learning.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.learning.map((skillObj, index) => (
                    <div key={index} className="group relative">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        {skillObj.skill}
                        {isEditingSkills && (
                          <button
                            onClick={() =>
                              removeSkillFromDatabase(
                                skillObj.skill,
                                "learning"
                              )
                            }
                            className="ml-2 text-green-600 hover:text-red-600 transition-colors"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                      </span>
                    </div>
                  ))}

                  {isEditingSkills && (
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        value={newLearningSkill}
                        onChange={(e) => setNewLearningSkill(e.target.value)}
                        placeholder="Add learning goal"
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        onKeyPress={(e) =>
                          e.key === "Enter" && addSkillToDatabase("learning")
                        }
                      />
                      <button
                        onClick={() => addSkillToDatabase("learning")}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* My Posts & Previous meetings (Tabs) */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-3 py-1.5 rounded-full text-sm border ${activeTab==='posts' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
              >
                My Posts
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`px-3 py-1.5 rounded-full text-sm border ${activeTab==='meetings' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
              >
                Previous Meetings
              </button>
            </div>

            {activeTab === 'posts' && (
              <div className="space-y-4">
                {mpLoading ? (
                  <div className="text-sm text-gray-500">Loading your posts...</div>
                ) : (
                  !myPosts.length && (
                    <div className="text-sm text-gray-500">No posts yet.</div>
                  )
                )}
                <div className="space-y-5">
                  {myPosts.map((p) => (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header similar to home feed */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          {dbUser?.avatar ? (
                            <img src={dbUser.avatar} alt="me" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-gray-600">{(dbUser?.fullName || 'U').charAt(0)}</span>
                          )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{dbUser?.fullName || 'You'}</div>
                            <div className="text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('[Dashboard] Delete icon clicked for post:', p.id);
                              setDeleteTarget(p.id);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                            aria-label="Delete post"
                            title="Delete post"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>

                        {/* Body */}
                        <div className="mt-3 text-gray-800 whitespace-pre-wrap">{p.text}</div>
                        {Array.isArray(p.images) && p.images.length > 0 && (
                          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {p.images.map((src, idx) => (
                                <img key={idx} src={src} alt="post-image" className="w-full h-36 object-cover rounded-lg ring-1 ring-gray-200" />
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(p.tags) && p.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {p.tags.map(t => (
                              <span key={t} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs border border-blue-200">{t}</span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-3 text-sm">
                          <button
                            onClick={async () => {
                              const targetId = p.id;
                              const current = myPosts.find(x => x.id === targetId);
                              const likedNow = !current?.liked;
                              // optimistic with loading
                              setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, isLiking: true, liked: likedNow, likes: likedNow ? x.likes + 1 : Math.max(0, x.likes - 1) } : x));
                              try {
                                const method = likedNow ? 'POST' : 'DELETE';
                                const res = await fetch(`/api/posts/${encodeURIComponent(targetId)}/like`, { method });
                                if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
                              } catch {
                                // revert on error
                                setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, liked: !likedNow, likes: !likedNow ? x.likes + 1 : Math.max(0, x.likes - 1) } : x));
                              } finally {
                                setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, isLiking: false } : x));
                              }
                            }}
                            disabled={!!p.isLiking}
                            className={`px-3 py-1.5 rounded border ${p.isLiking ? 'opacity-70 cursor-not-allowed' : ''} ${p.liked ? 'bg-red-50 text-red-600 border-red-200' : 'hover:bg-gray-50'}`}
                          >
                            {p.isLiking ? '...' : (<>
                              <i className={`mr-1 ${p.liked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
                              {p.likes}
                            </>)}
                          </button>
                          <button
                            onClick={() => {
                              const targetId = p.id;
                              const current = myPosts.find(x => x.id === targetId);
                              const opening = !current?.showComments;
                              setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, showComments: !x.showComments } : x));
                              if (opening && !current?.commentsLoaded) {
                                setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, isCommentsLoading: true } : x));
                                loadCommentsForPost(targetId).finally(() => {
                                  setMyPosts(prev => prev.map(x => x.id === targetId ? { ...x, isCommentsLoading: false } : x));
                                });
                              }
                            }}
                            className="px-3 py-1.5 rounded border hover:bg-gray-50"
                          >
                            {p.showComments ? 'Hide comments' : (p.isCommentsLoading ? 'Loading comments...' : (p.commentsLoaded ? `View comments (${p.comments.length + p.comments.reduce((s,c)=> s + (c.replies?.length||0),0)})` : 'View comments'))}
                          </button>
                        </div>
                        {p.showComments && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <input
                                value={p.draft || ''}
                                onChange={(e) => setMyPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: e.target.value } : x))}
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-2 border rounded-md text-sm"
                              />
                              <button
                                disabled={!!p.isCommenting || !(myPosts.find(x => x.id === p.id)?.draft || '').trim()}
                                onClick={async () => {
                                  const text = (myPosts.find(x => x.id === p.id)?.draft || '').trim();
                                  if (!text) return;
                                  try {
                                    setMyPosts(prev => prev.map(x => x.id === p.id ? { ...x, isCommenting: true } : x));
                                    const res = await fetch(`/api/posts/${encodeURIComponent(p.id)}/comments`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ text }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data?.error || 'Failed to comment');
                                    setMyPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: '', comments: [...x.comments, { id: String(data._id), author: data.userName, text: data.text }], commentsLoaded: true } : x));
                                  } catch (e) {
                                    // fallback
                                    setMyPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: '', comments: [...x.comments, { id: `c_${Date.now()}`, author: 'You', text }], commentsLoaded: true } : x));
                                  } finally {
                                    setMyPosts(prev => prev.map(x => x.id === p.id ? { ...x, isCommenting: false } : x));
                                  }
                                }}
                                className={`px-3 py-2 text-white rounded-md text-sm ${p.isCommenting || !(myPosts.find(x => x.id === p.id)?.draft || '').trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                {p.isCommenting ? 'Replying...' : 'Reply'}
                              </button>
                            </div>
                            {p.comments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {p.comments.map(c => {
                                  const isOP = !!(c.authorId && user?.id && c.authorId === user.id);
                                  return (
                                    <div key={c.id} className="flex items-start gap-2">
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                        {c.authorAvatar ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={c.authorAvatar} alt={c.author} className="w-full h-full object-cover" />
                                        ) : (
                                          c.author.charAt(0)
                                        )}
                                      </div>
                                      <div className={`${isOP ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'} border px-3 py-2 rounded-lg text-sm`}>
                                        <div className="font-medium text-gray-800 flex items-center gap-2">
                                          {c.authorId ? (
                                            <Link href={c.authorId === user?.id ? '/dashboard' : `/profile/${c.authorId}`} className="hover:underline text-blue-700">
                                              {c.author}
                                            </Link>
                                          ) : (
                                            c.author
                                          )}
                                          {/* OP badge removed as requested */}
                                        </div>
                                        <div className="text-gray-700">{c.text}</div>
                                        <div className="mt-2 flex items-center gap-3 text-xs">
                                          <button
                                            onClick={() => setMyPosts(prev => prev.map(px => px.id === p.id ? { ...px, comments: px.comments.map(cc => cc.id === c.id ? { ...cc, isReplying: !cc.isReplying } : cc) } : px))}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
                                          >
                                            <i className="fas fa-reply"></i> Reply
                                          </button>
                                        </div>
                                        {c.isReplying && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <input
                                              value={c.replyDraft || ''}
                                              onChange={(e) => setMyPosts(prev => prev.map(px => px.id === p.id ? { ...px, comments: px.comments.map(cc => cc.id === c.id ? { ...cc, replyDraft: e.target.value } : cc) } : px))}
                                              placeholder="Write a reply..."
                                              className="flex-1 px-3 py-2 border rounded-md text-sm"
                                            />
                                            <button
                                              onClick={async () => {
                                                const t = (c.replyDraft || '').trim();
                                                if (!t) return;
                                                const tempId = `r_${Date.now()}`;
                                                setMyPosts(prev => prev.map(px => px.id === p.id ? {
                                                  ...px,
                                                  comments: px.comments.map(cc => cc.id === c.id ? {
                                                    ...cc,
                                                    replies: [...(cc.replies || []), { id: tempId, author: 'You', authorId: user?.id, authorAvatar: user?.imageUrl, text: t }],
                                                    replyDraft: '',
                                                    isReplying: false,
                                                  } : cc)
                                                } : px));
                                                try {
                                                  const res = await fetch(`/api/posts/${encodeURIComponent(p.id)}/comments`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ text: t, parentId: c.id }),
                                                  });
                                                  const data = await res.json();
                                                  if (res.ok) {
                                                    setMyPosts(prev => prev.map(px => px.id === p.id ? {
                                                      ...px,
                                                      comments: px.comments.map(cc => cc.id === c.id ? {
                                                        ...cc,
                                                        replies: (cc.replies || []).map(rc => rc.id === tempId ? { id: String(data._id), author: data.userName, authorId: data.userId, authorAvatar: data.userAvatar, text: data.text } : rc)
                                                      } : cc)
                                                    } : px));
                                                  }
                                                } catch {}
                                              }}
                                              className="px-3 py-2 text-white rounded-md text-sm bg-blue-600 hover:bg-blue-700"
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        )}
                                        {Array.isArray(c.replies) && c.replies.length > 0 && (
                                          <div className="mt-3 ml-10 pl-3 border-l border-gray-200 space-y-2">
                                            {c.replies.map(rc => (
                                              <div key={rc.id} className="flex items-start gap-2">
                                                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                                  {rc.authorAvatar ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={rc.authorAvatar} alt={rc.author} className="w-full h-full object-cover" />
                                                  ) : (
                                                    rc.author.charAt(0)
                                                  )}
                                                </div>
                                                <div className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs">
                                                  <div className="font-medium text-gray-800">
                                                    {rc.authorId ? (
                                                      <Link href={rc.authorId === user?.id ? '/dashboard' : `/profile/${rc.authorId}`} className="hover:underline text-blue-700">
                                                        {rc.author}
                                                      </Link>
                                                    ) : rc.author}
                                                  </div>
                                                  <div className="text-gray-700">{rc.text}</div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'meetings' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by recording name or friend name"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  {recLoading && (
                    <div className="text-sm text-gray-500">Loading recordings...</div>
                  )}
                  {recError && (
                    <div className="text-sm text-red-600">{recError}</div>
                  )}
                  {!recLoading && !recError && (
                    <div className="space-y-3">
                      {(recordings || []).filter((r: any) => {
                        if (!searchTerm) return true;
                        const q = norm(searchTerm);
                        const title = norm(r.title || "");
                        const nm = norm(friendNames[r.otherUserId] || "");
                        if (!nm && r.otherUserId) return title.includes(q);
                        return title.includes(q) || nm.includes(q);
                      }).length === 0 && !recLoading && (
                        <div className="text-gray-500 text-sm">No recordings found</div>
                      )}
                      {(recordings || []).filter((r: any) => {
                        if (!searchTerm) return true;
                        const q = norm(searchTerm);
                        const title = norm(r.title || "");
                        const nm = norm(friendNames[r.otherUserId] || "");
                        if (!nm && r.otherUserId) return title.includes(q);
                        return title.includes(q) || nm.includes(q);
                      }).map((r: any) => (
                        <div key={r._id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="relative flex-1">
                              {editingId === r._id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    className="w-full px-2 py-1 border rounded-md text-sm"
                                  />
                                  <button
                                    onClick={async () => {
                                      const title = (editingTitle || "").trim() || "Untitled recording";
                                      try {
                                        const res = await fetch('/api/recordings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r._id, title }) });
                                        if (!res.ok) {
                                          const data = await res.json().catch(() => ({}));
                                          throw new Error(data?.error || 'Rename failed');
                                        }
                                        setRecordings(prev => prev.map(x => x._id === r._id ? { ...x, title } : x));
                                        setEditingId(null);
                                      } catch {}
                                    }}
                                    className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{r.title || 'Untitled recording'}</span>
                                  <button
                                    onClick={() => { setEditingId(r._id); setEditingTitle(r.title || ''); }}
                                    className="text-gray-500 hover:text-gray-700 cursor-pointer"
                                    title="Edit title"
                                  >
                                    <i className="fas fa-pen"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/recordings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r._id }) });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data?.error || 'Delete failed');
                                  }
                                  setRecordings(prev => prev.filter(x => x._id !== r._id));
                                } catch (err) {}
                              }}
                              className="px-3 py-1.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              With: {r.otherUserId && friendNames[r.otherUserId] ? (
                                <Link href={`/profile/${r.otherUserId}`} className="text-blue-600 hover:underline">
                                  {friendNames[r.otherUserId]}
                                </Link>
                              ) : (
                                'Fetching...'
                              )}
                            </span>
                            <span>Date: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</span>
                            {r.url ? (
                              <Link href={r.url} target="_blank" className="text-blue-600 hover:underline">Open recording</Link>
                            ) : (
                              <button disabled className="text-gray-400 cursor-not-allowed">Open recording</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    {recHasMore && (
                      <button
                        onClick={() => {
                          if (recNextCursor) setRecBefore(recNextCursor);
                        }}
                        className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                      >
                        Load More
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {deleteTarget && (
          <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-4">
              <div className="font-semibold mb-2">Delete post</div>
              <p className="text-sm text-gray-600 mb-4">Are you sure you want to permanently delete this post and its comments?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    console.log('[Dashboard] Delete canceled');
                    setDeleteTarget(null);
                  }}
                  className="px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deleteTarget) return;
                    console.log('[Dashboard] Confirm delete for:', deleteTarget);
                    setIsDeleting(true);
                    try {
                      const res = await fetch(`/api/posts/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({} as any));
                        throw new Error(data?.error || 'Failed');
                      }
                      setMyPosts(prev => prev.filter(x => x.id !== deleteTarget));
                      setDeleteTarget(null);
                    } catch (e) {
                      console.error('[Dashboard] Delete failed:', e);
                      alert((e as any)?.message || 'Failed to delete');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className={`px-3 py-2 rounded bg-red-600 text-white text-sm ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        {showImageUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Update Profile Photo
              </h3>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-3 border border-gray-300 rounded-xl mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   
  );
};

export default DashboardPage;
