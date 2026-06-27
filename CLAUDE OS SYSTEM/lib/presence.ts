import { createBrowserClient } from "./auth";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceState {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen: string;
  activeApp?: string;
  currentPage?: string;
  updatedAt: string;
}

export interface PresenceListener {
  onPresenceChange?: (state: PresenceState[]) => void;
  onUserOnline?: (user: PresenceState) => void;
  onUserOffline?: (user: PresenceState) => void;
}

class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private presenceStates: Map<string, PresenceState> = new Map();
  private listeners: Set<PresenceListener> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize presence tracking
   */
  async init(userId: string, username: string) {
    this.userId = userId;
    const supabase = createBrowserClient();

    // Create presence channel
    this.channel = supabase.channel(`presence:${userId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    // Subscribe to presence changes
    this.channel
      .on("presence", { event: "sync" }, () => {
        this.handleSync();
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        this.handleJoin(newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        this.handleLeave(leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Update presence immediately
          await this.updatePresence(username);

          // Update presence every 30 seconds
          this.updateInterval = setInterval(() => {
            this.updatePresence(username);
          }, 30000);
        }
      });
  }

  /**
   * Update presence state
   */
  async updatePresence(username: string, activeApp?: string, currentPage?: string) {
    if (!this.channel || !this.userId) return;

    const presenceState: PresenceState = {
      userId: this.userId,
      username,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      activeApp,
      currentPage,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await this.channel.track(presenceState);

    if (error) {
      console.error("Failed to update presence:", error);
    }

    this.presenceStates.set(this.userId, presenceState);
    this.notifyListeners();
  }

  /**
   * Handle presence sync
   */
  private handleSync() {
    if (!this.channel) return;

    const state = this.channel.presenceState();

    // Clear and rebuild presence states
    this.presenceStates.clear();

    Object.entries(state).forEach(([key, presences]) => {
      if (Array.isArray(presences) && presences.length > 0) {
        const presence = presences[0] as PresenceState;
        this.presenceStates.set(key, presence);
      }
    });

    this.notifyListeners();
  }

  /**
   * Handle user join
   */
  private handleJoin(newPresences: PresenceState[]) {
    newPresences.forEach((presence) => {
      this.presenceStates.set(presence.userId, presence);
      this.listeners.forEach((listener) => {
        listener.onUserOnline?.(presence);
      });
    });

    this.notifyListeners();
  }

  /**
   * Handle user leave
   */
  private handleLeave(leftPresences: PresenceState[]) {
    leftPresences.forEach((presence) => {
      this.presenceStates.delete(presence.userId);
      this.listeners.forEach((listener) => {
        listener.onUserOffline?.(presence);
      });
    });

    this.notifyListeners();
  }

  /**
   * Get all presence states
   */
  getPresenceStates(): PresenceState[] {
    return Array.from(this.presenceStates.values());
  }

  /**
   * Get specific user presence
   */
  getUserPresence(userId: string): PresenceState | undefined {
    return this.presenceStates.get(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): PresenceState[] {
    return Array.from(this.presenceStates.values()).filter((p) => p.isOnline);
  }

  /**
   * Subscribe to presence changes
   */
  subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const presenceArray = Array.from(this.presenceStates.values());
    this.listeners.forEach((listener) => {
      listener.onPresenceChange?.(presenceArray);
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.listeners.clear();
    this.presenceStates.clear();
  }
}

// Singleton instance
let instance: PresenceManager | null = null;

export function getPresenceManager(): PresenceManager {
  if (!instance) {
    instance = new PresenceManager();
  }
  return instance;
}

// Export convenience hooks for React
export async function initPresence(userId: string, username: string) {
  const manager = getPresenceManager();
  await manager.init(userId, username);
}

export function usePresence(listener: PresenceListener) {
  const manager = getPresenceManager();
  return manager.subscribe(listener);
}

export function getOnlineUsers(): PresenceState[] {
  const manager = getPresenceManager();
  return manager.getOnlineUsers();
}

export function getUserPresence(userId: string): PresenceState | undefined {
  const manager = getPresenceManager();
  return manager.getUserPresence(userId);
}
