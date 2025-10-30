"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import NotificationDropdown from "./NotificationDropdown";
import NotificationPanel from "./NotificationPanel";

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onUnread = (e: any) => {
      const detail = e?.detail as { channelId?: string };
      if (!detail?.channelId) return;
      setUnreadChannels(prev => new Set(prev).add(detail.channelId!));
    };
    const onRead = (e: any) => {
      const detail = e?.detail as { channelId?: string };
      if (!detail?.channelId) return;
      setUnreadChannels(prev => {
        const next = new Set(prev);
        next.delete(detail.channelId!);
        return next;
      });
    };
    window.addEventListener("messages:unread", onUnread as EventListener);
    window.addEventListener("messages:read", onRead as EventListener);
    return () => {
      window.removeEventListener("messages:unread", onUnread as EventListener);
      window.removeEventListener("messages:read", onRead as EventListener);
    };
  }, []);

  const hasUnread = useMemo(() => unreadChannels.size > 0, [unreadChannels]);

  // Hide Navbar during onboarding flow
  if (pathname?.startsWith("/onboarding")) {
    return null;
  }

  const isActive = (path: string) => {
    return pathname === path
      ? "text-blue-600 bg-blue-50"
      : "text-gray-700 hover:text-blue-600";
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden xs:block">
                Skillify
              </span>
              <span className="text-lg font-bold text-gray-900 block xs:hidden">
                S
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/search"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive(
                "/search"
              )}`}
            >
              <i className="fas fa-search mr-2"></i>
              Search
            </Link>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <NotificationDropdown />
              <Link
                href="/messages"
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive(
                  "/messages"
                )}`}
                title="Messages"
              >
                <i className="fas fa-message text-gray-700"></i>
                {hasUnread && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
              </Link>
              <div className="ml-1">
                <Link href="/dashboard" className="block w-8 h-8 relative" title="Dashboard">
                  <Image
                    src={user?.imageUrl || "/default-avatar.png"}
                    alt={user?.fullName || "Me"}
                    fill
                    className="rounded-full object-cover"
                    sizes="32px"
                  />
                </Link>
              </div>
            </SignedIn>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              <i
                className={`fas ${isMenuOpen ? "fa-times" : "fa-bars"} text-lg`}
              ></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="flex flex-col space-y-1">
              <Link
                href="/search"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive(
                  "/search"
                )}`}
              >
                <i className="fas fa-search mr-2"></i>
                Search
              </Link>

              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors mx-3 mt-2">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <div className="px-3 py-2">
                  <NotificationDropdown />
                </div>
                <Link
                  href="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive(
                    "/messages"
                  )}`}
                >
                  <i className="fas fa-message mr-2"></i>
                  Messages
                  {hasUnread && (
                    <span className="ml-2 w-2.5 h-2.5 bg-red-500 rounded-full inline-block" />
                  )}
                </Link>
              </SignedIn>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
