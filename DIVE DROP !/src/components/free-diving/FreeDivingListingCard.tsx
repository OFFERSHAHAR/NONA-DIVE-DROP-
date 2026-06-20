'use client';

import { AppIcon } from '@/components/AppIcon';
import type { FreeDivingListing } from '@/types/free-diving';
import clsx from 'clsx';

interface FreeDivingListingCardProps {
  listing: FreeDivingListing;
  isRTL: boolean;
  onExpressInterest: (listingId: string) => void;
  onRevealContact: (listingId: string) => void;
  isContactRevealed: boolean;
  isInterested: boolean;
}

const listingTypeLabels: Record<string, { he: string; en: string }> = {
  instructor: { he: 'מחפש מדריך', en: 'Looking for Instructor' },
  partner: { he: 'מחפש בן זוג', en: 'Looking for Partner' },
  'group-session': { he: 'זימון קבוצה', en: 'Group Session' },
};

const instructorTypeLabels: Record<string, { he: string; en: string }> = {
  'apnea-training': { he: 'הדרכת apnea', en: 'Apnea Training' },
  courses: { he: 'קורסים', en: 'Courses' },
  competition: { he: 'תחרות', en: 'Competition' },
  depth: { he: 'צלילות עומק', en: 'Depth Diving' },
};

const levelLabels: Record<string, { he: string; en: string }> = {
  beginner: { he: 'מתחיל', en: 'Beginner' },
  intermediate: { he: 'בינוני', en: 'Intermediate' },
  advanced: { he: 'מתקדם', en: 'Advanced' },
  professional: { he: 'מקצועי', en: 'Professional' },
};

export function FreeDivingListingCard({
  listing,
  isRTL,
  onExpressInterest,
  onRevealContact,
  isContactRevealed,
  isInterested,
}: FreeDivingListingCardProps) {
  const getTypeIcon = () => {
    switch (listing.listing_type) {
      case 'instructor':
        return 'person-badge';
      case 'partner':
        return 'users';
      case 'group-session':
        return 'people';
      default:
        return 'user';
    }
  };

  const getTypeColor = () => {
    switch (listing.listing_type) {
      case 'instructor':
        return 'bg-blue-100 text-blue-700';
      case 'partner':
        return 'bg-green-100 text-green-700';
      case 'group-session':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">{listing.title}</h3>
          <p className="text-sm text-slate-600 mt-1">
            <AppIcon name="map-pin" className="inline mr-1 h-4 w-4" />
            {listing.location}
          </p>
        </div>
        <span className={clsx('px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap', getTypeColor())}>
          {isRTL ? listingTypeLabels[listing.listing_type]?.he : listingTypeLabels[listing.listing_type]?.en}
        </span>
      </div>

      {/* Instructor Type Badge */}
      {listing.listing_type === 'instructor' && listing.instructor_type && (
        <div className="mb-3">
          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            {isRTL ? instructorTypeLabels[listing.instructor_type]?.he : instructorTypeLabels[listing.instructor_type]?.en}
          </span>
        </div>
      )}

      {/* Description */}
      {listing.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{listing.description}</p>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 p-3 rounded-lg">
          <p className="text-xs text-slate-600">{isRTL ? 'רמה' : 'Level'}</p>
          <p className="text-sm font-semibold text-slate-900">
            {isRTL ? levelLabels[listing.experience_level]?.he : levelLabels[listing.experience_level]?.en}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <p className="text-xs text-slate-600">{isRTL ? 'משתתפים' : 'Participants'}</p>
          <p className="text-sm font-semibold text-slate-900">{listing.max_participants}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="mb-4">
        <p className="text-xs text-slate-600">{isRTL ? 'תאריכים' : 'Dates'}</p>
        <p className="text-sm text-slate-900">
          {new Date(listing.start_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')} -{' '}
          {new Date(listing.end_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isContactRevealed ? (
          <div className="flex-1 bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm font-semibold text-green-700">
              {isRTL ? 'איש קשר חשוף' : 'Contact Revealed'}
            </p>
          </div>
        ) : (
          <>
            {isInterested ? (
              <button
                onClick={() => onRevealContact(listing.id)}
                className="flex-1 rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-200 transition"
              >
                <AppIcon name="eye" className="inline mr-1 h-4 w-4" />
                {isRTL ? 'גלה איש קשר' : 'Reveal Contact'}
              </button>
            ) : (
              <button
                onClick={() => onExpressInterest(listing.id)}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                <AppIcon name="heart" className="inline mr-1 h-4 w-4" />
                {isRTL ? 'הביע עניין' : 'Express Interest'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
