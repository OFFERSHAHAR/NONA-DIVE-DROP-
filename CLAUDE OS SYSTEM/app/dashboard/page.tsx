"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { UserMenu } from "@/components/User/UserMenu";
import { ActivityFeed } from "@/components/User/ActivityFeed";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { initPresence, getOnlineUsers } from "@/lib/presence";
import { PresenceIndicator } from "@/components/User/PresenceIndicator";
import { Users, Activity } from "lucide-react";

export default function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const { onlineUsers } = usePresenceStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function setupPresence() {
      if (user) {
        try {
          await initPresence(user.id, user.username);
        } catch (err) {
          console.error("Failed to initialize presence:", err);
        } finally {
          setIsInitializing(false);
        }
      }
    }

    setupPresence();
  }, [user]);

  if (isInitializing) {
    return (
      <div className="w-screen h-screen bg-os-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Initializing collaboration...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                Welcome back, {user?.username}!
              </p>
            </div>
            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Stats */}
            <div className="col-span-1 space-y-6">
              {/* User Info Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <h2 className="font-semibold text-white mb-4">Your Profile</h2>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Username</p>
                    <p className="font-medium text-white">{user?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="font-medium text-white text-sm break-all">
                      {user?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Role</p>
                    <p className={`font-medium ${
                      user?.role === "admin"
                        ? "text-purple-200"
                        : "text-blue-200"
                    }`}>
                      {user?.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Status</p>
                    <PresenceIndicator userId={user?.id || ""} />
                  </div>
                </div>
              </div>

              {/* Online Users Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h2 className="font-semibold text-white">
                    Online Users ({onlineUsers.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {onlineUsers.length === 0 ? (
                    <p className="text-sm text-slate-400">No one online</p>
                  ) : (
                    onlineUsers.map((presence) => (
                      <div
                        key={presence.userId}
                        className="flex items-center gap-2 p-2 rounded bg-slate-700/20 hover:bg-slate-700/40 transition"
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm text-slate-300 flex-1">
                          {presence.username}
                        </span>
                        {presence.activeApp && (
                          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                            {presence.activeApp}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Activity & Info */}
            <div className="col-span-2 space-y-6">
              {/* Activity Feed */}
              <div className="h-96">
                <ActivityFeed />
              </div>

              {/* Features Overview */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <h2 className="font-semibold text-white mb-4">Collaboration Features</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-blue-200 mb-1">🔐 Authentication</p>
                    <p className="text-xs text-slate-400">Secure email/password login with session management</p>
                  </div>
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-purple-200 mb-1">👥 Presence Tracking</p>
                    <p className="text-xs text-slate-400">See who's online in real-time with status indicators</p>
                  </div>
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-green-200 mb-1">📊 Activity Logs</p>
                    <p className="text-xs text-slate-400">Track all user actions and system events</p>
                  </div>
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-orange-200 mb-1">🔒 Access Control</p>
                    <p className="text-xs text-slate-400">Role-based permissions with Row-Level Security</p>
                  </div>
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-cyan-200 mb-1">📝 Shared Items</p>
                    <p className="text-xs text-slate-400">Collaborate on tasks, calendar, and vault notes</p>
                  </div>
                  <div className="p-3 bg-slate-700/20 rounded">
                    <p className="text-sm font-medium text-pink-200 mb-1">🚀 Real-time Sync</p>
                    <p className="text-xs text-slate-400">Instant updates across all connected devices</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              {user?.role === "admin" && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                  <h2 className="font-semibold text-white mb-4">Admin Options</h2>
                  <a
                    href="/admin"
                    className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition"
                  >
                    Go to Admin Panel
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
