'use client';

import { useState } from 'react';
import type { BuddyListingWithUser } from '@/types/buddy';
import { AppIcon } from '@/components/AppIcon';
import clsx from 'clsx';

interface BuddyListingCardProps {
  listing: BuddyListingWithUser;
  isRTL: boolean;
  onExpressInterest: (listingId: string) => void;
  onRevealContact: (listingId: string) => void;
  isContactRevealed: boolean;
  isInterested: boolean;
}

const experienceLevelLabels: Record<string, { he: string; en: string }> = {
  beginner: { he: 'מתחילים', en: 'Beginner' },
  intermediate: { he: 'בינוני', en: 'Intermediate' },
  advanced: { he: 'מתקדמים', en: 'Advanced' },
  professional: { he: 'מקצועי', en: 'Professional' },
};

const diveTypeLabels: Record<string, { he: string; en: string }> = {
  reef: { he: 'שונית', en: 'Reef' },
  wreck: { he: 'הריסה', en: 'Wreck' },
  open_water: { he: 'מים פתוחים', en: 'Open Water' },
  cave: { he: 'מערה', en: 'Cave' },
  boat: { he: 'סירה', en: 'Boat' },
  shore: { he: 'חוף', en: 'Shore' },
};

export function BuddyListingCard({
  listing,
  isRTL,
  onExpressInterest,
  onRevealContact,
  isContactRevealed,
  isInterested,
}: BuddyListingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExpressInterest = async () => {
    setIsLoading(true);
    try {
      onExpressInterest(listing.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevealContact = async () => {
    setIsLoading(true);
    try {
      onRevealContact(listing.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg"
    >
      {/* Header */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{listing.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{listing.location}</p>
          </div>
          <div className="flex-shrink-0">
            {listing.user?.user_metadata?.avatar_url && (
              <img
                src={listing.user.user_metadata.avatar_url}
                alt="User avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="px-4 py-2">
          <p className="text-sm text-slate-700 line-clamp-2">{listing.description}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2">
          <AppIcon name="users" className="h-4 w-4 text-blue-600" />
          <span className="text-slate-700">
            {isRTL ? `עד ${listing.max_divers} צוללים` : `Up to ${listing.max_divers} divers`}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2">
          <AppIcon name="check" className="h-4 w-4 text-emerald-600" />
          <span className="text-slate-700">
            {experienceLevelLabels[listing.experience_level]?.[isRTL ? 'he' : 'en']}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-2">
          <AppIcon name="coral" className="h-4 w-4 text-orange-600" />
          <span className="text-slate-700">
            {diveTypeLabels[listing.dive_type]?.[isRTL ? 'he' : 'en']}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-2">
          <AppIcon name="calendar" className="h-4 w-4 text-violet-600" />
          <span className="text-slate-700 truncate">{formatDate(listing.start_date)}</span>
        </div>
      </div>

      {/* Contact Section */}
      {isContactRevealed && (
        <div className="border-t border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-600 uppercase">
            {isRTL ? 'פרטי יצירת קשר' : 'Contact Info'}
          </p>
          <div className="space-y-2">
            {listing.contact_email && (
              <a
                href={`mailto:${listing.contact_email}`}
                className="block text-sm font-medium text-blue-600 hover:underline"
              >
                {listing.contact_email}
              </a>
            )}
            {listing.contact_phone && (
              <a
                href={`tel:${listing.contact_phone}`}
                className="block text-sm font-medium text-blue-600 hover:underline"
              >
                {listing.contact_phone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Interest Count */}
      {listing.interest_count ? (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-600">
          {isRTL ? `${listing.interest_count} מעוניינים` : `${listing.interest_count} interested`}
        </div>
      ) : null}

      {/* Actions */}
      <div className="border-t border-slate-100 flex gap-2 p-4">
        {isContactRevealed ? (
          <button
            disabled
            className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
          >
            {isRTL ? 'חשוף' : 'Revealed'}
          </button>
        ) : (
          <button
            onClick={handleRevealContact}
            disabled={isLoading}
            className={clsx(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
              isLoading
                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            )}
          >
            {isRTL ? 'חשוף פרטים' : 'Reveal Contact'}
          </button>
        )}

        <button
          onClick={handleExpressInterest}
          disabled={isLoading || isInterested}
          className={clsx(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            isLoading
              ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
              : isInterested
                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {isInterested ? (
            isRTL ? 'מעוניין' : 'Interested'
          ) : (
            <>
              <span className="hidden sm:inline">{isRTL ? 'בעניין' : 'Interested'}</span>
              <span className="sm:hidden">{isRTL ? 'בעניין' : 'Yes'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
