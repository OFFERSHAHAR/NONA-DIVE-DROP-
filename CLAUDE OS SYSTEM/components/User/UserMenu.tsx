"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, Users, Activity } from "lucide-react";
import { PresenceIndicator } from "./PresenceIndicator";

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { onlineUsers } = usePresenceStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await signOut();
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-white">{user.username}</p>
          <p className="text-xs text-slate-400">{user.role}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          {/* User Info */}
          <div className="p-4 border-b border-slate-700">
            <p className="font-semibold text-white">{user.username}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <PresenceIndicator userId={user.id} compact />
              </div>
            </div>
          </div>

          {/* Online Users */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-white">
                {onlineUsers.length} Online
              </p>
            </div>
            <div className="space-y-1">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-slate-500">No one online</p>
              ) : (
                onlineUsers.map((presence) => (
                  <div key={presence.userId} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span className="text-slate-300">{presence.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {user.role === "admin" && (
              <>
                <button
                  onClick={() => {
                    router.push("/admin");
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition"
                >
                  <Users className="w-4 h-4" />
                  Admin Panel
                </button>
              </>
            )}

            <button
              onClick={() => {
                router.push("/settings");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
