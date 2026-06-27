"use client";

import { useWindowStore } from "@/stores/windowStore";
import {
  LayoutGrid,
  CheckSquare,
  Calendar,
  BookOpen,
  Settings,
  Users,
  Power,
  Maximize2,
} from "lucide-react";
import { AppType } from "@/types/os";
import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { VoiceButton } from "@/components/Voice";

const APPS = [
  { id: "dashboard" as AppType, name: "Dashboard", icon: LayoutGrid },
  { id: "tasks" as AppType, name: "Tasks", icon: CheckSquare },
  { id: "calendar" as AppType, name: "Calendar", icon: Calendar },
  { id: "vault" as AppType, name: "Vault", icon: BookOpen },
  { id: "collaboration" as AppType, name: "Collaboration", icon: Users },
  { id: "settings" as AppType, name: "Settings", icon: Settings },
] as const;

// Memoized app button component
const AppButton = memo(
  ({
    app,
    isActive,
    onClick,
  }: {
    app: (typeof APPS)[number];
    isActive: boolean;
    onClick: () => void;
  }) => {
    const Icon = app.icon;
    return (
      <button
        key={app.id}
        onClick={onClick}
        title={app.name}
        className={`p-2 rounded-os-md transition-all duration-250 group relative
          ${
            isActive
              ? "bg-gradient-os-primary text-white shadow-os-glow"
              : "bg-os-hover hover:bg-os-hover-strong text-gray-300 hover:text-white"
          }
        `}
      >
        <Icon className="w-5 h-5" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-os-panel border border-os-border rounded-os-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          {app.name}
        </div>
        {isActive && (
          <div className="absolute bottom-1 right-0 w-2 h-2 bg-os-primary-light rounded-full animate-pulse-soft" />
        )}
      </button>
    );
  }
);
AppButton.displayName = "AppButton";

// Memoized window indicator button
const WindowButton = memo(
  ({
    win,
    isFocused,
    onClick,
  }: {
    win: { id: string; title: string };
    isFocused: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-os-sm transition-all ${
        isFocused
          ? "bg-os-primary text-white shadow-os-glow"
          : "bg-os-hover text-gray-300 hover:bg-os-hover-strong"
      }`}
      title={win.title}
    >
      {win.title.length > 12 ? win.title.slice(0, 12) + "..." : win.title}
    </button>
  )
);
WindowButton.displayName = "WindowButton";

function TaskbarComponent() {
  const [time, setTime] = useState<string>("");

  // Granular selectors to minimize re-renders
  const openWindow = useWindowStore((state) => state.openWindow);
  const windows = useWindowStore((state) => state.windows);
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusWindow = useWindowStore((state) => state.focusWindow);

  // Update time only (separate concern)
  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Memoize app click handler
  const handleAppClick = useCallback(
    (appId: AppType, name: string) => {
      const appWindow = windows.find((w) => w.app === appId);
      if (appWindow) {
        focusWindow(appWindow.id);
      } else {
        openWindow(appId, name);
      }
    },
    [windows, focusWindow, openWindow]
  );

  // Cache active apps to avoid recalculation
  const activeApps = useMemo(() => {
    const active = new Set<AppType>();
    windows.forEach((w) => active.add(w.app));
    return active;
  }, [windows]);

  // Slice visible windows to limit DOM nodes
  const visibleWindows = useMemo(() => windows.slice(0, 4), [windows]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 glass-panel-strong border-t border-os-border flex items-center justify-between px-4 z-40 backdrop-blur-glass pointer-events-auto">
      {/* Voice Button - Left Side */}
      <div className="absolute left-20 flex items-center">
        <VoiceButton />
      </div>

      {/* Apps Section */}
      <div className="flex items-center gap-2">
        {APPS.map((app) => (
          <AppButton
            key={app.id}
            app={app}
            isActive={activeApps.has(app.id)}
            onClick={() => handleAppClick(app.id, app.name)}
          />
        ))}
      </div>

      {/* Center - Window Indicators */}
      <div className="flex items-center gap-2 px-4 border-l border-r border-os-border">
        {windows.length > 0 ? (
          <div className="flex items-center gap-2">
            {visibleWindows.map((win) => (
              <WindowButton
                key={win.id}
                win={win}
                isFocused={win.id === focusedWindowId}
                onClick={() => focusWindow(win.id)}
              />
            ))}
            {windows.length > 4 && (
              <span className="text-xs text-gray-400">+{windows.length - 4}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500">No windows open</span>
        )}
      </div>

      {/* System Controls & Info */}
      <div className="flex items-center gap-3">
        <div className="text-xs font-mono text-gray-400">{time}</div>

        <div className="flex items-center gap-2 pl-3 border-l border-os-border">
          <span className="text-xs text-gray-400">
            {windows.length} {windows.length === 1 ? "window" : "windows"}
          </span>

          <button
            title="Tile windows"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-os-hover rounded-os-md transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            title="Shutdown"
            className="p-1.5 text-gray-400 hover:text-os-danger hover:bg-os-danger/10 rounded-os-md transition-all"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const Taskbar = memo(TaskbarComponent);
