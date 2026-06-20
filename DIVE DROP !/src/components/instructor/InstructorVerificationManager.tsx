'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Certification {
  id: string;
  certification_type: string;
  certification_number: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string;
  verification_status: string;
}

interface Insurance {
  id: string;
  insurance_provider: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount_shekel: number;
  expiry_date: string;
  verification_status: string;
}

interface VerificationStatus {
  is_verified: boolean;
  verification_status: string;
  summary: {
    active_certifications: number;
    pending_certifications: number;
    has_valid_insurance: boolean;
    insurance_expires_in_days: number | null;
    insurance_expiry_date: string | null;
  };
  alerts: {
    expiring_insurance: Insurance[];
  };
}

const CERTIFICATION_TYPES = [
  { value: 'AIDA', label: 'AIDA - International Association for Development of Apnea' },
  { value: 'IANTD', label: 'IANTD - International Association of Nitrox and Technical Divers' },
  { value: 'PADI', label: 'PADI - Professional Association of Diving Instructors' },
  { value: 'SSI', label: 'SSI - Scuba Schools International' },
  { value: 'CMAS', label: 'CMAS - Confédération Mondiale des Activités Subaquatiques' },
  { value: 'AACR', label: 'AACR - Association of Canadian Underwater Professionals' },
  { value: 'OTHER', label: 'Other' },
];

