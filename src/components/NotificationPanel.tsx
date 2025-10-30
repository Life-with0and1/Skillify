"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface NotificationData {
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

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "all" | "unread" | "read";

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useUser();
  const router = useRouter();

  // Fetch notifications from API
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
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
      } else {
        toast.error("Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Load notifications when panel opens or tab changes
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications(activeTab);
    }
  }, [isOpen, activeTab, user]);

  // Listen for real-time refresh signals (with staged retries)
  useEffect(() => {
    const handler = () => {
      console.log("STREAM: notifications:refresh -> fetching list (panel)");
      fetchNotifications(activeTab, true);
      setTimeout(() => fetchNotifications(activeTab, true), 250);
      setTimeout(() => fetchNotifications(activeTab, true), 1000);
    };
    window.addEventListener("notifications:refresh", handler);
    return () => window.removeEventListener("notifications:refresh", handler);
  }, [activeTab]);

  // Refresh notifications periodically when panel is open to catch withdrawn requests (fallback)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchNotifications(activeTab, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

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
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleAcceptConnection = async (
    notificationId: string,
    senderId: string
  ) => {
    try {
      const response = await fetch("/api/connections", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId,
          notificationId,
        }),
      });

      if (response.ok) {
        // Remove the connection request notification and show acceptance
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId
              ? {
                  ...n,
                  type: "connection_accepted",
                  title: "Connection Accepted",
                  message: `You accepted ${n.sender?.fullName}'s connection request`,
                  read: true,
                }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        toast.success("Connection accepted!");
        
        // Refresh notifications to get updated state from server
        setTimeout(() => {
          fetchNotifications(activeTab, true);
        }, 1000);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to accept connection");
      }
    } catch (error) {
      console.error("Failed to accept connection:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // This function is not needed anymore as withdrawal is handled in UserCard
  // Keeping it for backward compatibility but it won't be called

  const handleProfileClick = (clerkId: string) => {
    router.push(`/profile/${clerkId}`);
    onClose();
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

  if (!isOpen) return null;

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white w-full h-full max-w-4xl max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <button
              onClick={onClose}
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
        </div>

        {/* Content */}
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

                      <p className="text-gray-700 mb-3">{notification.message}</p>

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
                      {notification.sender && 
                       !["connection_request", "connection_accepted"].includes(notification.type) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(notification.sender!._id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Profile
                        </button>
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

          {/* Load More Button */}
          {hasMore && filteredNotifications.length > 0 && (
            <div className="p-6 text-center">
              <button
                onClick={() => fetchNotifications(activeTab, false)}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
