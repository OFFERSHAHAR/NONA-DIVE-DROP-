# Find Buddy - Code Templates & Boilerplate

This document provides ready-to-use code templates for implementing the Find Buddy feature.

---

## 1. Type Definitions Template

```typescript
// src/types/find-buddy.ts

// Enums
export type DivingLevel = 'beginner' | 'intermediate' | 'advanced';
export type DiveType = 'reef' | 'boat' | 'cave';
export type ListingStatus = 'active' | 'expired' | 'paused';
export type RequestStatus = 'pending' | 'approved' | 'declined';
export type SortOption = 'newest' | 'expiring_soon';

// Core Models
export interface Listing {
  id: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  location: string;
  dateFrom: string; // ISO 8601
  dateTo: string;   // ISO 8601
  divingLevel: DivingLevel;
  diveTypes: DiveType[];
  description: string;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string;
  interestedCount: number;
}

export interface BuddyProfile {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  bio?: string;
  certificationLevel: DivingLevel;
  divesLogged: number;
  joinDate: string;
}

export interface ContactRequest {
  id: string;
  fromUserId: string;
  fromUser: BuddyProfile;
  toUserId: string;
  toListingId: string;
  status: RequestStatus;
  message?: string;
  contactInfo: {
    email: string;
    phone: string;
    telegram?: string;
    whatsapp?: string;
  };
  createdAt: string;
  respondedAt?: string;
  responseMessage?: string;
}

export interface ListingWithProfile extends Listing {
  userProfile: BuddyProfile;
}

// Payload Types
export interface CreateListingPayload {
  location: string;
  dateFrom: Date | string;
  dateTo: Date | string;
  divingLevel: DivingLevel;
  diveTypes: DiveType[];
  description: string;
}

export interface UpdateListingPayload extends Partial<CreateListingPayload> {
  status?: ListingStatus;
}

export interface ContactRequestPayload {
  toListingId: string;
  message: string;
}

export interface FilterPayload {
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  divingLevel?: DivingLevel;
  diveType?: DiveType;
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
}

export interface FilterState extends Omit<FilterPayload, 'limit' | 'offset'> {
  sortBy: SortOption;
}

export interface FetchListingsResponse {
  listings: ListingWithProfile[];
  total: number;
  hasMore: boolean;
  offset: number;
}
```

---

## 2. Validation Schema Template

```typescript
// src/lib/find-buddy/validation.ts

import { z } from 'zod';
import { LOCATIONS, DIVE_LEVELS, DIVE_TYPES } from './constants';

// Enums
export const DivingLevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export const DiveTypeEnum = z.enum(['reef', 'boat', 'cave']);
export const ListingStatusEnum = z.enum(['active', 'expired', 'paused']);
export const SortOptionEnum = z.enum(['newest', 'expiring_soon']);

// Schemas
export const LocationSchema = z.string()
  .min(2, 'Location too short')
  .max(100, 'Location too long');

export const DateRangeSchema = z.object({
  dateFrom: z.date()
    .min(new Date(), 'Start date must be in future'),
  dateTo: z.date(),
}).refine(
  (data) => data.dateTo > data.dateFrom,
  {
    message: 'End date must be after start date',
    path: ['dateTo'],
  }
);

export const DescriptionSchema = z.string()
  .min(10, 'Description must be at least 10 characters')
  .max(500, 'Description must be at most 500 characters');

export const CreateListingSchema = z.object({
  location: LocationSchema,
  dateFrom: z.date(),
  dateTo: z.date(),
  divingLevel: DivingLevelEnum,
  diveTypes: z.array(DiveTypeEnum)
    .min(1, 'Select at least one dive type')
    .max(3, 'Select at most three dive types'),
  description: DescriptionSchema,
}).merge(DateRangeSchema);

export const UpdateListingSchema = CreateListingSchema.partial();

export const ContactRequestSchema = z.object({
  toListingId: z.string().uuid(),
  message: z.string()
    .min(5, 'Message too short')
    .max(500, 'Message too long'),
});

export const FilterSchema = z.object({
  location: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  divingLevel: DivingLevelEnum.optional(),
  diveType: DiveTypeEnum.optional(),
  sortBy: SortOptionEnum.default('newest'),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
}).refine(
  (data) => !data.dateFrom || !data.dateTo || data.dateTo > data.dateFrom,
  {
    message: 'Date range invalid',
    path: ['dateTo'],
  }
).strict();

// Type exports
export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type ContactRequestInput = z.infer<typeof ContactRequestSchema>;
export type FilterInput = z.infer<typeof FilterSchema>;
```

