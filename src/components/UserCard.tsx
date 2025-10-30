import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { User } from "@/types";
import { toast } from "react-hot-toast";

type ConnectionStatus = "not_connected" | "request_sent" | "request_received" | "connected";

interface UserCardProps {
  user: User;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const { user: currentUser, isLoaded } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("not_connected");
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!isLoaded || !currentUser || !user.id) return;
    
    // Fetch actual connection status from API
    const fetchConnectionStatus = async () => {
      try {
        const response = await fetch(`/api/connections?targetUserId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
        }
      } catch (error) {
        console.error("Failed to fetch connection status:", error);
      }
    };
    
    fetchConnectionStatus();
  }, [currentUser, isLoaded, user.id]);

  const handleConnection = async () => {
    if (!currentUser || !user.id) return;
    setIsLoading(true);
    
    try {
      if (connectionStatus === "not_connected") {
        // Send connection request - use user.id (MongoDB _id) instead of clerkId
        console.log("Sending connection request to:", user.id);
        const response = await fetch("/api/connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: user.id,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection request sent!");
        } else {
          const data = await response.json();
          console.error("Connection request failed:", data);
          toast.error(data.error || "Failed to send connection request");
        }
      } else if (connectionStatus === "request_sent") {
        // Withdraw connection request - use user.id
        console.log("Withdrawing connection request from:", user.id);
        const response = await fetch("/api/connections", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: user.id,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection request withdrawn");
        } else {
          const data = await response.json();
          console.error("Withdraw request failed:", data);
          toast.error(data.error || "Failed to withdraw connection request");
        }
      } else if (connectionStatus === "request_received") {
        // Accept connection request
        console.log("Accepting connection request from:", user.id);
        const response = await fetch("/api/connections", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            senderId: user.id,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
          toast.success("Connection accepted!");
        } else {
          const data = await response.json();
          console.error("Accept request failed:", data);
          toast.error(data.error || "Failed to accept connection request");
        }
      }
    } catch (error) {
      console.error("Connection action failed:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 border border-gray-100">
      <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative w-16 h-16 mx-auto sm:mx-0 flex-shrink-0">
          <Image
            src={user.avatar}
            alt={user.name}
            fill
            className="rounded-full object-cover"
            sizes="64px"
          />
        </div>
        <div className="flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-1 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center sm:text-left">
              {user.name}
            </h3>
          </div>

          <div className="flex items-center justify-center sm:justify-start space-x-1 mb-2">
            {renderStars(user.rating)}
            <span className="text-xs sm:text-sm text-gray-600 ml-2">
              {user.rating} ({user.totalReviews} reviews)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-3 text-center sm:text-left leading-relaxed">
            {user.bio}
          </p>

          <div className="flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-500 mb-3">
            <i className="fas fa-map-marker-alt mr-1"></i>
            {user.location}
          </div>

          <div className="mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center sm:text-left">
              Skills to teach:
            </p>
            <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
              {user.skillsToTeach.slice(0, 3).map((skill) => (
                <span
                  key={skill.id}
                  className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                >
                  {skill.name}
                </span>
              ))}
              {user.skillsToTeach.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{user.skillsToTeach.length - 3} more
                </span>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center sm:text-left">
              Available:
            </p>
            <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
              {user.availability.map((time) => (
                <span
                  key={time}
                  className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs"
                >
                  {time}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <SignedIn>
              <Link
                href={`/profile/${user.clerkId}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-center transition-colors"
              >
                View Profile
              </Link>
              {connectionStatus === "connected" && (
                <Link
                  href={`/messages/${user.clerkId}`}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-center transition-colors"
                >
                  <i className="fas fa-comment-dots mr-1"></i> Message
                </Link>
              )}
              <button 
                onClick={handleConnection}
                disabled={isLoading || connectionStatus === "connected"}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 ${
                  connectionStatus === "request_sent"
                    ? "bg-yellow-100 text-yellow-800 border border-yellow-600 hover:bg-yellow-200"
                    : connectionStatus === "request_received"
                    ? "bg-green-100 text-green-800 border border-green-600 hover:bg-green-200"
                    : connectionStatus === "connected"
                    ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                    : "border border-blue-600 text-blue-600 hover:bg-blue-50"
                }`}
              >
                {connectionStatus === "request_sent" ? (
                  <>
                    <i className="fas fa-user-clock mr-1"></i> 
                    {isLoading ? "Withdrawing..." : "Withdraw Request"}
                  </>
                ) : connectionStatus === "request_received" ? (
                  <>
                    <i className="fas fa-user-check mr-1"></i> 
                    {isLoading ? "Accepting..." : "Accept Request"}
                  </>
                ) : connectionStatus === "connected" ? (
                  <>
                    <i className="fas fa-user-friends mr-1"></i>
                    Connected
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus mr-1"></i> 
                    {isLoading ? "Connecting..." : "Connect"}
                  </>
                )}
              </button>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-center transition-colors">
                  Sign In to View Profile
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
                  Sign In to Connect
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
