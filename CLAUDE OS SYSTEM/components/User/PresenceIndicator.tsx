"use client";

import { useState, useEffect } from "react";
import { usePresenceStore } from "@/stores/presenceStore";
import { PresenceState } from "@/lib/presence";
import { Circle } from "lucide-react";

interface PresenceIndicatorProps {
  userId: string;
  compact?: boolean;
}

export function PresenceIndicator({ userId, compact = false }: PresenceIndicatorProps) {
  const { getUserPresence } = usePresenceStore();
  const presence = getUserPresence(userId);

  if (!presence) {
    return null;
  }

  const isOnline = presence.isOnline;
  const lastSeenTime = new Date(presence.lastSeen);
  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - lastSeenTime.getTime()) / 60000);

  const getLastSeenText = () => {
    if (isOnline) return "Online now";
    if (minutesAgo < 1) return "Just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Circle
          className={`w-2 h-2 ${isOnline ? "fill-green-500 text-green-500" : "fill-slate-500 text-slate-500"}`}
        />
        <span className="text-xs text-slate-400">{getLastSeenText()}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-3 h-3">
        <Circle
          className={`w-full h-full ${isOnline ? "fill-green-500 text-green-500" : "fill-slate-500 text-slate-500"}`}
        />
        {isOnline && (
          <div className="absolute inset-0 animate-ping rounded-full border border-green-400"></div>
        )}
      </div>
      <span className="text-sm font-medium">{getLastSeenText()}</span>
      {presence.activeApp && (
        <span className="text-xs text-slate-400">({presence.activeApp})</span>
      )}
    </div>
  );
}
