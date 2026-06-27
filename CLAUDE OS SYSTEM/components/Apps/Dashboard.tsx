"use client";

import { BarChart3, TrendingUp, Users, Zap } from "lucide-react";

export function Dashboard() {
  return (
    <div className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          {
            label: "Total Tasks",
            value: "42",
            icon: TrendingUp,
            color: "text-blue-400",
          },
          {
            label: "Active Users",
            value: "2",
            icon: Users,
            color: "text-purple-400",
          },
          {
            label: "Completed Today",
            value: "7",
            icon: Zap,
            color: "text-green-400",
          },
          {
            label: "This Week",
            value: "28",
            icon: BarChart3,
            color: "text-orange-400",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-os-hover border border-os-hover rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-os-hover border border-os-hover rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p>✓ Task "Setup Obsidian" completed</p>
          <p>✓ New task "Build Frontend" added</p>
          <p>→ Aur joined Collaboration</p>
          <p>→ Calendar event scheduled</p>
        </div>
      </div>
    </div>
  );
}
