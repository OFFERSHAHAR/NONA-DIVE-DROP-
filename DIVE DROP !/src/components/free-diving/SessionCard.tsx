'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { AppIcon } from '@/components/AppIcon';

interface SessionCardProps {
  id: string;
  title: string;
  sessionType: string;
  level: string;
  location: string;
  date: string;
  time: string;
  capacity: number;
  currentParticipants: number;
  price: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
}

const sessionTypeLabels: Record<string, Record<string, string>> = {
  group_apnea_training: { en: 'Group Apnea Training', he: 'הדרכת חנייה בקבוצה' },
  certification_course: { en: 'Certification Course', he: 'קורס הסמכה' },
  competition_prep: { en: 'Competition Prep', he: 'הכנה תחרויות' },
  depth_training: { en: 'Depth Training', he: 'הדרכת עומק' },
  partner_sessions: { en: 'Partner Sessions', he: 'צלילות זוגיות' },
};

const levelLabels: Record<string, Record<string, string>> = {
  beginner: { en: 'Beginner', he: 'מתחיל' },
  intermediate: { en: 'Intermediate', he: 'ביניים' },
  advanced: { en: 'Advanced', he: 'מתקדם' },
  expert: { en: 'Expert', he: 'מומחה' },
};

export function SessionCard({
  id,
  title,
  sessionType,
  level,
  location,
  date,
  time,
  capacity,
  currentParticipants,
  price,
  imageUrl,
  rating,
  reviewCount,
}: SessionCardProps) {
  const locale = useLocale() as 'en' | 'he';
  const isRTL = locale === 'he';
  const availableSpots = capacity - currentParticipants;
  const isFull = availableSpots <= 0;

  return (
    <Link href={`/${locale}/free-diving/sessions/${id}`}>
      <article className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_rgba(17,63,105,.12)] transition hover:shadow-lg hover:-translate-y-1 ${isFull ? 'opacity-75' : ''}`}>
        {/* Image */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-700">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <AppIcon name="diver" className="h-12 w-12 text-white/50" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
              <AppIcon name="bookmark" className="h-3.5 w-3.5" />
              {levelLabels[level]?.[locale] || level}
            </span>
            {isFull && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {isRTL ? 'מלא' : 'Full'}
              </span>
            )}
          </div>

          {/* Capacity indicator */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-blue-700 backdrop-blur-sm">
            <AppIcon name="users" className="h-3.5 w-3.5" />
            {availableSpots > 0 ? `${availableSpots} ${isRTL ? 'מקומות' : 'spots'}` : `${isRTL ? 'אין מקומות' : 'No spots'}`}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 p-4">
          {/* Type */}
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
            {sessionTypeLabels[sessionType]?.[locale] || sessionType}
          </p>

          {/* Title */}
          <h3 className="text-lg font-extrabold leading-6 line-clamp-2">{title}</h3>

          {/* Location & Date */}
          <div className="space-y-1.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <AppIcon name="location" className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <AppIcon name="calendar" className="h-4 w-4 flex-shrink-0" />
              <span>{date} • {time}</span>
            </div>
          </div>

          {/* Rating */}
          {rating !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <AppIcon name="star" className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
              <span className="text-slate-500">
                ({reviewCount || 0} {isRTL ? 'ביקורות' : 'reviews'})
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <span className="text-xs text-slate-600">
                {isRTL ? 'מחיר' : 'Price'}
              </span>
              <div className="text-xl font-extrabold text-blue-700">
                ₪{price}
              </div>
            </div>
            <button className="rounded-lg bg-gradient-to-l from-blue-700 to-cyan-500 px-4 py-2 font-semibold text-white transition hover:shadow-lg">
              {isFull ? (isRTL ? 'מלא' : 'Full') : (isRTL ? 'הזמן' : 'Book')}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
