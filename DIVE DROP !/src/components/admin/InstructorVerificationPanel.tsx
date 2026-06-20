'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Certification {
  id: string;
  provider_id: string;
  certification_type: string;
  certification_number: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string;
  verification_status: string;
  document_url: string;
  created_at: string;
  service_providers?: { business_name: string };
}

interface Insurance {
  id: string;
  provider_id: string;
  insurance_provider: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount_shekel: number;
  expiry_date: string;
  verification_status: string;
  document_url: string;
  created_at: string;
  service_providers?: { business_name: string };
}

interface VerificationPending {
  certifications: Certification[];
  insurance: Insurance[];
}

const CERTIFICATION_TYPES = {
  AIDA: 'International Association for Development of Apnea',
  IANTD: 'International Association of Nitrox and Technical Divers',
  PADI: 'Professional Association of Diving Instructors',
  SSI: 'Scuba Schools International',
  CMAS: 'Confédération Mondiale des Activités Subaquatiques',
  AACR: 'Association of Canadian Underwater Professionals',
};

export function InstructorVerificationPanel() {
  const [pending, setPending] = useState<VerificationPending>({
    certifications: [],
    insurance: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'certifications' | 'insurance'>('certifications');
  const [selectedItem, setSelectedItem] = useState<Certification | Insurance | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const response = await fetch('/api/admin/instructor-verification', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPending(data.pending || { certifications: [], insurance: [] });
      }
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const isCertification = 'certification_type' in selectedItem;
      const response = await fetch('/api/admin/instructor-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          verification_type: isCertification ? 'certification' : 'insurance',
          certification_id: isCertification ? selectedItem.id : undefined,
          insurance_id: !isCertification ? selectedItem.id : undefined,
          notes: action === 'reject' ? notes : undefined,
        }),
      });

      if (response.ok) {
        setSelectedItem(null);
        setNotes('');
        await fetchPending();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error processing action:', error);
      alert('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (reason: string) => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const isCertification = 'certification_type' in selectedItem;
      const response = await fetch('/api/admin/instructor-verification/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verification_type: isCertification ? 'certification' : 'insurance',
          certification_id: isCertification ? selectedItem.id : undefined,
          insurance_id: !isCertification ? selectedItem.id : undefined,
          reason,
        }),
      });

      if (response.ok) {
        setSelectedItem(null);
        await fetchPending();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error revoking:', error);
      alert('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'revoked':
        return <Badge className="bg-red-700">Revoked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getExpiryWarning = (expiryDate: string) => {
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return <Badge className="bg-red-600">EXPIRED</Badge>;
    } else if (days < 30) {
      return <Badge className="bg-orange-500">Expires in {days} days</Badge>;
    }
    return null;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const certificationCount = pending.certifications?.length || 0;
  const insuranceCount = pending.insurance?.length || 0;
  const items = activeTab === 'certifications' ? pending.certifications : pending.insurance;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Instructor Verification</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Pending Certifications</div>
          <div className="text-3xl font-bold text-yellow-600">{certificationCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Pending Insurance</div>
          <div className="text-3xl font-bold text-yellow-600">{insuranceCount}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('certifications')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'certifications'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Certifications ({certificationCount})
        </button>
        <button
          onClick={() => setActiveTab('insurance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'insurance'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Insurance ({insuranceCount})
        </button>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No pending {activeTab === 'certifications' ? 'certifications' : 'insurance'} to review
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer p-4 transition-all ${
                selectedItem?.id === item.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {item.service_providers?.business_name || 'Unknown Provider'}
                    </h3>
                    {getStatusBadge(item.verification_status)}
                  </div>

                  {'certification_type' in item ? (
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Type:</span>{' '}
                        {CERTIFICATION_TYPES[item.certification_type as keyof typeof CERTIFICATION_TYPES] ||
                          item.certification_type}
                      </p>
                      <p>
                        <span className="font-medium">Number:</span> {item.certification_number}
                      </p>
                      <p>
                        <span className="font-medium">Organization:</span> {item.issuing_organization}
                      </p>
                      <div className="flex gap-4 pt-1">
                        <span>
                          <span className="font-medium">Issued:</span> {item.issue_date}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">Expires:</span> {item.expiry_date}
                          {getExpiryWarning(item.expiry_date)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Provider:</span> {item.insurance_provider}
                      </p>
                      <p>
                        <span className="font-medium">Policy #:</span> {item.policy_number}
                      </p>
                      <p>
                        <span className="font-medium">Coverage:</span> {item.coverage_type}
                        {item.coverage_amount_shekel && ` (₪${item.coverage_amount_shekel})`}
                      </p>
                      <div className="flex gap-4 pt-1">
                        <span>
                          <span className="font-medium">Expires:</span> {item.expiry_date}
                          {getExpiryWarning(item.expiry_date)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Submitted: {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                {item.document_url && (
                  <a
                    href={item.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-blue-600 hover:underline"
                  >
                    View Document
                  </a>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Action Panel */}
      {selectedItem && (
        <Card className="fixed bottom-0 right-0 top-0 w-96 overflow-y-auto border-l bg-gray-50 p-6 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Review</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 rounded-lg bg-white p-3">
              {'certification_type' in selectedItem ? (
                <>
                  <p>
                    <span className="font-medium">Type:</span>{' '}
                    {CERTIFICATION_TYPES[
                      selectedItem.certification_type as keyof typeof CERTIFICATION_TYPES
                    ] || selectedItem.certification_type}
                  </p>
                  <p>
                    <span className="font-medium">Number:</span> {selectedItem.certification_number}
                  </p>
                  <p>
                    <span className="font-medium">Organization:</span>{' '}
                    {selectedItem.issuing_organization}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="font-medium">Provider:</span> {selectedItem.insurance_provider}
                  </p>
                  <p>
                    <span className="font-medium">Policy #:</span> {selectedItem.policy_number}
                  </p>
                  <p>
                    <span className="font-medium">Coverage:</span> {selectedItem.coverage_type}
                  </p>
                </>
              )}
              <p>
                <span className="font-medium">Expires:</span> {selectedItem.expiry_date}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for rejection or reference..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <Button
                onClick={() => handleAction('approve')}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={() => handleAction('reject')}
                disabled={processing}
                variant="destructive"
                className="w-full"
              >
                {processing ? 'Processing...' : 'Reject'}
              </Button>
              {selectedItem.verification_status === 'approved' && (
                <Button
                  onClick={() => {
                    const reason = prompt('Enter reason for revocation:');
                    if (reason) {
                      handleRevoke(reason);
                    }
                  }}
                  disabled={processing}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  Revoke
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
