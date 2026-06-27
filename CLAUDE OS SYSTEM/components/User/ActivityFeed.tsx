"use client";

import { useState, useEffect } from "react";
import { usePresenceStore } from "@/stores/presenceStore";
import { useAuthStore } from "@/stores/authStore";
import { PresenceState } from "@/lib/presence";
import { Activity, Clock, User } from "lucide-react";

interface ActivityEntry {
  id: string;
  type: "online" | "offline" | "app_change" | "action";
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function ActivityFeed() {
  const { onlineUsers, presenceStates } = usePresenceStore();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [maxEntries] = useState(20);

  useEffect(() => {
    // Initialize activities from current presence
    const initialActivities: ActivityEntry[] = onlineUsers.map((presence) => ({
      id: `${presence.userId}-${presence.updatedAt}`,
      type: "online",
      userId: presence.userId,
      username: presence.username,
      message: `${presence.username} came online`,
      timestamp: new Date(presence.updatedAt),
      metadata: { activeApp: presence.activeApp },
    }));

    setActivities(initialActivities);
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: ActivityEntry["type"]) => {
    switch (type) {
      case "online":
        return <span className="w-2 h-2 bg-green-500 rounded-full"></span>;
      case "offline":
        return <span className="w-2 h-2 bg-slate-500 rounded-full"></span>;
      case "app_change":
        return <Activity className="w-4 h-4 text-blue-400" />;
      case "action":
        return <User className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const recentActivities = activities.slice(0, maxEntries);

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border border-slate-700/50 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold text-white">Activity Feed</h2>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {recentActivities.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-slate-700/30 transition flex items-start gap-3"
              >
                <div className="mt-1 flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">
                    {activity.message}
                  </p>
                  {activity.metadata?.activeApp && (
                    <p className="text-xs text-slate-500 mt-1">
                      App: {activity.metadata.activeApp}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatTime(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        Showing {recentActivities.length} recent activities
      </div>
    </div>
  );
}
