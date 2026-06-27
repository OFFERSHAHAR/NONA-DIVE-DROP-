"use client";

import { Moon, User, Bell, Zap } from "lucide-react";
import { useState } from "react";

export function Settings() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* User Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-os-primary" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>
        <div className="bg-os-hover border border-os-hover rounded-lg p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <input
              type="text"
              defaultValue="You"
              className="w-full mt-1 bg-os-bg border border-os-hover rounded px-3 py-2 text-sm focus:outline-none focus:border-os-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              defaultValue="user@example.com"
              className="w-full mt-1 bg-os-bg border border-os-hover rounded px-3 py-2 text-sm focus:outline-none focus:border-os-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-5 h-5 text-os-accent" />
          <h2 className="text-lg font-semibold">Appearance</h2>
        </div>
        <div className="bg-os-hover border border-os-hover rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm">Dark Mode</label>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1 rounded transition-colors ${
                darkMode ? "bg-os-primary" : "bg-os-hover"
              }`}
            >
              {darkMode ? "On" : "Off"}
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-400">Theme</label>
            <select className="w-full mt-1 bg-os-bg border border-os-hover rounded px-3 py-2 text-sm focus:outline-none focus:border-os-primary transition-colors">
              <option>Dark (Default)</option>
              <option>Light</option>
              <option>Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-os-primary" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <div className="bg-os-hover border border-os-hover rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm">Tasks</label>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Messages</label>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Reminders</label>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* System Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-os-accent" />
          <h2 className="text-lg font-semibold">System</h2>
        </div>
        <div className="bg-os-hover border border-os-hover rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm text-gray-400 mb-2">JARVIS ZERO OS</p>
            <p className="text-sm font-mono">v0.1.0-alpha</p>
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-os-primary hover:bg-os-primary/80 rounded text-sm font-medium transition-colors">
            Check for Updates
          </button>
        </div>
      </div>
    </div>
  );
}
