"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

type MasterLayoutProps = {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
};

export default function MasterLayout({
  children,
  showHeader = true,
  showFooter = true,
  headerContent,
  footerContent,
}: MasterLayoutProps) {
  const { user, userProfile, loading } = useAuth();

  // Get user display name
  const getUserDisplayName = () => {
    if (loading) return "Loading...";
    if (user?.name) return user.name;
    if (userProfile?.full_name) return userProfile.full_name;
    if (user?.username) return user.username;
    if (userProfile?.username) return userProfile.username;
    return "User";
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      {showHeader && (
        <header className="w-full bg-[#0b4d2b] flex-shrink-0 flex items-center px-6 py-3">
          {headerContent || (
            <>
              <div className="flex-1 text-center">
                <h1 className="text-white text-lg font-normal">
                  SJDA - Silver Jubilee Development Agency
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {/* User Info */}
                <div className="text-right">
                  <div className="font-semibold text-sm text-white">
                    {getUserDisplayName()}
                  </div>
                  {(user?.department || userProfile?.department) && (
                    <div className="text-xs text-blue-200">
                      {user?.department || userProfile?.department}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-[#0b4d2b] flex-shrink-0 w-full">
          {footerContent || (
            <div className="mx-auto w-full max-w-none px-6 py-4 text-center text-white text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 text-center">
                  &copy; {new Date().getFullYear()} SJDA - Silver Jubilee Development Agency, All rights reserved.
                </span>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/logout", { method: "POST" });
                      // Clear localStorage
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("userData");
                      }
                      // Redirect to login
                      window.location.href = "/login";
                    } catch (error) {
                      console.error("Logout error:", error);
                      // Still redirect even if API call fails
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("userData");
                        window.location.href = "/login";
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