export function InstructorVerificationManager({ providerId }: { providerId: string }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);

  // Certification form
  const [certForm, setCertForm] = useState({
    certification_type: '',
    certification_number: '',
    issuing_organization: '',
    issue_date: '',
    expiry_date: '',
    document_file: null as File | null,
  });
  const [certUploading, setCertUploading] = useState(false);

  // Insurance form
  const [insForm, setInsForm] = useState({
    insurance_provider: '',
    policy_number: '',
    coverage_type: '',
    coverage_amount_shekel: '',
    issue_date: '',
    expiry_date: '',
    document_file: null as File | null,
  });
  const [insUploading, setInsUploading] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'insurance'>('overview');

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const response = await fetch(`/api/instructor-verification/status?provider_id=${providerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setCertifications(data.certifications?.filter(c => c !== null) || []);
        setInsurance(data.alerts?.expiring_insurance || []);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertForm({ ...certForm, document_file: file });
    }
  };

  const handleInsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInsForm({ ...insForm, document_file: file });
    }
  };

  const uploadCertification = async () => {
    if (!certForm.certification_type || !certForm.certification_number) {
      alert('Please fill required fields');
      return;
    }

    setCertUploading(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) throw new Error('No auth token');

      let documentBase64 = '';
      let documentType: 'image' | 'pdf' = 'image';

      if (certForm.document_file) {
        documentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(certForm.document_file!);
        });
        documentType = certForm.document_file.type === 'application/pdf' ? 'pdf' : 'image';
      }

      const response = await fetch('/api/instructor-verification/upload-credential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider_id: providerId,
          ...certForm,
          document_file: documentBase64,
          document_type: documentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setCertForm({
          certification_type: '',
          certification_number: '',
          issuing_organization: '',
          issue_date: '',
          expiry_date: '',
          document_file: null,
        });
        await fetchStatus();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading credential:', error);
      alert('Failed to upload credential');
    } finally {
      setCertUploading(false);
    }
  };

  const uploadInsurance = async () => {
    if (!insForm.insurance_provider || !insForm.policy_number) {
      alert('Please fill required fields');
      return;
    }

    setInsUploading(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) throw new Error('No auth token');

      let documentBase64 = '';
      let documentType: 'image' | 'pdf' = 'image';

      if (insForm.document_file) {
        documentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(insForm.document_file!);
        });
        documentType = insForm.document_file.type === 'application/pdf' ? 'pdf' : 'image';
      }

      const response = await fetch('/api/instructor-verification/upload-insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider_id: providerId,
          ...insForm,
          document_file: documentBase64,
          document_type: documentType,
          coverage_amount_shekel: insForm.coverage_amount_shekel ? parseFloat(insForm.coverage_amount_shekel) : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setInsForm({
          insurance_provider: '',
          policy_number: '',
          coverage_type: '',
          coverage_amount_shekel: '',
          issue_date: '',
          expiry_date: '',
          document_file: null,
        });
        await fetchStatus();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading insurance:', error);
      alert('Failed to upload insurance');
    } finally {
      setInsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50';
      case 'pending_verification':
        return 'text-yellow-600 bg-yellow-50';
      case 'no_valid_certification':
      case 'no_valid_insurance':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading verification status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className={`p-6 ${getStatusColor(status?.verification_status || 'pending')}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Verification Status</h2>
            <Badge className={status?.is_verified ? 'bg-green-600' : 'bg-yellow-600'}>
              {status?.is_verified ? 'VERIFIED' : 'INCOMPLETE'}
            </Badge>
          </div>
          <p className="text-sm">
            {status?.verification_status === 'verified'
              ? 'Your credentials and insurance are verified and up to date.'
              : status?.verification_status === 'pending_verification'
              ? 'Your submitted documents are pending admin review.'
              : status?.verification_status === 'no_valid_certification'
              ? 'Please upload a valid certification to teach.'
              : 'Please upload valid insurance proof.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Active Certifications:</span> {status?.summary.active_certifications}
            </div>
            <div>
              <span className="font-medium">Insurance Valid:</span>{' '}
              {status?.summary.has_valid_insurance ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {status?.alerts.expiring_insurance.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 p-4">
          <div className="font-semibold text-orange-900">Warning: Insurance Expiring Soon</div>
          {status.alerts.expiring_insurance.map((ins) => (
            <div key={ins.id} className="mt-2 text-sm text-orange-800">
              {ins.insurance_provider} - Policy #{ins.policy_number} expires on {ins.expiry_date}
            </div>
          ))}
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'certificates'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Certifications
        </button>
        <button
          onClick={() => setActiveTab('insurance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'insurance'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Insurance
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button onClick={() => setActiveTab('certificates')} variant="outline" className="w-full">
                Upload Certification
              </Button>
              <Button onClick={() => setActiveTab('insurance')} variant="outline" className="w-full">
                Upload Insurance
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Recent Certifications</h3>
            {certifications.length === 0 ? (
              <p className="text-gray-500">No certifications uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {certifications.slice(0, 3).map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm">{cert.certification_type} #{cert.certification_number}</span>
                    {getStatusBadge(cert.verification_status)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Upload New Certification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Certification Type *</label>
                <Select
                  value={certForm.certification_type}
                  onChange={(e) => setCertForm({ ...certForm, certification_type: e.target.value })}
                >
                  <option value="">Select certification type</option>
                  {CERTIFICATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium">Certification Number *</label>
                <Input
                  value={certForm.certification_number}
                  onChange={(e) => setCertForm({ ...certForm, certification_number: e.target.value })}
                  placeholder="e.g., AIDA-123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Issuing Organization</label>
                <Input
                  value={certForm.issuing_organization}
                  onChange={(e) => setCertForm({ ...certForm, issuing_organization: e.target.value })}
                  placeholder="e.g., AIDA International"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Issue Date *</label>
                  <Input
                    type="date"
                    value={certForm.issue_date}
                    onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Expiry Date *</label>
                  <Input
                    type="date"
                    value={certForm.expiry_date}
                    onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Document (PDF or Image)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleCertFileChange}
                  className="mt-1"
                />
                {certForm.document_file && (
                  <p className="mt-1 text-sm text-gray-600">Selected: {certForm.document_file.name}</p>
                )}
              </div>

              <Button
                onClick={uploadCertification}
                disabled={certUploading}
                className="w-full"
              >
                {certUploading ? 'Uploading...' : 'Upload Certification'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Your Certifications</h3>
            {certifications.length === 0 ? (
              <p className="text-gray-500">No certifications uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div key={cert.id} className="flex items-start justify-between border-b pb-3">
                    <div className="space-y-1">
                      <p className="font-medium">{cert.certification_type}</p>
                      <p className="text-sm text-gray-600">Number: {cert.certification_number}</p>
                      <p className="text-sm text-gray-600">Expires: {cert.expiry_date}</p>
                    </div>
                    {getStatusBadge(cert.verification_status)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'insurance' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Upload Insurance Proof</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Insurance Provider *</label>
                <Input
                  value={insForm.insurance_provider}
                  onChange={(e) => setInsForm({ ...insForm, insurance_provider: e.target.value })}
                  placeholder="e.g., Allianz, AIG"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Policy Number *</label>
                <Input
                  value={insForm.policy_number}
                  onChange={(e) => setInsForm({ ...insForm, policy_number: e.target.value })}
                  placeholder="e.g., POL-2024-123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Coverage Type</label>
                <Input
                  value={insForm.coverage_type}
                  onChange={(e) => setInsForm({ ...insForm, coverage_type: e.target.value })}
                  placeholder="e.g., Professional Liability"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Coverage Amount (ILS)</label>
                <Input
                  type="number"
                  value={insForm.coverage_amount_shekel}
                  onChange={(e) => setInsForm({ ...insForm, coverage_amount_shekel: e.target.value })}
                  placeholder="e.g., 500000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Issue Date *</label>
                  <Input
                    type="date"
                    value={insForm.issue_date}
                    onChange={(e) => setInsForm({ ...insForm, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Expiry Date *</label>
                  <Input
                    type="date"
                    value={insForm.expiry_date}
                    onChange={(e) => setInsForm({ ...insForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Document (PDF or Image)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleInsFileChange}
                  className="mt-1"
                />
                {insForm.document_file && (
                  <p className="mt-1 text-sm text-gray-600">Selected: {insForm.document_file.name}</p>
                )}
              </div>

              <Button
                onClick={uploadInsurance}
                disabled={insUploading}
                className="w-full"
              >
                {insUploading ? 'Uploading...' : 'Upload Insurance'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Insurance History</h3>
            {insurance.length === 0 ? (
              <p className="text-gray-500">No insurance uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {insurance.map((ins) => (
                  <div key={ins.id} className="flex items-start justify-between border-b pb-3">
                    <div className="space-y-1">
                      <p className="font-medium">{ins.insurance_provider}</p>
                      <p className="text-sm text-gray-600">Policy: {ins.policy_number}</p>
                      <p className="text-sm text-gray-600">Expires: {ins.expiry_date}</p>
                    </div>
                    {getStatusBadge(ins.verification_status)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
