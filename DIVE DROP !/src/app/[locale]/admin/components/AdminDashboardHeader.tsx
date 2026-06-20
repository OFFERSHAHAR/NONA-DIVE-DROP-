'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/stores';

interface AdminDashboardHeaderProps {
  adminName: string;
  currentTime: string;
}

export default function AdminDashboardHeader({
  adminName,
  currentTime,
}: AdminDashboardHeaderProps) {
  const router = useRouter();
  const { logout } = useAdminStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const handleSettings = () => {
    router.push('/admin/settings');
    setIsDropdownOpen(false);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-lg shadow-lg p-6 border border-slate-700/50">
      <div className="flex items-center justify-between">
        {/* Left Section: Welcome & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
              🎯
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">DIVE DROP Admin</h1>
              <p className="text-slate-300">Welcome back, <span className="font-semibold text-cyan-400">{adminName.split('@')[0]}</span></p>
              <p className="text-xs text-slate-400 mt-1">Super Administrator • Full Access</p>
            </div>
          </div>
        </div>

        {/* Right Section: Time & Actions */}
        <div className="flex items-center gap-6">
          {/* System Status */}
          <div className="hidden md:block text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-slate-300">System Online</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{currentTime}</p>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString()}</p>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-slate-700/50 hidden lg:block"></div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <span className="text-xl">🔔</span>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>👤</span>
                <span className="text-sm font-medium text-slate-300">{adminName.split('@')[0]}</span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <a
                    href="/admin/settings"
                    className="block px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                  >
                    <span className="mr-2">⚙️</span> Profile Settings
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adminName);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                  >
                    <span className="mr-2">👤</span> Copy Email
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <span className="mr-2">🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Total Users</p>
          <p className="text-xl font-bold text-cyan-400">2,847</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Active Now</p>
          <p className="text-xl font-bold text-emerald-400">342</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Pending Items</p>
          <p className="text-xl font-bold text-yellow-400">15</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Today Revenue</p>
          <p className="text-xl font-bold text-green-400">$3,847</p>
        </div>
      </div>
    </div>
  );
}
