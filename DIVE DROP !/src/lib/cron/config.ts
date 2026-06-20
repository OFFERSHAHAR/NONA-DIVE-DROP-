/**
 * Cron Job Configuration
 * Central place for all cron job settings
 */

export const CRON_CONFIG = {
  // Photo rotation settings
  photoRotation: {
    // Rotation frequency in hours (72 = 3 days)
    frequencyHours: 72,

    // Days to look back for approved photos
    approvalWindowDays: 30,

    // Number of top photos to randomly select from
    topPhotosCount: 10,

    // Minimum photos required for rotation
    minimumPhotosRequired: 1,

    // Enable automatic rotation
    enabled: process.env.CRON_PHOTO_ROTATION_ENABLED !== 'false',

    // Photo scoring weights (must sum to 1.0)
    scoringWeights: {
      recency: 0.4, // 40% - newer photos score higher
      rating: 0.3, // 30% - user ratings
      engagement: 0.3, // 30% - comments and views
    },

    // Notification settings
    notifications: {
      enabled: process.env.CRON_NOTIFICATIONS_ENABLED !== 'false',
      // Notify on success
      onSuccess: false,
      // Notify on warnings (no photos to rotate)
      onWarning: true,
      // Notify on errors
      onError: true,
    },
  },

  // Cron security
  security: {
    // Secret key for manual cron trigger
    cronSecret: process.env.CRON_SECRET,

    // IP allowlist (if provided)
    ipAllowlist: process.env.CRON_IP_ALLOWLIST?.split(',') || [],

    // Enable Vercel cron signature validation
    requireVercelCron: process.env.NODE_ENV === 'production',
  },

  // Retry settings
  retry: {
    // Number of retries on failure
    maxAttempts: 3,

    // Delay between retries in seconds
    delaySeconds: 30,

    // Enable exponential backoff
    exponentialBackoff: true,
  },

  // Logging
  logging: {
    // Log level: 'debug', 'info', 'warn', 'error'
    level: process.env.CRON_LOG_LEVEL || 'info',

    // Include detailed photo scores in logs
    verboseScoring: false,

    // Log individual site rotations
    logIndividualRotations: true,
  },

  // Storage settings
  storage: {
    // Supabase bucket for site photos
    bucket: 'site-photos',

    // Photo URL template
    // {supabaseUrl}/{bucket}/{photoId}
    urlTemplate: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-photos`,
  },
};

/**
 * Validate cron configuration
 */
export function validateCronConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate scoring weights
  const weights = CRON_CONFIG.photoRotation.scoringWeights;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push(`Scoring weights must sum to 1.0, got ${totalWeight}`);
  }

  // Validate frequency
  if (CRON_CONFIG.photoRotation.frequencyHours < 1) {
    errors.push('Rotation frequency must be at least 1 hour');
  }

  // Validate approval window
  if (CRON_CONFIG.photoRotation.approvalWindowDays < 1) {
    errors.push('Approval window must be at least 1 day');
  }

  // Validate minimum photos
  if (CRON_CONFIG.photoRotation.minimumPhotosRequired < 1) {
    errors.push('Minimum photos required must be at least 1');
  }

  // Validate secret in production
  if (
    process.env.NODE_ENV === 'production' &&
    !CRON_CONFIG.security.cronSecret
  ) {
    errors.push('CRON_SECRET environment variable is required in production');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get cron schedule expression
 * Returns cron expression for the configured frequency
 */
export function getCronScheduleExpression(): string {
  const hours = CRON_CONFIG.photoRotation.frequencyHours;

  // Convert hours to cron schedule
  // For every N hours: 0 */N * * * *
  // For every 72 hours (3 days): 0 0 */3 * * *

  if (hours % 24 === 0) {
    // Daily or multi-day
    const days = hours / 24;
    return `0 0 */${Math.floor(days)} * * *`;
  } else {
    // Hourly
    return `0 */${hours} * * * *`;
  }
}

/**
 * Get human-readable frequency description
 */
export function getFrequencyDescription(): string {
  const hours = CRON_CONFIG.photoRotation.frequencyHours;

  if (hours === 24) {
    return 'Daily';
  } else if (hours % 24 === 0) {
    const days = hours / 24;
    return `Every ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours === 1) {
    return 'Hourly';
  } else {
    return `Every ${hours} hours`;
  }
}
