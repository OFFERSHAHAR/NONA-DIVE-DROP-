"use client";

import { Clock, Battery, Wifi, Volume2 } from "lucide-react";
import { useState, useEffect, memo, useCallback } from "react";

function DesktopComponent() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [battery, setBattery] = useState(85);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleWifiToggle = useCallback(() => {
    setIsConnected((prev) => !prev);
  }, []);

  // Memoize static background style
  const gradientStyle = {
    backgroundImage: `
      radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
    `,
  };

  const gridStyle = {
    backgroundImage: `
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
    `,
    backgroundSize: "50px 50px",
  };

  return (
    <div className="absolute inset-0 bg-gradient-os-dark overflow-hidden">
      {/* Static background gradient - no animation */}
      <div className="absolute inset-0 opacity-30" style={gradientStyle} />

      {/* Grid background pattern - static */}
      <div className="absolute inset-0 opacity-5" style={gridStyle} />

      {/* Top-right corner - System Status */}
      <div className="absolute top-6 right-6 space-y-3 z-10">
        {/* Time and Date Widget */}
        <div className="glass-panel-strong rounded-os-lg px-4 py-3 hover:border-os-primary/50 transition-all">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-os-primary" />
            <div className="text-right">
              <div className="font-mono text-sm font-semibold">
                {time || "--:--:--"}
              </div>
              <div className="text-xs text-gray-400">{date}</div>
            </div>
          </div>
        </div>

        {/* System Status Bar */}
        <div className="glass-panel-strong rounded-os-lg px-3 py-2 flex gap-3">
          {/* WiFi Status */}
          <button
            title={isConnected ? "Connected" : "Disconnected"}
            className="p-1.5 hover:bg-os-primary/20 rounded-os-md transition-colors"
            onClick={handleWifiToggle}
          >
            <Wifi
              className={`w-4 h-4 ${
                isConnected ? "text-os-success" : "text-os-danger"
              }`}
            />
          </button>

          {/* Volume Control */}
          <button
            title="Volume"
            className="p-1.5 hover:bg-os-primary/20 rounded-os-md transition-colors"
          >
            <Volume2 className="w-4 h-4 text-os-info" />
          </button>

          {/* Battery Status */}
          <button
            title={`Battery: ${battery}%`}
            className="p-1.5 hover:bg-os-primary/20 rounded-os-md transition-colors"
          >
            <div className="flex items-center gap-1">
              <Battery
                className={`w-4 h-4 ${
                  battery > 20
                    ? "text-os-success"
                    : battery > 10
                      ? "text-os-warning"
                      : "text-os-danger"
                }`}
              />
              <span className="text-xs font-mono">{battery}%</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom-left corner - Welcome Message */}
      <div className="absolute bottom-24 left-6 pointer-events-none">
        <div className="glass-panel-strong rounded-os-lg px-6 py-4 max-w-xs">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-os-primary to-os-accent bg-clip-text text-transparent mb-2">
            JARVIS ZERO OS
          </h1>
          <p className="text-sm text-gray-400">
            Welcome back. Your workspace is ready.
          </p>
        </div>
      </div>

      {/* Floating elements - animated but GPU-accelerated with will-change */}
      <div
        className="absolute top-1/4 left-1/4 w-72 h-72 bg-os-primary opacity-5 rounded-full blur-3xl animate-float"
        style={{ willChange: "transform" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-os-accent opacity-5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s", willChange: "transform" }}
      />
    </div>
  );
}

export const Desktop = memo(DesktopComponent);
