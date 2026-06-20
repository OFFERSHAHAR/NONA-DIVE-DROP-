import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface VerificationStatus {
  is_verified: boolean;
  has_valid_certification: boolean;
  has_valid_insurance: boolean;
  active_certifications_count: number;
  insurance_expires_in_days: number | null;
  insurance_expiry_date: string | null;
}

/**
 * Check instructor verification status using the stored function
 */
export async function checkInstructorVerification(providerId: string): Promise<VerificationStatus | null> {
  try {
    const { data, error } = await supabase.rpc('check_instructor_verification_status', {
      p_provider_id: providerId,
    });

    if (error) {
      console.error('Error checking verification:', error);
      return null;
    }

    return data as VerificationStatus;
  } catch (error) {
    console.error('Error in checkInstructorVerification:', error);
    return null;
  }
}

/**
 * Validate document file
 */
export function validateDocument(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be PDF or image (JPEG, PNG, WebP)' };
  }

  return { valid: true };
}

/**
 * Validate certification data
 */
export function validateCertification(data: {
  certification_type: string;
  certification_number: string;
  issue_date: string;
  expiry_date: string;
}): { valid: boolean; error?: string } {
  if (!data.certification_type) {
    return { valid: false, error: 'Certification type is required' };
  }

  if (!data.certification_number) {
    return { valid: false, error: 'Certification number is required' };
  }

  if (!data.issue_date) {
    return { valid: false, error: 'Issue date is required' };
  }

  if (!data.expiry_date) {
    return { valid: false, error: 'Expiry date is required' };
  }

  const issueDate = new Date(data.issue_date);
  const expiryDate = new Date(data.expiry_date);
  const today = new Date();

  if (issueDate > today) {
    return { valid: false, error: 'Issue date cannot be in the future' };
  }

  if (expiryDate <= issueDate) {
    return { valid: false, error: 'Expiry date must be after issue date' };
  }

  if (expiryDate < today) {
    return { valid: false, error: 'Certification has already expired' };
  }

  return { valid: true };
}

/**
 * Validate insurance data
 */
export function validateInsurance(data: {
  insurance_provider: string;
  policy_number: string;
  issue_date: string;
  expiry_date: string;
  coverage_amount_shekel?: number;
}): { valid: boolean; error?: string } {
  if (!data.insurance_provider) {
    return { valid: false, error: 'Insurance provider is required' };
  }

  if (!data.policy_number) {
    return { valid: false, error: 'Policy number is required' };
  }

  if (!data.issue_date) {
    return { valid: false, error: 'Issue date is required' };
  }

  if (!data.expiry_date) {
    return { valid: false, error: 'Expiry date is required' };
  }

  const issueDate = new Date(data.issue_date);
  const expiryDate = new Date(data.expiry_date);
  const today = new Date();

  if (issueDate > today) {
    return { valid: false, error: 'Issue date cannot be in the future' };
  }

  if (expiryDate <= issueDate) {
    return { valid: false, error: 'Expiry date must be after issue date' };
  }

  if (expiryDate < today) {
    return { valid: false, error: 'Insurance has already expired' };
  }

  if (data.coverage_amount_shekel && data.coverage_amount_shekel <= 0) {
    return { valid: false, error: 'Coverage amount must be greater than 0' };
  }

  return { valid: true };
}

/**
 * Get days until date
 */
export function getDaysUntil(date: string): number {
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if instructor can teach
 */
export function canInstructorTeach(status: VerificationStatus): boolean {
  return status.is_verified && status.has_valid_certification && status.has_valid_insurance;
}

/**
 * Get verification status message
 */
export function getVerificationMessage(status: VerificationStatus): string {
  if (!status.has_valid_certification) {
    return 'Please upload a valid certification to teach';
  }

  if (!status.has_valid_insurance) {
    return 'Please upload valid insurance to teach';
  }

  if (status.insurance_expires_in_days && status.insurance_expires_in_days < 30) {
    return `Your insurance expires in ${status.insurance_expires_in_days} days`;
  }

  return 'All verifications are up to date';
}

/**
 * Format certification type for display
 */
export const CERTIFICATION_DISPLAY_NAMES: Record<string, string> = {
  AIDA: 'AIDA - International Association for Development of Apnea',
  IANTD: 'IANTD - International Association of Nitrox and Technical Divers',
  PADI: 'PADI - Professional Association of Diving Instructors',
  SSI: 'SSI - Scuba Schools International',
  CMAS: 'CMAS - Confédération Mondiale des Activités Subaquatiques',
  AACR: 'AACR - Association of Canadian Underwater Professionals',
};

/**
 * Verify document integrity
 */
export async function verifyDocumentIntegrity(
  url: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return { valid: false, error: 'Document URL is invalid' };
    }

    const contentType = response.headers.get('content-type');
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (!contentType || !allowedTypes.some((type) => contentType.includes(type))) {
      return { valid: false, error: 'Invalid document type' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Could not verify document' };
  }
}