---

## 3. Constants Template

```typescript
// src/lib/find-buddy/constants.ts

import { DivingLevel, DiveType } from '@/types/find-buddy';

export const LOCATIONS = [
  { value: 'eilat', label: 'Eilat, Israel', emoji: '🇮🇱' },
  { value: 'red-sea', label: 'Red Sea, Egypt', emoji: '🇪🇬' },
  { value: 'sinai', label: 'Sinai Peninsula, Egypt', emoji: '🏜️' },
  { value: 'aqaba', label: 'Aqaba, Jordan', emoji: '🇯🇴' },
  { value: 'palm-jumeirah', label: 'Dubai, UAE', emoji: '🇦🇪' },
  { value: 'sharm-el-sheikh', label: 'Sharm El-Sheikh, Egypt', emoji: '🌴' },
  { value: 'hurghada', label: 'Hurghada, Egypt', emoji: '🐠' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '🌊' },
  { value: 'hawaii', label: 'Hawaii, USA', emoji: '🇺🇸' },
  { value: 'caribbean', label: 'Caribbean', emoji: '🏝️' },
  { value: 'bali', label: 'Bali, Indonesia', emoji: '🇮🇩' },
  { value: 'thailand', label: 'Thailand', emoji: '🇹🇭' },
  { value: 'palau', label: 'Palau', emoji: '🪸' },
  { value: 'maldives', label: 'Maldives', emoji: '🏖️' },
  { value: 'other', label: 'Other Location', emoji: '📍' },
];

export const DIVE_LEVELS = [
  {
    value: 'beginner' as DivingLevel,
    label: 'Beginner',
    icon: '🔵',
    description: 'Basic certification, shallow dives (<12m)',
    minDives: 0,
  },
  {
    value: 'intermediate' as DivingLevel,
    label: 'Intermediate',
    icon: '🟢',
    description: 'Advanced Open Water, 50+ dives, up to 20m',
    minDives: 50,
  },
  {
    value: 'advanced' as DivingLevel,
    label: 'Advanced',
    icon: '🔴',
    description: 'Deep specialty, 100+ dives, deep/technical diving',
    minDives: 100,
  },
];

export const DIVE_TYPES = [
  {
    value: 'reef' as DiveType,
    label: 'Reef',
    icon: '🪨',
    description: 'Colorful coral reefs, marine life',
  },
  {
    value: 'boat' as DiveType,
    label: 'Boat',
    icon: '⛵',
    description: 'Deep diving from boats, offshore sites',
  },
  {
    value: 'cave' as DiveType,
    label: 'Cave',
    icon: '🔦',
    description: 'Technical cave diving, cavern exploration',
  },
];

export const LISTING_EXPIRE_DAYS = 30; // Listings expire after 30 days
export const MIN_DESCRIPTION_LENGTH = 10;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MIN_DATE_RANGE_DAYS = 1;
export const MAX_DATE_RANGE_DAYS = 60;

// Status colors
export const STATUS_COLORS = {
  active: {
    bg: 'bg-success',
    text: 'text-white',
    border: 'border-success',
  },
  expired: {
    bg: 'bg-error',
    text: 'text-white',
    border: 'border-error',
  },
  paused: {
    bg: 'bg-gray-400',
    text: 'text-white',
    border: 'border-gray-400',
  },
};

// Translation keys
export const I18N_KEYS = {
  title: 'findBuddy.title',
  myListings: {
    title: 'findBuddy.myListings.title',
    empty: 'findBuddy.myListings.empty',
    createButton: 'findBuddy.myListings.createButton',
  },
  browseBuddies: {
    title: 'findBuddy.browseBuddies.title',
    empty: 'findBuddy.browseBuddies.empty',
    interested: 'findBuddy.browseBuddies.interested',
    reveal: 'findBuddy.browseBuddies.reveal',
  },
};
```

---

## 4. Zustand Store Template

