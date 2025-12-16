"use client";

import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, userProfile, loading, refreshUser } = useAuth();


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
    <nav className="flex justify-end items-center bg-[#0b4d2b] text-white px-6 py-3 shadow-md">
      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="text-right">
          <div className="font-semibold text-sm">
            {getUserDisplayName()}
          </div>
          {(user?.department || userProfile?.department) && (
            <div className="text-xs text-blue-200">
              {user?.department || userProfile?.department}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
