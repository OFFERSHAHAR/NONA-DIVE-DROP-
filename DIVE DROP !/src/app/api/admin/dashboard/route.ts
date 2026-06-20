import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin/middleware';
import { DashboardStats } from '@/types/dashboard';

// Dashboard stats API endpoint - Admin only
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    // In production, replace these with actual database queries
    // For now, using mock data that matches your types

    const dashboardStats: DashboardStats = {
      admins: {
        total: 12,
        active: 9,
        roles: 7,
        recentActions: 47,
        actionsToday: 23,
        lastActivityTime: new Date().toISOString(),
      },
      shuttles: {
        total: 11,
        active: 8,
        totalCapacity: 178,
        totalBooked: 112,
        occupancyRate: Math.round((112 / 178) * 100),
        upcomingSchedules: 14,
        pendingBookings: 3,
      },
      diveSites: {
        total: 23,
        published: 19,
        featured: 5,
        totalImages: 156,
        pendingModeration: 4,
        pendingImages: 2,
        recentUpdate: new Date().toISOString(),
      },
      systemHealth: {
        apiStatus: 'operational',
        dbStatus: 'connected',
        lastSync: new Date().toISOString(),
        dataFreshness: 'fresh',
      },
      recentActivities: [
        {
          id: '1',
          action: 'Dive site published',
          resource: 'Coral Reef Paradise',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          user: 'Admin User',
          status: 'success',
        },
        {
          id: '2',
          action: 'Shuttle booking confirmed',
          resource: 'SH-001 to Eilat',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          user: 'Manager User',
          status: 'success',
        },
        {
          id: '3',
          action: 'Image moderation',
          resource: 'Reef photo #42',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          user: 'Moderator User',
          status: 'success',
        },
        {
          id: '4',
          action: 'Admin role updated',
          resource: 'User John Doe',
          timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
          user: 'Super Admin',
          status: 'success',
        },
      ],
    };

    return NextResponse.json(dashboardStats, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

// Optional: Add WebSocket support for real-time updates
export const dynamic = 'force-dynamic';