```typescript
// src/stores/find-buddy-store.ts

import { create } from 'zustand';
import { apiClient } from '@/lib/find-buddy/api-client';
import type {
  Listing,
  ContactRequest,
  FilterState,
  CreateListingPayload,
  ContactRequestPayload,
} from '@/types/find-buddy';

interface FindBuddyState {
  // My Listings
  myListings: Listing[];
  loadingMyListings: boolean;
  errorMyListings: string | null;

  // Browse
  browseListings: Listing[];
  loadingBrowse: boolean;
  errorBrowse: string | null;
  hasMore: boolean;
  browseOffset: number;

  // Filters
  filters: FilterState;

  // Contact Requests
  contactRequests: ContactRequest[];
  loadingRequests: boolean;

  // Modal states
  modals: {
    contactReveal: { isOpen: boolean; requestId?: string };
    confirmDelete: { isOpen: boolean; listingId?: string };
    message: { isOpen: boolean; recipientId?: string };
  };

  // My Listings Actions
  fetchMyListings: () => Promise<void>;
  createListing: (payload: CreateListingPayload) => Promise<string>;
  updateListing: (id: string, payload: Partial<CreateListingPayload>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;

  // Browse Actions
  fetchBrowseListings: (reset?: boolean) => Promise<void>;
  fetchMoreBrowseListings: () => Promise<void>;

  // Filter Actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Contact Request Actions
  fetchContactRequests: () => Promise<void>;
  createContactRequest: (payload: ContactRequestPayload) => Promise<void>;
  approveRequest: (requestId: string, message?: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;

  // Modal Actions
  openContactRevealModal: (requestId: string) => void;
  closeContactRevealModal: () => void;
  openDeleteConfirm: (listingId: string) => void;
  closeDeleteConfirm: () => void;
  openMessageModal: (recipientId: string) => void;
  closeMessageModal: () => void;
}

export const useFindBuddyStore = create<FindBuddyState>((set, get) => ({
  // Initial State
  myListings: [],
  loadingMyListings: false,
  errorMyListings: null,

  browseListings: [],
  loadingBrowse: false,
  errorBrowse: null,
  hasMore: true,
  browseOffset: 0,

  filters: {
    sortBy: 'newest',
  },

  contactRequests: [],
  loadingRequests: false,

  modals: {
    contactReveal: { isOpen: false },
    confirmDelete: { isOpen: false },
    message: { isOpen: false },
  },

  // My Listings Actions
  fetchMyListings: async () => {
    set({ loadingMyListings: true, errorMyListings: null });
    try {
      const listings = await apiClient.getMyListings();
      set({ myListings: listings || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch listings';
      set({ errorMyListings: message });
    } finally {
      set({ loadingMyListings: false });
    }
  },

  createListing: async (payload) => {
    try {
      const newListing = await apiClient.createListing(payload);
      set((state) => ({
        myListings: [newListing, ...state.myListings],
      }));
      return newListing.id;
    } catch (error) {
      throw error;
    }
  },

  updateListing: async (id, payload) => {
    try {
      const updatedListing = await apiClient.updateListing(id, payload);
      set((state) => ({
        myListings: state.myListings.map((listing) =>
          listing.id === id ? updatedListing : listing
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  deleteListing: async (id) => {
    try {
      await apiClient.deleteListing(id);
      set((state) => ({
        myListings: state.myListings.filter((listing) => listing.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Browse Actions
  fetchBrowseListings: async (reset = true) => {
    set({ loadingBrowse: true, errorBrowse: null });
    try {
      const state = get();
      const filters = {
        ...state.filters,
        offset: reset ? 0 : state.browseOffset,
        limit: 10,
      };
      const result = await apiClient.getBrowseListings(filters);
      set({
        browseListings: reset ? result.listings : [...state.browseListings, ...result.listings],
        hasMore: result.hasMore,
        browseOffset: reset ? 10 : state.browseOffset + 10,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch listings';
      set({ errorBrowse: message });
    } finally {
      set({ loadingBrowse: false });
    }
  },

  fetchMoreBrowseListings: async () => {
    const state = get();
    if (!state.hasMore || state.loadingBrowse) return;
    await get().fetchBrowseListings(false);
  },

  // Filter Actions
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      browseOffset: 0,
      hasMore: true,
    }));
    // Refetch with new filters
    get().fetchBrowseListings(true);
  },

  resetFilters: () => {
    set({
      filters: { sortBy: 'newest' },
      browseOffset: 0,
      hasMore: true,
    });
    get().fetchBrowseListings(true);
  },

  // Contact Request Actions
  fetchContactRequests: async () => {
    set({ loadingRequests: true });
    try {
      const requests = await apiClient.getContactRequests();
      set({ contactRequests: requests || [] });
    } catch (error) {
      console.error('Failed to fetch contact requests:', error);
    } finally {
      set({ loadingRequests: false });
    }
  },

  createContactRequest: async (payload) => {
    try {
      await apiClient.createContactRequest(payload);
      // Optionally refresh requests
      await get().fetchContactRequests();
    } catch (error) {
      throw error;
    }
  },

  approveRequest: async (requestId, message) => {
    try {
      await apiClient.approveRequest(requestId, message);
      set((state) => ({
        contactRequests: state.contactRequests.map((req) =>
          req.id === requestId ? { ...req, status: 'approved' as const } : req
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  declineRequest: async (requestId) => {
    try {
      await apiClient.declineRequest(requestId);
      set((state) => ({
        contactRequests: state.contactRequests.map((req) =>
          req.id === requestId ? { ...req, status: 'declined' as const } : req
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Modal Actions
  openContactRevealModal: (requestId) => {
    set((state) => ({
      modals: {
        ...state.modals,
        contactReveal: { isOpen: true, requestId },
      },
    }));
  },

  closeContactRevealModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        contactReveal: { isOpen: false },
      },
    }));
  },

  openDeleteConfirm: (listingId) => {
    set((state) => ({
      modals: {
        ...state.modals,
        confirmDelete: { isOpen: true, listingId },
      },
    }));
  },

  closeDeleteConfirm: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        confirmDelete: { isOpen: false },
      },
    }));
  },

  openMessageModal: (recipientId) => {
    set((state) => ({
      modals: {
        ...state.modals,
        message: { isOpen: true, recipientId },
      },
    }));
  },

  closeMessageModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        message: { isOpen: false },
      },
    }));
  },
}));
```

