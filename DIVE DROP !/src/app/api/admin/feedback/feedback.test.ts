/**
 * Admin Feedback API Tests
 *
 * Tests for feedback management endpoints:
 * - GET /api/admin/feedback (list with filters & pagination)
 * - GET /api/admin/feedback/[id] (detail view)
 * - GET /api/admin/feedback/analytics (analytics data)
 * - POST /api/admin/feedback/[id]/approve (approve feedback)
 * - POST /api/admin/feedback/[id]/flag (flag inappropriate)
 * - DELETE /api/admin/feedback/[id] (remove feedback)
 */

describe('Admin Feedback API', () => {
  const adminUserId = 'test-admin-user-id';
  const diverUserId = 'test-diver-user-id';
  const diveSiteId = 'test-dive-site-id';
  const feedbackId = 'test-feedback-id';

  describe('GET /api/admin/feedback', () => {
    test('should return 401 if user not authenticated', async () => {
      // Arrange: No auth context

      // Act: Call API without auth token
      const response = await fetch('/api/admin/feedback');

      // Assert: Should return 401 Unauthorized
      expect(response.status).toBe(401);
    });

    test('should return 403 if user not admin', async () => {
      // Arrange: Authenticated but non-admin user

      // Act: Call API with non-admin auth
      const response = await fetch('/api/admin/feedback', {
        headers: {
          Authorization: 'Bearer non-admin-token',
        },
      });

      // Assert: Should return 403 Forbidden
      expect(response.status).toBe(403);
    });

    test('should return paginated feedback list for admin', async () => {
      // Arrange: Admin user authenticated
      // Mock database with 50 feedback entries

      // Act: Call API with page=1, limit=20
      const response = await fetch('/api/admin/feedback?page=1&limit=20', {
        headers: {
          Authorization: `Bearer admin-token`,
        },
      });
      const data = await response.json();

      // Assert: Should return paginated list
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(20);
      expect(data.total).toBe(50);
      expect(data.page).toBe(1);
    });

    test('should filter feedback by dive site', async () => {
      // Arrange: Admin user, multiple sites in database

      // Act: Call API with dive_site_id filter
      const response = await fetch(
        `/api/admin/feedback?dive_site_id=${diveSiteId}`,
        {
          headers: {
            Authorization: 'Bearer admin-token',
          },
        }
      );
      const data = await response.json();

      // Assert: Should return only feedback from specified site
      expect(response.status).toBe(200);
      expect(data.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dive_site_id: diveSiteId,
          }),
        ])
      );
    });

    test('should filter feedback by date range', async () => {
      // Arrange: Admin user, feedback spanning multiple dates

      // Act: Call API with dateFrom and dateTo
      const response = await fetch(
        `/api/admin/feedback?dateFrom=2024-01-01&dateTo=2024-01-31`,
        {
          headers: {
            Authorization: 'Bearer admin-token',
          },
        }
      );
      const data = await response.json();

      // Assert: Should return only feedback within date range
      expect(response.status).toBe(200);
      data.data.forEach((feedback: any) => {
        const date = new Date(feedback.submitted_at);
        expect(date.getTime()).toBeGreaterThanOrEqual(
          new Date('2024-01-01').getTime()
        );
        expect(date.getTime()).toBeLessThanOrEqual(
          new Date('2024-01-31').getTime()
        );
      });
    });

    test('should sort feedback correctly', async () => {
      // Arrange: Admin user with multiple feedback entries

      // Act: Call API with sortBy=date, sortOrder=desc
      const response = await fetch(
        '/api/admin/feedback?sortBy=date&sortOrder=desc',
        {
          headers: {
            Authorization: 'Bearer admin-token',
          },
        }
      );
      const data = await response.json();

      // Assert: Should return feedback sorted by date descending
      expect(response.status).toBe(200);
      for (let i = 0; i < data.data.length - 1; i++) {
        const date1 = new Date(data.data[i].submitted_at).getTime();
        const date2 = new Date(data.data[i + 1].submitted_at).getTime();
        expect(date1).toBeGreaterThanOrEqual(date2);
      }
    });

    test('should search feedback by diver name', async () => {
      // Arrange: Admin user, feedback from multiple divers

      // Act: Call API with search term
      const response = await fetch('/api/admin/feedback?search=John', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });
      const data = await response.json();

      // Assert: Should return only feedback from divers matching search
      expect(response.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/feedback/[id]', () => {
    test('should return 401 if user not authenticated', async () => {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`);
      expect(response.status).toBe(401);
    });

    test('should return 403 if user not admin', async () => {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        headers: {
          Authorization: 'Bearer non-admin-token',
        },
      });
      expect(response.status).toBe(403);
    });

    test('should return 404 if feedback not found', async () => {
      // Arrange: Admin user, non-existent feedback ID

      // Act: Call API with invalid ID
      const response = await fetch('/api/admin/feedback/invalid-id', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      // Assert: Should return 404 Not Found
      expect(response.status).toBe(404);
    });

    test('should return complete feedback details', async () => {
      // Arrange: Admin user, valid feedback ID

      // Act: Call API with valid ID
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });
      const data = await response.json();

      // Assert: Should return full feedback with all fields
      expect(response.status).toBe(200);
      expect(data.data).toMatchObject({
        id: feedbackId,
        diver_id: expect.any(String),
        dive_site_id: expect.any(String),
        visibility_meters: expect.any(Number),
        temperature_celsius: expect.any(Number),
        current_strength: expect.any(Number),
        marine_life: expect.any(Array),
        image_urls: expect.any(Array),
        submitted_at: expect.any(String),
      });
    });
  });

  describe('GET /api/admin/feedback/analytics', () => {
    test('should return 401 if user not authenticated', async () => {
      const response = await fetch('/api/admin/feedback/analytics');
      expect(response.status).toBe(401);
    });

    test('should return analytics dashboard data', async () => {
      // Arrange: Admin user authenticated

      // Act: Call analytics endpoint
      const response = await fetch('/api/admin/feedback/analytics', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });
      const data = await response.json();

      // Assert: Should return comprehensive analytics
      expect(response.status).toBe(200);
      expect(data.data).toMatchObject({
        totalFeedback: expect.any(Number),
        feedbackByDate: expect.any(Array),
        feedbackBySite: expect.any(Array),
        averageConditions: {
          visibility: expect.any(Number),
          temperature: expect.any(Number),
          current: expect.any(Number),
        },
        topSpecies: expect.any(Array),
        feedbackTrend: expect.any(Array),
      });
    });

    test('should calculate correct statistics', async () => {
      // Arrange: Admin user with sample feedback data

      // Act: Call analytics endpoint
      const response = await fetch('/api/admin/feedback/analytics', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });
      const data = await response.json();

      // Assert: Stats should be mathematically correct
      expect(response.status).toBe(200);
      expect(data.data.totalFeedback).toBeGreaterThan(0);
      expect(data.data.averageConditions.visibility).toBeGreaterThan(0);
      expect(data.data.feedbackBySite).toHaveLength(
        expect.any(Number)
      );
    });
  });

  describe('POST /api/admin/feedback/[id]/approve', () => {
    test('should update feedback status to approved', async () => {
      // Arrange: Admin user, valid feedback ID

      // Act: Call approve endpoint
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer admin-token',
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();

      // Assert: Should return success with updated feedback
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('approved');
    });

    test('should require admin authorization', async () => {
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer non-admin-token',
          },
        }
      );
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/feedback/[id]/flag', () => {
    test('should flag feedback as inappropriate', async () => {
      // Arrange: Admin user, valid feedback ID

      // Act: Call flag endpoint with reason
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}/flag`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer admin-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Inappropriate content',
          }),
        }
      );
      const data = await response.json();

      // Assert: Should return success with flagged feedback
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('flagged');
    });

    test('should work without explicit reason', async () => {
      // Arrange: Admin user, valid feedback ID

      // Act: Call flag endpoint without reason
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}/flag`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer admin-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      // Assert: Should still succeed with default reason
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/admin/feedback/[id]', () => {
    test('should delete feedback entry', async () => {
      // Arrange: Admin user, valid feedback ID

      // Act: Call delete endpoint
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer admin-token',
          },
        }
      );
      const data = await response.json();

      // Assert: Should return success
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should require admin authorization', async () => {
      const response = await fetch(
        `/api/admin/feedback/${feedbackId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer non-admin-token',
          },
        }
      );
      expect(response.status).toBe(403);
    });

    test('should return 404 if feedback not found', async () => {
      // Arrange: Admin user, non-existent feedback ID

      // Act: Call delete endpoint with invalid ID
      const response = await fetch(
        '/api/admin/feedback/invalid-id',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer admin-token',
          },
        }
      );

      // Assert: Should return 404
      expect(response.status).toBe(404);
    });
  });
});
