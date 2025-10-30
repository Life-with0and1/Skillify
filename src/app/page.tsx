"use client";
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

const HomePage: React.FC = () => {
  const { user } = useUser();
  type PostItem = {
    id: string;
    user: { id?: string; name: string; avatar: string };
    text: string;
    images?: string[];
    likes: number;
    liked: boolean;
    comments: Array<{ id: string; author: string; authorId?: string; authorAvatar?: string; text: string; replies?: Array<{ id: string; author: string; authorId?: string; authorAvatar?: string; text: string }>; isReplying?: boolean; replyDraft?: string }>;
    draft?: string;
    tags?: string[];
    showComments?: boolean;
    commentsLoaded?: boolean;
    isCommenting?: boolean;
    isLiking?: boolean;
    isCommentsLoading?: boolean;
    createdAt?: string;
  };
  const [posts, setPosts] = useState<Array<PostItem>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  // Load initial posts
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/posts?limit=10');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load posts');
        const meId = user?.id;
        const mapped: PostItem[] = (data.posts || []).map((p: any) => ({
          id: String(p._id),
          user: { id: p.userId, name: p.userName || 'Unknown', avatar: p.userAvatar || '/default-avatar.png' },
          text: p.text || '',
          images: Array.isArray(p.images) ? p.images : [],
          likes: Number(p.likes || 0),
          liked: Array.isArray(p.likedBy) && meId ? p.likedBy.includes(meId) : false,
          comments: [],
          tags: Array.isArray(p.tags) ? p.tags : [],
          createdAt: p.createdAt,
        }));
        setPosts(mapped);
        setNextCursor(data.nextCursor || null);
        setHasMore(!!data.hasMore);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load more posts when bottom sentinel comes into view
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!bottomRef.current) return;
    const el = bottomRef.current;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        if (!isLoadingMore && hasMore) {
          (async () => {
            try {
              setIsLoadingMore(true);
              const qs = new URLSearchParams();
              qs.set('limit', '10');
              if (nextCursor) qs.set('cursor', nextCursor);
              const res = await fetch(`/api/posts?${qs.toString()}`);
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || 'Failed to load more');
              const meId = user?.id;
              const mapped: PostItem[] = (data.posts || []).map((p: any) => ({
                id: String(p._id),
                user: { id: p.userId, name: p.userName || 'Unknown', avatar: p.userAvatar || '/default-avatar.png' },
                text: p.text || '',
                images: Array.isArray(p.images) ? p.images : [],
                likes: Number(p.likes || 0),
                liked: Array.isArray(p.likedBy) && meId ? p.likedBy.includes(meId) : false,
                comments: [],
                tags: Array.isArray(p.tags) ? p.tags : [],
                createdAt: p.createdAt,
              }));
              setPosts(prev => [...prev, ...mapped]);
              setNextCursor(data.nextCursor || null);
              setHasMore(!!data.hasMore);
            } catch {
            } finally {
              setIsLoadingMore(false);
            }
          })();
        }
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [bottomRef, nextCursor, hasMore, isLoadingMore, user?.id]);

  const timeAgo = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Math.max(0, Date.now() - d.getTime());
    const m = Math.floor(diff / (1000 * 60));
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dyy = Math.floor(h / 24);
    if (dyy < 7) return `${dyy}d`;
    const w = Math.floor(dyy / 7);
    if (w < 52) return `${w}w`;
    const y = Math.floor(dyy / 365);
    return `${y}y`;
  };

  // Upload images to Cloudinary
  const uploadAll = async (files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    // Get signature (optional, allows signed/secured uploads)
    const sigRes = await fetch('/api/upload/cloudinary-sign', { method: 'POST' });
    const sig = await sigRes.json();
    if (!sigRes.ok) throw new Error(sig?.error || 'Cloudinary sign failed');
    const { cloudName, apiKey, timestamp, signature, uploadPreset } = sig;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const uploads = files.map(async (file) => {
      const form = new FormData();
      if (uploadPreset) form.append('upload_preset', uploadPreset);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('file', file);
      const r = await fetch(endpoint, { method: 'POST', body: form });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error?.message || 'Upload failed');
      return json.secure_url as string;
    });
    return Promise.all(uploads);
  };

  const addComment = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const t = (p.draft || '').trim();
      if (!t) return p;
      const comment = { id: `c_${Date.now()}`, author: 'You', text: t };
      return { ...p, comments: [...p.comments, comment], draft: '' };
    }));
  };
  

  const [draftText, setDraftText] = useState('');
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const onPickImage = () => fileRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(f => new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(imgs => {
      setDraftImages(prev => [...prev, ...imgs]);
      setDraftFiles(prev => [...prev, ...files]);
    });
    // reset input value to allow re-selecting the same file later
    e.target.value = '';
  };

  const availableTags = ['Tech','Python','Git','React','Design','Photography','Spanish','Music','Cooking','Marketing'];
  const toggleTag = (t: string) => {
    setDraftTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const addCustomTag = (t: string) => {
    const v = t.trim();
    if (!v) return;
    setDraftTags(prev => prev.includes(v) ? prev : [...prev, v]);
  };

  // Lightbox state for image preview
  const [lbOpen, setLbOpen] = useState(false);
  const [lbImages, setLbImages] = useState<string[]>([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLightbox = (imgs: string[], idx: number) => { setLbImages(imgs); setLbIndex(idx); setLbOpen(true); };
  const closeLightbox = () => setLbOpen(false);
  const nextImg = () => setLbIndex(i => (i + 1) % (lbImages.length || 1));
  const prevImg = () => setLbIndex(i => (i - 1 + (lbImages.length || 1)) % (lbImages.length || 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Post Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user.fullName || 'You'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-gray-600">U</div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Share something with the community..."
                  className="w-full min-h-[90px] px-3 py-2 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/60 bg-gray-50"
                />
                {draftImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {draftImages.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt={`preview-${idx}`} className="w-full h-32 object-cover rounded-lg border" />
                        <button
                          onClick={() => setDraftImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Tags selector */}
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">Select tags (min 2)</div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(t => (
                      <button
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`px-2 py-1 rounded-full text-xs border ${draftTags.includes(t) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'hover:bg-gray-50'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      placeholder="Add custom tag and press Enter"
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    {draftTags.length < 2 && (
                      <span className="text-xs text-red-600">Select at least 2</span>
                    )}
                  </div>
                  {draftTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {draftTags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs border">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFileChange} className="hidden" />
                  <button onClick={onPickImage} className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
                    <i className="fas fa-image mr-2"></i> Add images
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={async () => {
                      const text = draftText.trim();
                      if (!text || draftTags.length < 2) return;
                      try {
                        setIsPosting(true);
                        const uploaded = await uploadAll(draftFiles);
                        const res = await fetch('/api/posts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ text, images: uploaded, tags: draftTags }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || 'Failed to create post');
                        const newPost: PostItem = {
                          id: String(data._id),
                          user: { name: data.userName, avatar: data.userAvatar },
                          text: data.text,
                          images: Array.isArray(data.images) ? data.images : [],
                          likes: 0,
                          liked: false,
                          comments: [],
                          tags: Array.isArray(data.tags) ? data.tags : [],
                        };
                        setPosts(prev => [newPost, ...prev]);
                        setDraftText('');
                        setDraftImages([]);
                        setDraftFiles([]);
                        setDraftTags([]);
                      } catch (e) {
                        alert((e as any)?.message || 'Failed to post');
                      } finally {
                        setIsPosting(false);
                      }
                    }}
                    disabled={isPosting || !draftText.trim() || draftTags.length < 2}
                    className={`px-4 py-2 rounded-md text-sm text-white ${isPosting || !draftText.trim() || draftTags.length < 2 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isPosting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {lbOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center">
          <button
            aria-label="Close"
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded px-3 py-1"
          >
            Close
          </button>
          <button
            aria-label="Previous"
            onClick={prevImg}
            className="absolute left-4 md:left-8 text-white bg-white/10 hover:bg-white/20 rounded px-3 py-1"
          >
            ‹
          </button>
          <div className="max-w-5xl max-h-[80vh] mx-6">
            <img src={lbImages[lbIndex]} alt={`preview-${lbIndex}`} className="w-auto h-auto max-w-full max-h-[80vh] rounded shadow-2xl" />
            <div className="text-center text-white/80 text-sm mt-2">
              {lbIndex + 1} / {lbImages.length}
            </div>
          </div>
          <button
            aria-label="Next"
            onClick={nextImg}
            className="absolute right-4 md:right-8 text-white bg-white/10 hover:bg-white/20 rounded px-3 py-1"
          >
            ›
          </button>
        </div>
      )}

      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Feed</h2>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
                <div className="text-lg font-medium text-gray-800 mb-1">No posts yet</div>
                <div>Be the first to share something with the community. Add a post above with at least two tags.</div>
              </div>
            ) : (
            posts.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <img src={p.user.avatar} alt={p.user.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      <Link href={p.user.id && p.user.id === user?.id ? '/dashboard' : `/profile/${p.user.id || ''}`} className="hover:underline">
                        {p.user.name}
                      </Link>
                    </div>
                    <div className="text-xs text-gray-500">{timeAgo(p.createdAt)}</div>
                  </div>
                  {p.user.id && user?.id && p.user.id === user.id && (
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                      aria-label="Delete post"
                      title="Delete post"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
                <div className="mt-3 text-gray-800 whitespace-pre-wrap">{p.text}</div>
                {Array.isArray(p.images) && p.images.length > 0 && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {p.images.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => openLightbox(p.images || [], idx)}
                          className="relative overflow-hidden rounded-lg ring-1 ring-gray-200 group focus:outline-none"
                        >
                          <img src={src} alt={`post-${p.id}-${idx}`} className="w-full h-40 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
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
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <button
                    onClick={async () => {
                      try {
                        const idx = posts.findIndex(x => x.id === p.id);
                        if (idx === -1) return;
                        const likedNow = !posts[idx].liked;
                        setPosts(prev => prev.map(x => x.id === p.id ? { ...x, isLiking: true, liked: likedNow, likes: x.likes + (likedNow ? 1 : -1) } : x));
                        const method = likedNow ? 'POST' : 'DELETE';
                        const res = await fetch(`/api/posts/${encodeURIComponent(p.id)}/like`, { method });
                        if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
                      } catch (e) {
                        // revert like state on error
                        setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? 1 : -1) } : x));
                      } finally {
                        setPosts(prev => prev.map(x => x.id === p.id ? { ...x, isLiking: false } : x));
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
                    onClick={async () => {
                      const targetId = p.id;
                      setPosts(prev => prev.map(x => x.id === targetId ? { ...x, showComments: !x.showComments } : x));
                      const current = posts.find(x => x.id === targetId);
                      if (!current?.commentsLoaded) {
                        try {
                          setPosts(prev => prev.map(x => x.id === targetId ? { ...x, isCommentsLoading: true } : x));
                          const res = await fetch(`/api/posts/${encodeURIComponent(targetId)}/comments`);
                          const data = await res.json();
                          if (res.ok) {
                            const mapComment = (c: any): any => ({ id: String(c._id), author: c.userName, authorId: c.userId, authorAvatar: c.userAvatar, text: c.text, replies: Array.isArray(c.replies) ? c.replies.map(mapComment) : [] });
                            const loaded = Array.isArray(data.comments) ? data.comments.map(mapComment) : [];
                            setPosts(prev => prev.map(x => x.id === targetId ? { ...x, comments: loaded, commentsLoaded: true } : x));
                          }
                        } catch {} finally {
                          setPosts(prev => prev.map(x => x.id === targetId ? { ...x, isCommentsLoading: false } : x));
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                  >
                    {p.showComments
                      ? 'Hide comments'
                      : (p.isCommentsLoading
                          ? 'Loading comments...'
                          : (p.commentsLoaded
                              ? `View comments (${p.comments.length + p.comments.reduce((s,c)=> s + (c.replies?.length||0),0)})`
                              : 'View comments'))}
                  </button>
                </div>
                {p.showComments && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={p.draft || ''}
                      onChange={(e) => setPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: e.target.value } : x))}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    <button
                      disabled={!!p.isCommenting || !(posts.find(x => x.id === p.id)?.draft || '').trim()}
                      onClick={async () => {
                        const text = (posts.find(x => x.id === p.id)?.draft || '').trim();
                        if (!text) return;
                        try {
                          setPosts(prev => prev.map(x => x.id === p.id ? { ...x, isCommenting: true } : x));
                          const res = await fetch(`/api/posts/${encodeURIComponent(p.id)}/comments`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || 'Failed to comment');
                          setPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: '', comments: [...x.comments, { id: String(data._id), author: data.userName, authorId: data.userId, authorAvatar: data.userAvatar, text: data.text, replies: [] }], commentsLoaded: true } : x));
                        } catch (e) {
                          setPosts(prev => prev.map(x => x.id === p.id ? { ...x, draft: '', comments: [...x.comments, { id: `c_${Date.now()}`, author: 'You', authorId: user?.id, authorAvatar: user?.imageUrl, text, replies: [] }], commentsLoaded: true } : x));
                        } finally {
                          setPosts(prev => prev.map(x => x.id === p.id ? { ...x, isCommenting: false } : x));
                        }
                      }}
                      className={`px-3 py-2 text-white rounded-md text-sm ${p.isCommenting || !(posts.find(x => x.id === p.id)?.draft || '').trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {p.isCommenting ? 'Commenting...' : 'Comment'}
                    </button>
                  </div>
                  {p.comments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {p.comments.map(c => {
                        const isOP = !!(c.authorId && p.user.id && c.authorId === p.user.id);
                        return (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                              {c.authorAvatar ? (
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
                              </div>
                              <div className="text-gray-700">{c.text}</div>
                              <div className="mt-2 flex items-center gap-3 text-xs">
                                <button
                                  onClick={() => setPosts(prev => prev.map(px => px.id === p.id ? { ...px, comments: px.comments.map(cc => cc.id === c.id ? { ...cc, isReplying: !cc.isReplying } : cc) } : px))}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
                                >
                                  <i className="fas fa-reply"></i> Reply
                                </button>
                              </div>
                              {c.isReplying && (
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    value={c.replyDraft || ''}
                                    onChange={(e) => setPosts(prev => prev.map(px => px.id === p.id ? { ...px, comments: px.comments.map(cc => cc.id === c.id ? { ...cc, replyDraft: e.target.value } : cc) } : px))}
                                    placeholder="Write a reply..."
                                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                                  />
                                  <button
                                    onClick={async () => {
                                      const t = (c.replyDraft || '').trim();
                                      if (!t) return;
                                      const tempId = `r_${Date.now()}`;
                                      setPosts(prev => prev.map(px => px.id === p.id ? {
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
                                          // replace temp reply id with real one
                                          setPosts(prev => prev.map(px => px.id === p.id ? {
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
              ))
            )}
            <div ref={bottomRef} />
            {isLoadingMore && (
              <div className="text-center text-sm text-gray-500 py-3">Loading more...</div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-3">No more posts</div>
            )}
          </div>
        </div>
      </section>

     

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center lg:text-left">
                Why Choose Skillify?
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-star text-yellow-500 mt-1 text-lg"></i>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">Peer-to-Peer Learning</h4>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Learn from real practitioners with hands-on experience</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-users text-blue-500 mt-1 text-lg"></i>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">Community Driven</h4>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Join a supportive community of learners and teachers</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-clock text-purple-500 mt-1 text-lg"></i>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">Flexible Scheduling</h4>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Learn at your own pace with flexible time slots</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-medal text-green-500 mt-1 text-lg"></i>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">Skill Exchange</h4>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Trade skills - teach what you know, learn what you need</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg order-first lg:order-last">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center lg:text-left">Popular Skills</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center lg:justify-start">
                {['React.js', 'Python', 'UI/UX Design', 'Machine Learning', 'Photography', 'Guitar', 'Cooking', 'Spanish', 'Marketing', 'Public Speaking'].map((skill) => (
                  <span key={skill} className="bg-blue-50 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                    {skill}
                  </span>
                ))}
              </div>
              <Link
                href="/search"
                className="inline-block mt-3 sm:mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base text-center lg:text-left w-full lg:w-auto"
              >
                View all skills →
              </Link>
            </div>
          </div>
        </div>
      </section>

     

      {deleteTarget && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-4">
            <div className="font-semibold mb-2">Delete post</div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to permanently delete this post and its comments?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!deleteTarget) return;
                  setIsDeleting(true);
                  try {
                    const res = await fetch(`/api/posts/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
                    setPosts(prev => prev.filter(x => x.id !== deleteTarget));
                    setDeleteTarget(null);
                  } catch (e) {
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
    </div>
  );
};

export default HomePage;