---

## 5. API Client Template

```typescript
// src/lib/find-buddy/api-client.ts

import type {
  Listing,
  ContactRequest,
  CreateListingPayload,
  FilterPayload,
  FetchListingsResponse,
} from '@/types/find-buddy';

const API_BASE = '/api/find-buddy';

class FindBuddyApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Listings Endpoints
  async getMyListings(): Promise<Listing[]> {
    return this.request<Listing[]>('/listings/mine');
  }

  async createListing(payload: CreateListingPayload): Promise<Listing> {
    return this.request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateListing(id: string, payload: Partial<CreateListingPayload>): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteListing(id: string): Promise<void> {
    return this.request<void>(`/listings/${id}`, { method: 'DELETE' });
  }

  // Browse Endpoints
  async getBrowseListings(filters: FilterPayload): Promise<FetchListingsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else {
          params.append(key, String(value));
        }
      }
    });
    return this.request<FetchListingsResponse>(`/listings/browse?${params}`);
  }

  // Contact Request Endpoints
  async getContactRequests(): Promise<ContactRequest[]> {
    return this.request<ContactRequest[]>('/requests/received');
  }

  async getSentRequests(): Promise<ContactRequest[]> {
    return this.request<ContactRequest[]>('/requests/sent');
  }

  async createContactRequest(toListingId: string, message: string): Promise<ContactRequest> {
    return this.request<ContactRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify({ toListingId, message }),
    });
  }

  async approveRequest(requestId: string, message?: string): Promise<void> {
    return this.request<void>(`/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async declineRequest(requestId: string): Promise<void> {
    return this.request<void>(`/requests/${requestId}/decline`, {
      method: 'POST',
    });
  }
}

export const apiClient = new FindBuddyApiClient();
```

---

## 6. Component Page Template

```typescript
// src/app/[locale]/find-buddy/page.tsx

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { FindBuddyClient } from './client';

export const metadata = {
  title: 'Find Buddy - DiveDrop',
  description: 'Find your perfect diving buddy',
};

export default async function FindBuddyPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const isRTL = locale === 'he';

  return (
    <div className={`min-h-screen bg-light-bg dark:bg-dark-bg ${isRTL ? 'rtl' : 'ltr'}`}>
      <FindBuddyClient userId={user.id} />
    </div>
  );
}
```

---

## 7. Client Component Template

```typescript
// src/app/[locale]/find-buddy/client.tsx

'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useFindBuddyStore } from '@/stores/find-buddy-store';
import { MyListingsSection, BrowseBuddiesSection, TabNavigation } from '@/components/find-buddy/sections';

interface FindBuddyClientProps {
  userId: string;
}

