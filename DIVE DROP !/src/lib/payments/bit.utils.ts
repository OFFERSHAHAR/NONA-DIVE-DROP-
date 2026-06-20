/**
 * Utility functions for Bit payment system
 */

import { calculateCommission, formatCurrency } from './bit.config';

/**
 * Format amount in cents to display string
 */
export function formatAmount(cents: number, currency: string = 'ILS'): string {
  return formatCurrency(cents, currency);
}

/**
 * Parse amount string to cents
 */
export function parseAmount(amountStr: string): number {
  // Remove currency symbol and whitespace
  const cleaned = amountStr
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '.');

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }

  return Math.round(parsed * 100);
}

/**
 * Calculate total cost with commission breakdown
 */
export function calculateTotalCost(
  basePriceCents: number
): {
  base: number;
  commission: number;
  total: number;
  commissionPercent: number;
} {
  const { commission } = calculateCommission(basePriceCents);

  return {
    base: basePriceCents,
    commission,
    total: basePriceCents + commission,
    commissionPercent: (commission / basePriceCents) * 100,
  };
}

/**
 * Calculate provider payout after commission
 */
export function calculateProviderPayout(
  bookingAmountCents: number
): {
  bookingAmount: number;
  commission: number;
  providerPayout: number;
  commission Percent: number;
} {
  const { commission, net } = calculateCommission(bookingAmountCents);

  return {
    bookingAmount: bookingAmountCents,
    commission,
    providerPayout: net,
    commissionPercent: (commission / bookingAmountCents) * 100,
  };
}

/**
 * Check if payment request has expired
 */
export function isPaymentRequestExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Get time remaining for payment
 */
export function getTimeRemaining(expiresAt: string): {
  minutes: number;
  seconds: number;
  display: string;
  expired: boolean;
} {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      minutes: 0,
      seconds: 0,
      display: 'Expired',
      expired: true,
    };
  }

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return {
    minutes,
    seconds,
    display: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    expired: false,
  };
}

/**
 * Format transaction type for display
 */
export function formatTransactionType(
  type: 'payment' | 'refund' | 'payout' | 'commission'
): string {
  const types: Record<string, string> = {
    payment: 'Payment',
    refund: 'Refund',
    payout: 'Payout',
    commission: 'Commission',
  };
  return types[type] || type;
}

/**
 * Format transaction status for display
 */
export function formatTransactionStatus(
  status: 'pending' | 'completed' | 'failed'
): {
  display: string;
  color: string;
  icon: string;
} {
  const statuses: Record<string, any> = {
    pending: {
      display: 'Pending',
      color: 'yellow',
      icon: '⏳',
    },
    completed: {
      display: 'Completed',
      color: 'green',
      icon: '✓',
    },
    failed: {
      display: 'Failed',
      color: 'red',
      icon: '✕',
    },
  };
  return statuses[status] || statuses.pending;
}

/**
 * Get refund eligibility
 */
export function getRefundEligibility(
  paymentDate: string,
  bookingStatus: string
): {
  eligible: boolean;
  reason?: string;
  hoursRemaining?: number;
} {
  // Check booking status
  if (!['confirmed', 'completed'].includes(bookingStatus)) {
    return {
      eligible: false,
      reason: `Cannot refund booking with status: ${bookingStatus}`,
    };
  }

  // Check refund window (24 hours)
  const paymentTime = new Date(paymentDate);
  const nowTime = new Date();
  const hoursSincePaid = (nowTime.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);

  if (hoursSincePaid > 24) {
    return {
      eligible: false,
      reason: 'Refund window has expired (24 hours)',
    };
  }

  return {
    eligible: true,
    hoursRemaining: 24 - Math.floor(hoursSincePaid),
  };
}

/**
 * Validate Bit ID format
 */
export function validateBitId(bitId: string): boolean {
  // Bit ID is typically 9 digits
  return /^\d{9}$/.test(bitId);
}

/**
 * Validate Israeli phone number
 */
export function validateIsraeliPhone(phone: string): boolean {
  // Remove formatting
  const cleaned = phone.replace(/\D/g, '');
  // Check if it's 10 digits (0X XXXX XXXX or similar)
  return cleaned.length === 10 && cleaned.startsWith('0');
}

/**
 * Format Israeli phone number
 */
export function formatIsraeliPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return phone;
  }
  // Format as: 054-1234567
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

/**
 * Validate bank account number
 */
export function validateBankAccount(
  bankCode: string,
  branchCode: string,
  accountNumber: string
): boolean {
  // Basic validation - adjust based on Israeli banking requirements
  return (
    /^\d{1,3}$/.test(bankCode) &&
    /^\d{1,3}$/.test(branchCode) &&
    /^\d{1,20}$/.test(accountNumber)
  );
}

/**
 * Generate QR code from payment link
 * (In production, use a QR code library)
 */
export function generateQRDataUrl(text: string): string {
  // This is a placeholder - use 'qrcode' npm package in production
  // Example: https://github.com/davidshimjs/qrcodejs
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
}

/**
 * Copy to clipboard (browser only)
 */
export function copyToClipboard(text: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Not in browser environment'));
  }

  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for older browsers
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

/**
 * Download QR code image
 */
export function downloadQRCode(
  qrCodeData: string,
  fileName: string = 'payment-qr-code.png'
): void {
  const link = document.createElement('a');
  link.href = qrCodeData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share payment link
 */
export function sharePaymentLink(
  paymentLink: string,
  platform: 'whatsapp' | 'telegram' | 'email' | 'sms'
): string {
  const message = encodeURIComponent(`Pay for dive booking: ${paymentLink}`);

  const urls: Record<string, string> = {
    whatsapp: `https://wa.me/?text=${message}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(paymentLink)}`,
    email: `mailto:?subject=Dive%20Booking%20Payment&body=${message}`,
    sms: `sms:?body=${message}`,
  };

  return urls[platform] || paymentLink;
}

/**
 * Calculate settlement totals
 */
export function calculateSettlementTotals(
  transactions: Array<{
    type: 'payment' | 'refund' | 'payout' | 'commission';
    amount_cents: number;
    status: string;
  }>
): {
  totalPayments: number;
  totalRefunds: number;
  totalPayouts: number;
  totalCommission: number;
  netAmount: number;
} {
  let totalPayments = 0;
  let totalRefunds = 0;
  let totalPayouts = 0;
  let totalCommission = 0;

  for (const tx of transactions) {
    if (tx.status !== 'completed') continue;

    switch (tx.type) {
      case 'payment':
        totalPayments += tx.amount_cents;
        break;
      case 'refund':
        totalRefunds += tx.amount_cents;
        break;
      case 'payout':
        totalPayouts += tx.amount_cents;
        break;
      case 'commission':
        totalCommission += tx.amount_cents;
        break;
    }
  }

  const netAmount = totalPayments - totalRefunds - totalPayouts;

  return {
    totalPayments,
    totalRefunds,
    totalPayouts,
    totalCommission,
    netAmount,
  };
}
