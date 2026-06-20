'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { cn } from '@/utils/cn';

interface ModerationProvider {
  id: string;
  business_name: string;
  provider_type: string;
  status: 'pending' | 'approved' | 'suspended' | 'archived';
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  email: string;
  phone: string;
}

interface ProviderModerationPanelProps {
  isRTL?: boolean;
}

export function ProviderModerationPanel({ isRTL = false }: ProviderModerationPanelProps) {
  const [providers, setProviders] = useState<ModerationProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/service-providers/moderation');
      if (!response.ok) throw new Error('Failed to fetch providers');
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (providerId: string) => {
    try {
      setActionInProgress(true);
      const response = await fetch(`/api/admin/service-providers/${providerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Approved by admin' }),
      });
      if (!response.ok) throw new Error('Failed to approve provider');
      await fetchProviders();
      setSelectedProviderId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve provider');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (providerId: string, reason: string) => {
    try {
      setActionInProgress(true);
      const response = await fetch(`/api/admin/service-providers/${providerId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to reject provider');
      await fetchProviders();
      setSelectedProviderId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject provider');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSuspend = async (providerId: string, reason: string, durationDays: number) => {
    try {
      setActionInProgress(true);
      const response = await fetch(`/api/admin/service-providers/${providerId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, duration_days: durationDays }),
      });
      if (!response.ok) throw new Error('Failed to suspend provider');
      await fetchProviders();
      setSelectedProviderId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend provider');
    } finally {
      setActionInProgress(false);
    }
  };

  const pendingProviders = providers.filter((p) => p.status === 'pending');
  const approvedProviders = providers.filter((p) => p.status === 'approved');
  const suspendedProviders = providers.filter((p) => p.status === 'suspended');

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', isRTL && 'text-right')}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {isRTL ? 'פנל אישור ספקי שירות' : 'Provider Moderation Panel'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isRTL
            ? 'אישור וניהול ספקי שירות חדשים'
            : 'Approve and manage new service providers'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{pendingProviders.length}</div>
          <div className="text-sm text-gray-600">
            {isRTL ? 'בהמתנה' : 'Pending'}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{approvedProviders.length}</div>
          <div className="text-sm text-gray-600">
            {isRTL ? 'אושרו' : 'Approved'}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{suspendedProviders.length}</div>
          <div className="text-sm text-gray-600">
            {isRTL ? 'מושהים' : 'Suspended'}
          </div>
        </Card>
      </div>

      {/* Pending Providers */}
      {pendingProviders.length > 0 && (
        <Card className="p-6 border-2 border-yellow-200 bg-yellow-50">
          <h2 className="text-xl font-bold mb-4">
            {isRTL ? 'בהמתנה לאישור' : 'Pending Approval'}
          </h2>
          <div className="space-y-3">
            {pendingProviders.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  'p-4 bg-white rounded-lg border border-yellow-300 cursor-pointer hover:shadow-md transition',
                  selectedProviderId === provider.id && 'ring-2 ring-blue-500'
                )}
                onClick={() => setSelectedProviderId(provider.id)}
              >
                <div className={cn('flex justify-between items-start', isRTL && 'flex-row-reverse')}>
                  <div>
                    <h3 className="font-bold">{provider.business_name}</h3>
                    <p className="text-sm text-gray-600">{provider.provider_type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isRTL ? 'יצירה: ' : 'Created: '}
                      {new Date(provider.created_at).toLocaleDateString(
                        isRTL ? 'he-IL' : 'en-US'
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">📧 {provider.email}</p>
                    <p className="text-sm">📱 {provider.phone}</p>
                  </div>
                </div>

                {/* Selected Provider Actions */}
                {selectedProviderId === provider.id && (
                  <div className={cn('mt-4 pt-4 border-t space-y-3', isRTL && 'text-right')}>
                    <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(provider.id);
                        }}
                        disabled={actionInProgress}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isRTL ? 'אישור' : 'Approve'}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(provider.id, 'Rejected by admin');
                        }}
                        disabled={actionInProgress}
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        {isRTL ? 'דחייה' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Approved Providers */}
      {approvedProviders.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isRTL ? 'ספקים מאושרים' : 'Approved Providers'}
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            {approvedProviders.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  'p-3 bg-green-50 rounded border border-green-200 flex justify-between',
                  isRTL && 'flex-row-reverse'
                )}
              >
                <span className="font-semibold">{provider.business_name}</span>
                <span>
                  ★ {provider.average_rating.toFixed(1)} ({provider.total_reviews})
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Providers */}
      {providers.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          {isRTL ? 'אין ספקי שירות לניהול' : 'No service providers to manage'}
        </Card>
      )}
    </div>
  );
}