export function FindBuddyClient({ userId }: FindBuddyClientProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [activeTab, setActiveTab] = useState<'my-listings' | 'browse'>('my-listings');

  const fetchMyListings = useFindBuddyStore((state) => state.fetchMyListings);
  const fetchBrowseListings = useFindBuddyStore((state) => state.fetchBrowseListings);

  useEffect(() => {
    // Fetch initial data
    fetchMyListings();
    if (activeTab === 'browse') {
      fetchBrowseListings(true);
    }
  }, [activeTab, fetchMyListings, fetchBrowseListings]);

  return (
    <div className={`max-w-6xl mx-auto px-4 py-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary dark:text-text-light mb-2">
          {isRTL ? 'מצא באדי צלילה' : 'Find Buddy'}
        </h1>
        <p className="text-text-secondary dark:text-text-secondary-light">
          {isRTL
            ? 'התחבר עם צוללים אחרים לצלילות בטוחות ואחראיות'
            : 'Connect with other divers for safe and responsible dives'}
        </p>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="mt-8">
        {activeTab === 'my-listings' ? (
          <MyListingsSection userId={userId} />
        ) : (
          <BrowseBuddiesSection />
        )}
      </div>
    </div>
  );
}
```

---

## 8. Helper Functions Template

```typescript
// src/lib/find-buddy/helpers.ts

import { Listing, DiveType, DivingLevel } from '@/types/find-buddy';
import { DIVE_TYPES, DIVE_LEVELS } from './constants';

export function formatDateRange(from: string | Date, to: string | Date): string {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const fromStr = fromDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const toStr = toDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${fromStr} - ${toStr}`;
}

export function getDaysUntilExpiry(expiresAt: string | Date): number {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
}

export function isListingExpired(expiresAt: string | Date): boolean {
  return getDaysUntilExpiry(expiresAt) === 0;
}

export function getDiveTypeLabel(type: DiveType): string {
  return DIVE_TYPES.find((t) => t.value === type)?.label || type;
}

export function getDiveTypeIcon(type: DiveType): string {
  return DIVE_TYPES.find((t) => t.value === type)?.icon || '🪨';
}

export function getDivingLevelLabel(level: DivingLevel): string {
  return DIVE_LEVELS.find((l) => l.value === level)?.label || level;
}

export function getDivingLevelIcon(level: DivingLevel): string {
  return DIVE_LEVELS.find((l) => l.value === level)?.icon || '🔵';
}

export function getUserInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatDays(dateFrom: string | Date, dateTo: string | Date): number {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function getStatusBadgeClass(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const classes = {
    active: { bg: 'bg-success', text: 'text-white', border: 'border-success' },
    expired: { bg: 'bg-error', text: 'text-white', border: 'border-error' },
    paused: { bg: 'bg-gray-400', text: 'text-white', border: 'border-gray-400' },
  };
  return classes[status as keyof typeof classes] || classes.active;
}

export function getStatusLabel(status: string, isRTL: boolean): string {
  const labels = {
    active: isRTL ? 'פעיל' : 'Active',
    expired: isRTL ? 'פג תוקף' : 'Expired',
    paused: isRTL ? 'מושהה' : 'Paused',
  };
  return labels[status as keyof typeof labels] || status;
}

// Filter matching
export function matchesFilters(listing: Listing, filters: Record<string, any>): boolean {
  if (filters.location && listing.location !== filters.location) return false;
  if (filters.divingLevel && listing.divingLevel !== filters.divingLevel) return false;
  if (filters.diveType && !listing.diveTypes.includes(filters.diveType)) return false;

  // Date filtering
  if (filters.dateFrom || filters.dateTo) {
    const listingFrom = new Date(listing.dateFrom);
    const listingTo = new Date(listing.dateTo);

    if (filters.dateFrom) {
      const filterFrom = new Date(filters.dateFrom);
      // Check if date ranges overlap
      if (listingTo < filterFrom) return false;
    }

    if (filters.dateTo) {
      const filterTo = new Date(filters.dateTo);
      if (listingFrom > filterTo) return false;
    }
  }

  return true;
}

// Sorting
export function sortListings(
  listings: Listing[],
  sortBy: 'newest' | 'expiring_soon'
): Listing[] {
  const sorted = [...listings];

  switch (sortBy) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'expiring_soon':
      return sorted.sort(
        (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      );
    default:
      return sorted;
  }
}
```

---

## 9. Custom Hooks Template

```typescript
// src/lib/find-buddy/hooks.ts

import { useState, useEffect, useRef, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    setIsLoaded(true);
  }, [key]);

  const setValue: typeof setStoredValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, isLoaded] as const;
}

