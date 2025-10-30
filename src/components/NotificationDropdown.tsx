"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface Notification {
  _id: string;
  type: "connection_request" | "connection_accepted" | "connection_withdrawn" | "message" | "review" | "system";
  title: string;
  message: string;
  sender?: {
    _id: string;
    clerkId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar?: string;
  };
  data?: {
    connectionRequestId?: string;
    profileUrl?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: string;
}

type TabType = "all" | "unread" | "read";

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const router = useRouter();

  // Fetch real notifications from API
  const fetchNotifications = async (filter: TabType = "all", reset: boolean = true) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/notifications?filter=${filter}&limit=20&skip=${reset ? 0 : notifications.length}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications(prev => [...prev, ...data.notifications || []]);
        }
        
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error("Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchNotifications(activeTab);
    }
  }, [user, activeTab]);
  
  // Listen for real-time refresh signals
  useEffect(() => {
    const refresh = () => {
      console.log("STREAM: notifications:refresh -> fetching list (dropdown)");
      fetchNotifications(activeTab, true);
    };
    const increment = (e: any) => {
      const delta = e?.detail?.delta ?? 1;
      setUnreadCount((prev) => prev + delta);
    };
    window.addEventListener("notifications:refresh", refresh);
    window.addEventListener("notifications:increment", increment);
    return () => {
      window.removeEventListener("notifications:refresh", refresh);
      window.removeEventListener("notifications:increment", increment);
    };
  }, [activeTab]);

  // Fallback: periodic refresh every 10s only if panel is open
  useEffect(() => {
    if (!isOpen || !user) return;
    const interval = setInterval(() => fetchNotifications(activeTab, true), 10000);
    return () => clearInterval(interval);
  }, [isOpen, user, activeTab]);
  
  // Add loading state  
  const [loading, setLoading] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleAcceptConnection = async (
    notificationId: string,
    fromUserId: string
  ) => {
    try {
      const response = await fetch("/api/connections", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: fromUserId,
          notificationId
        }),
      });
      
      if (response.ok) {
        // Update the notification to show connection accepted
        setNotifications((prev) => 
          prev.map((n) => 
            n._id === notificationId 
              ? {
                  ...n,
                  type: "connection_accepted",
                  title: "Connection Accepted",
                  message: `You are now connected with ${n.sender?.fullName}`,
                  read: true
                }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        toast.success("Connection accepted!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to accept connection");
      }
    } catch (error) {
      console.error("Failed to accept connection:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleProfileClick = (fromUserClerkId: string) => {
    router.push(`/profile/${fromUserClerkId}`);
    setIsOpen(false);
  };
  const handleViewPost = (_postId?: string) => {
    router.push(`/dashboard`);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "connection_request":
        return "fas fa-user-plus text-blue-500";
      case "connection_accepted":
        return "fas fa-check-circle text-green-500";
      case "connection_withdrawn":
        return "fas fa-user-minus text-orange-500";
      case "message":
        return "fas fa-envelope text-purple-500";
      case "review":
        return "fas fa-star text-yellow-500";
      default:
        return "fas fa-bell text-gray-500";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - notificationTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "read":
        return notifications.filter((n) => n.read);
      case "all":
      default:
        return notifications;
    }
  };

  const viewAllNotifications = () => {
    // This would typically navigate to a full notifications page
    // For now, we'll just keep the dropdown open and show all notifications
    setActiveTab("all");
  };

  if (!user) return null;

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${
          unreadCount > 0 ? 'animate-bounce' : ''
        }`}
      >
        <i className={`fas fa-bell text-lg ${unreadCount > 0 ? 'text-blue-600' : ''}`}></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse border-2 border-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full max-w-4xl max-h-screen overflow-hidden flex flex-col">
          <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "all"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "unread"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                  onClick={() => setActiveTab("read")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "read"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Read
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === "all"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === "unread"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab("read")}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === "read"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Read
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <i className="fas fa-bell-slash text-4xl mb-4"></i>
                <p className="text-lg">No notifications in this category</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${
                      !notification.read ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification._id);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {notification.sender?.avatar ? (
                          <img
                            src={notification.sender.avatar}
                            alt={notification.sender.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <i
                              className={`${getNotificationIcon(
                                notification.type
                              )} text-lg`}
                            ></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        
                        {/* Message row: for system notifications, craft message with clickable sender */}
                        {notification.type === 'system' && notification.sender ? (
                          <p className="text-gray-700 mb-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleProfileClick(notification.sender!.clerkId); }}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {notification.sender.fullName}
                            </button>
                            {" "}
                            {notification.title?.toLowerCase().includes('like') ? 'liked your post' : 'commented on your post'}
                          </p>
                        ) : (
                          <p className="text-gray-700 mb-3">{notification.message}</p>
                        )}

                        {/* Connection Request Actions */}
{notification.type === "connection_request" && notification.sender && !notification.read && (
                          <div className="flex space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptConnection(
                                  notification._id,
                                  notification.sender!._id
                                );
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProfileClick(notification.sender!.clerkId);
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              View Profile
                            </button>
                          </div>
                        )}

                        {/* Connection Accepted Actions */}
                        {notification.type === "connection_accepted" && notification.sender && (
                          <div className="flex space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProfileClick(notification.sender!.clerkId);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to messages (implement later)
                                toast("Messaging feature coming soon!");
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Send Message
                            </button>
                          </div>
                        )}

                        {/* Other notification types */}
                        {notification.type === 'system' && notification.data?.postId && (
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewPost(String(notification.data!.postId)); }}
                              className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                            >
                              View Post
                            </button>
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
