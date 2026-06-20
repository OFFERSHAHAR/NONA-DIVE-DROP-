/**
 * Session Management Module
 * Handles secure session tracking and invalidation
 *
 * Features:
 * - Session tracking per user
 * - Multi-device session management
 * - Logout event emission
 * - Session cleanup
 * - Concurrent session limits
 */

import { cookies } from 'next/headers';

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    os: string;
  };
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  isActive: boolean;
  revokedAt?: number;
}

/**
 * In-memory session store
 * In production, use database or Redis
 */
class SessionStore {
  private sessions = new Map<string, SessionMetadata>();
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds

  /**
   * Create new session
   */
  createSession(
    sessionId: string,
    userId: string,
    deviceInfo: SessionMetadata['deviceInfo'],
    expiresInSeconds: number = 3600
  ): SessionMetadata {
    const now = Date.now();
    const session: SessionMetadata = {
      sessionId,
      userId,
      deviceInfo,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + expiresInSeconds * 1000,
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    console.log(`[SESSION] Created session ${sessionId} for user ${userId}`);
    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): SessionMetadata | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionMetadata[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter(Boolean) as SessionMetadata[];
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.isActive) {
      session.lastActivityAt = Date.now();
    }
  }

  /**
   * Revoke session (logout)
   */
  revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.revokedAt = Date.now();
      console.log(`[SESSION] Revoked session ${sessionId}`);
    }
  }

  /**
   * Revoke all sessions for a user
   */
  revokeUserSessions(userId: string): number {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let revokedCount = 0;

    sessionIds.forEach(sessionId => {
      this.revokeSession(sessionId);
      revokedCount++;
    });

    console.log(`[SESSION] Revoked ${revokedCount} sessions for user ${userId}`);
    return revokedCount;
  }

  /**
   * Revoke all except current session (other devices logout)
   */
  revokeOtherSessions(userId: string, currentSessionId: string): number {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let revokedCount = 0;

    sessionIds.forEach(sessionId => {
      if (sessionId !== currentSessionId) {
        this.revokeSession(sessionId);
        revokedCount++;
      }
    });

    console.log(`[SESSION] Revoked ${revokedCount} other sessions for user ${userId}`);
    return revokedCount;
  }

  /**
   * Check if session is valid
   */
  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Check if active
    if (!session.isActive) {
      return false;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      session.isActive = false;
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt || (session.revokedAt && now > session.revokedAt + 86400000)) {
        this.sessions.delete(sessionId);

        // Remove from user sessions
        const sessionIds = this.userSessions.get(session.userId);
        if (sessionIds) {
          sessionIds.delete(sessionId);
        }

        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SESSION] Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }
}

// Global session store
const sessionStore = new SessionStore();

// Start periodic cleanup
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(() => {
    sessionStore.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // Every hour
}

/**
 * Extract device information from request
 */
export function extractDeviceInfo(userAgent: string, ip: string): SessionMetadata['deviceInfo'] {
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let browser = 'unknown';
  let os = 'unknown';

  // Simple device type detection
  if (/mobile|android|iphone|webos|blackberry|iemobile|opera mini/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk|kindle/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/windows|mac|linux/i.test(userAgent)) {
    deviceType = 'desktop';
  }

  // Simple browser detection
  if (/chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/edge/i.test(userAgent)) {
    browser = 'Edge';
  }

  // Simple OS detection
  if (/windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
  }

  return {
    userAgent,
    ipAddress: ip,
    deviceType,
    browser,
    os,
  };
}

/**
 * Create session and set secure cookie
 */
export async function createSession(
  userId: string,
  userAgent: string,
  ip: string
): Promise<{ sessionId: string; session: SessionMetadata }> {
  const sessionId = generateSessionId();
  const deviceInfo = extractDeviceInfo(userAgent, ip);

  const session = sessionStore.createSession(sessionId, userId, deviceInfo);

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  return { sessionId, session };
}

/**
 * Validate session
 */
export async function validateSession(sessionId: string): Promise<SessionMetadata | null> {
  const session = sessionStore.getSession(sessionId);

  if (!session || !sessionStore.isValidSession(sessionId)) {
    return null;
  }

  // Update activity
  sessionStore.updateSessionActivity(sessionId);

  return session;
}

/**
 * Logout: revoke current session
 */
export async function logout(sessionId: string): Promise<void> {
  sessionStore.revokeSession(sessionId);

  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete('session_id');

  console.log(`[SESSION] User logged out from session ${sessionId}`);
}

/**
 * Logout all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  const count = sessionStore.revokeUserSessions(userId);

  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete('session_id');

  console.log(`[SESSION] User ${userId} logged out from all ${count} sessions`);
}

/**
 * Logout other sessions (keep current)
 */
export async function logoutOtherSessions(userId: string, currentSessionId: string): Promise<void> {
  const count = sessionStore.revokeOtherSessions(userId, currentSessionId);
  console.log(`[SESSION] Revoked ${count} other sessions for user ${userId}`);
}

/**
 * Get user sessions
 */
export function getUserSessions(userId: string): SessionMetadata[] {
  return sessionStore.getUserSessions(userId);
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}`;
}

/**
 * Session activity logger
 * Emits events for audit logging
 */
export interface SessionEvent {
  type: 'login' | 'logout' | 'activity' | 'failed_login' | 'session_expired' | 'session_revoked';
  userId: string;
  sessionId?: string;
  timestamp: number;
  details: Record<string, unknown>;
}

const sessionEventListeners: Array<(event: SessionEvent) => void> = [];

export function onSessionEvent(listener: (event: SessionEvent) => void): void {
  sessionEventListeners.push(listener);
}

export function emitSessionEvent(event: SessionEvent): void {
  sessionEventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[SESSION EVENT] Listener error:', error);
    }
  });
}

export function unsubscribeSessionEvents(): void {
  sessionEventListeners.length = 0;
}