export function useInfiniteScroll(
  callback: () => Promise<void>,
  hasMore: boolean,
  isLoading: boolean
) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [callback, hasMore, isLoading]);

  return observerTarget;
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

---

## 10. Test Template

```typescript
// src/stores/find-buddy-store.test.ts

import { renderHook, act } from '@testing-library/react';
import { useFindBuddyStore } from './find-buddy-store';
import * as apiClient from '@/lib/find-buddy/api-client';

jest.mock('@/lib/find-buddy/api-client');

describe('useFindBuddyStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('My Listings', () => {
    it('should fetch my listings', async () => {
      const mockListings = [
        {
          id: '1',
          location: 'Eilat',
          status: 'active',
          divingLevel: 'intermediate',
          diveTypes: ['reef'],
          dateFrom: '2026-06-25',
          dateTo: '2026-06-28',
          description: 'Test',
          interestedCount: 0,
          userId: 'user-1',
          userFirstName: 'John',
          userLastName: 'Doe',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      (apiClient.getMyListings as jest.Mock).mockResolvedValue(mockListings);

      const { result } = renderHook(() => useFindBuddyStore());

      await act(async () => {
        await result.current.fetchMyListings();
      });

      expect(result.current.myListings).toEqual(mockListings);
      expect(result.current.loadingMyListings).toBe(false);
    });

    it('should handle fetch error', async () => {
      const error = new Error('API Error');
      (apiClient.getMyListings as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useFindBuddyStore());

      await act(async () => {
        await result.current.fetchMyListings();
      });

      expect(result.current.errorMyListings).toBe('API Error');
      expect(result.current.myListings).toEqual([]);
    });
  });

  describe('Modal Actions', () => {
    it('should open and close contact reveal modal', () => {
      const { result } = renderHook(() => useFindBuddyStore());

      act(() => {
        result.current.openContactRevealModal('request-1');
      });

      expect(result.current.modals.contactReveal.isOpen).toBe(true);
      expect(result.current.modals.contactReveal.requestId).toBe('request-1');

      act(() => {
        result.current.closeContactRevealModal();
      });

      expect(result.current.modals.contactReveal.isOpen).toBe(false);
    });
  });
});
```

---

## 11. Translation Keys Template

```json
{
  "findBuddy": {
    "title": "Find Buddy",
    "subtitle": "Connect with diving partners for safer and more enjoyable dives",
    "tabs": {
      "myListings": "My Listings",
      "browseBuddies": "Browse Buddies"
    },
    "myListings": {
      "title": "My Listings",
      "empty": "No listings yet",
      "emptyDescription": "Create your first listing to find diving partners",
      "createButton": "Create Listing",
      "editButton": "Edit",
      "deleteButton": "Delete",
      "viewRequests": "View Requests",
      "interested": "interested"
    },
    "browseBuddies": {
      "title": "Browse Buddies",
      "empty": "No buddies match your filters",
      "interested": "I'm Interested",
      "reveal": "Reveal & Contact",
      "searchPlaceholder": "Search by location..."
    },
    "filters": {
      "location": "Location",
      "dateRange": "Date Range",
      "level": "Diving Level",
      "type": "Dive Type",
      "sort": "Sort by",
      "resetFilters": "Reset Filters"
    },
    "form": {
      "location": "Location",
      "dateFrom": "From",
      "dateTo": "To",
      "divingLevel": "Diving Level",
      "diveType": "Dive Type",
      "description": "Description",
      "cancel": "Cancel",
      "save": "Save Listing",
      "create": "Create Listing",
      "required": "This field is required"
    },
    "modal": {
      "contactFrom": "Contact from",
      "wantsToConnect": "wants to connect!",
      "contactInfo": "Contact Information",
      "messageFrom": "Message from",
      "yourResponse": "Your Response",
      "decline": "Decline",
      "approve": "Approve & Reply"
    },
    "messages": {
      "listingCreated": "Listing created successfully!",
      "listingUpdated": "Listing updated successfully!",
      "listingDeleted": "Listing deleted successfully!",
      "interestSent": "Interest sent! The user can contact you if interested.",
      "contactApproved": "You've connected!"
    }
  }
}
```

---

These templates provide a solid foundation for implementing each part of the Find Buddy feature. Customize them as needed for your specific requirements.
