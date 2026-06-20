# Find Buddy - Implementation Architecture

## Overview

This document provides detailed technical specifications for implementing the Find Buddy feature, including component architecture, state management patterns, data flows, and best practices specific to the DIVE DROP codebase.

---

## 1. Project Structure & File Organization

### 1.1 Complete Directory Tree

```
src/
├── app/
│   └── [locale]/
│       └── find-buddy/
│           ├── page.tsx                 # Server component with auth check
│           ├── layout.tsx               # Page layout wrapper
│           ├── client.tsx               # Client wrapper component
│           │
│           └── _components/             # Local components (keep private)
│               ├── index.ts             # Export all local components
│               ├── MyListingsSection.tsx
│               ├── BrowseBuddiesSection.tsx
│               ├── TabNavigation.tsx
│               └── [other local components]
│
├── components/
│   └── find-buddy/
│       ├── index.ts                     # Export all find-buddy components
│       │
│       ├── sections/
│       │   ├── MyListingsSection.tsx
│       │   ├── BrowseBuddiesSection.tsx
│       │   └── index.ts
│       │
│       ├── forms/
│       │   ├── CreateListingForm.tsx
│       │   ├── FilterPanel.tsx
│       │   ├── SortDropdown.tsx
│       │   └── index.ts
│       │
│       ├── cards/
│       │   ├── ListingCard.tsx
│       │   ├── MyListingCard.tsx
│       │   ├── InquiryBadge.tsx
│       │   └── index.ts
│       │
│       ├── modals/
│       │   ├── ContactRevealModal.tsx
│       │   ├── ConfirmDeleteModal.tsx
│       │   ├── MessageModal.tsx
│       │   └── index.ts
│       │
│       ├── states/
│       │   ├── EmptyStateMyListings.tsx
│       │   ├── EmptyStateBrowse.tsx
│       │   ├── LoadingState.tsx
│       │   └── index.ts
│       │
│       └── shared/
│           ├── DivingLevelBadge.tsx
│           ├── DiveTypeBadge.tsx
│           ├── LocationTag.tsx
│           ├── DateRangeDisplay.tsx
│           ├── ProfileBlurOverlay.tsx
│           └── index.ts
│
├── stores/
│   ├── find-buddy-store.ts              # Main Zustand store
│   ├── find-buddy-store.test.ts         # Store tests
│   └── index.ts                         # Export all stores
│
├── lib/
│   └── find-buddy/
│       ├── index.ts                     # Export all utilities
│       ├── validation.ts                # Zod schemas
│       ├── constants.ts                 # Static data (locations, levels, etc.)
│       ├── helpers.ts                   # Utility functions
│       ├── api-client.ts                # Fetch wrapper
│       └── hooks.ts                     # Custom hooks (useLocalStorage, etc.)
│
├── types/
│   ├── find-buddy.ts                    # Type definitions
│   └── index.ts
│
└── styles/
    └── find-buddy.css                   # Component-specific styles (optional)
```

### 1.2 File Naming Conventions

- **Components**: PascalCase (e.g., `CreateListingForm.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `useLocalStorage.ts`, `helpers.ts`)
- **Types**: camelCase files, PascalCase exports (e.g., `find-buddy.ts` exports `type Listing`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Index files**: Always export from child directories

---

## 2. State Management Architecture

### 2.1 Zustand Store Design

```typescript
// stores/find-buddy-store.ts
import { create } from 'zustand';

interface FindBuddyState {
  // My Listings State
  myListings: Listing[];
  loadingMyListings: boolean;
  errorMyListings: string | null;

  // Browse Listings State
  browseListings: Listing[];
  loadingBrowse: boolean;
  errorBrowse: string | null;
  hasMore: boolean;
  browseOffset: number;

  // Filter State
  filters: FilterState;
  
  // Contact Requests State
  contactRequests: ContactRequest[];
  loadingRequests: boolean;

  // Modal States
  modals: {
    contactReveal: { isOpen: boolean; requestId?: string };
    confirmDelete: { isOpen: boolean; listingId?: string };
    message: { isOpen: boolean; recipientId?: string };
  };

  // Actions
  // Listings
  fetchMyListings: () => Promise<void>;
  createListing: (payload: CreateListingPayload) => Promise<void>;
  updateListing: (id: string, payload: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;

  // Browse
  fetchBrowseListings: (reset?: boolean) => Promise<void>;
  fetchMoreBrowseListings: () => Promise<void>;

  // Filters
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Requests
  fetchContactRequests: () => Promise<void>;
  createContactRequest: (payload: ContactRequestPayload) => Promise<void>;
  approveRequest: (requestId: string, message?: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;

  // Modals
  openContactRevealModal: (requestId: string) => void;
  closeContactRevealModal: () => void;
  openDeleteConfirm: (listingId: string) => void;
  closeDeleteConfirm: () => void;
  openMessageModal: (recipientId: string) => void;
  closeMessageModal: () => void;
}

export const useFindBuddyStore = create<FindBuddyState>((set, get) => ({
  // Initial state
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

  // Actions implementation
  fetchMyListings: async () => {
    set({ loadingMyListings: true, errorMyListings: null });
    try {
      const listings = await apiClient.getMyListings();
      set({ myListings: listings });
    } catch (error) {
      set({ errorMyListings: (error as Error).message });
    } finally {
      set({ loadingMyListings: false });
    }
  },

  // ... more actions
}));
```

### 2.2 Store Selectors Pattern

```typescript
// Usage in components
import { useFindBuddyStore } from '@/stores/find-buddy-store';

// Avoid: Creates new object reference on every render
const { myListings, loadingMyListings } = useFindBuddyStore();

// Prefer: Memoized selector, only re-renders when data changes
const myListings = useFindBuddyStore((state) => state.myListings);
const loadingMyListings = useFindBuddyStore((state) => state.loadingMyListings);

// Or create a custom hook for convenience
export const useMyListings = () => {
  const myListings = useFindBuddyStore((state) => state.myListings);
  const loadingMyListings = useFindBuddyStore((state) => state.loadingMyListings);
  const fetchMyListings = useFindBuddyStore((state) => state.fetchMyListings);
  return { myListings, loadingMyListings, fetchMyListings };
};
```

### 2.3 Error Handling Pattern

```typescript
// Always catch and set error state
async function safeFetch<T>(
  fn: () => Promise<T>,
  onError?: (error: string) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', message);
    onError?.(message);
    return null;
  }
}

// Usage in store actions
fetchBrowseListings: async () => {
  set({ loadingBrowse: true, errorBrowse: null });
  const result = await safeFetch(
    () => apiClient.getBrowseListings(get().filters),
    (error) => set({ errorBrowse: error })
  );
  if (result) {
    set({ browseListings: result, hasMore: true, browseOffset: 0 });
  }
  set({ loadingBrowse: false });
},
```

---

## 3. Data Flow Architecture

### 3.1 Component Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│         find-buddy/page.tsx (Server)                    │
│  - Auth check                                           │
│  - Fetch initial data (optional)                        │
│  - Pass locale, isRTL to client                         │
└──────────────────┬──────────────────────────────────────┘
                   │ children
┌──────────────────▼──────────────────────────────────────┐
│         find-buddy/client.tsx (Client)                  │
│  - Initialize store                                     │
│  - Provide theme context                               │
│  - Render layout                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│ MyListingsSection    │  │ BrowseBuddiesSection │
│ - Use store          │  │ - Use store          │
│ - Render cards       │  │ - Filter + sort      │
│ - Handle actions     │  │ - Render cards       │
└──────────────────────┘  └──────────────────────┘
```

### 3.2 Data Fetching Strategy

```typescript
// Pattern: Fetch on component mount
import { useEffect } from 'react';
import { useFindBuddyStore } from '@/stores/find-buddy-store';

export function MyListingsSection() {
  const { myListings, loadingMyListings, fetchMyListings } = useFindBuddyStore();

  useEffect(() => {
    // Fetch on mount
    fetchMyListings();

    // Optional: Refetch on interval
    const interval = setInterval(fetchMyListings, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [fetchMyListings]);

  if (loadingMyListings) return <LoadingState />;
  if (!myListings.length) return <EmptyState />;

  return (
    <div className="grid gap-4">
      {myListings.map((listing) => (
        <MyListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

### 3.3 Form Submission Flow

```typescript
// Pattern: Form submission with validation
import { CreateListingForm } from '@/components/find-buddy/forms';
import { useFindBuddyStore } from '@/stores/find-buddy-store';

export function CreateListingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createListing = useFindBuddyStore((state) => state.createListing);

  async function handleSubmit(data: CreateListingPayload) {
    setIsSubmitting(true);
    try {
      await createListing(data);
      // Show success toast
      // Redirect or refresh
    } catch (error) {
      // Show error toast with message
    } finally {
      setIsSubmitting(false);
    }
  }

  return <CreateListingForm onSubmit={handleSubmit} isLoading={isSubmitting} />;
}
```

---

## 4. Component Architecture

### 4.1 Section Component Template

```typescript
// components/find-buddy/sections/MyListingsSection.tsx
'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useFindBuddyStore } from '@/stores/find-buddy-store';
import { MyListingCard } from '@/components/find-buddy/cards';
import { EmptyStateMyListings, LoadingState } from '@/components/find-buddy/states';

interface MyListingsSectionProps {
  userId: string;
}

export function MyListingsSection({ userId }: MyListingsSectionProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';

  // Store selectors
  const myListings = useFindBuddyStore((state) => state.myListings);
  const loadingMyListings = useFindBuddyStore((state) => state.loadingMyListings);
  const fetchMyListings = useFindBuddyStore((state) => state.fetchMyListings);

  // Effects
  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  // Loading state
  if (loadingMyListings) {
    return <LoadingState count={3} />;
  }

  // Empty state
  if (!myListings.length) {
    return <EmptyStateMyListings />;
  }

  // Render listings
  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {myListings.map((listing) => (
        <MyListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

### 4.2 Card Component Template

```typescript
// components/find-buddy/cards/MyListingCard.tsx
'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Listing } from '@/types/find-buddy';
import {
  DivingLevelBadge,
  DiveTypeBadge,
  LocationTag,
  DateRangeDisplay,
} from '@/components/find-buddy/shared';
import { Card, CardBody } from '@/components/Card';

interface MyListingCardProps {
  listing: Listing;
}

export function MyListingCard({ listing }: MyListingCardProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card
      variant="default"
      className="rounded-2xl border border-border-primary dark:border-border-dark overflow-hidden"
    >
      <CardBody>
        {/* Header with status and menu */}
        <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(listing.status)}`}>
            {listing.status.toUpperCase()}
          </span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg"
          >
            ⋯
          </button>
        </div>

        {/* Listing details */}
        <LocationTag location={listing.location} />
        <DateRangeDisplay from={listing.dateFrom} to={listing.dateTo} />

        {/* Level and types */}
        <div className={`flex gap-2 my-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <DivingLevelBadge level={listing.divingLevel} />
          {listing.diveTypes.map((type) => (
            <DiveTypeBadge key={type} type={type} />
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary dark:text-text-secondary-light line-clamp-2 mb-4">
          {listing.description}
        </p>

        {/* Interest count */}
        <div className={`flex items-center gap-2 py-3 px-3 bg-bg-secondary dark:bg-dark-surface-elevated rounded-lg mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-lg">👥</span>
          <span className="font-semibold">{listing.interestedCount} interested</span>
        </div>

        {/* Action buttons */}
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">
            Edit
          </button>
          <button className="flex-1 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10">
            View Requests
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function getStatusBadgeClass(status: string): string {
  const classes = {
    active: 'bg-success text-white',
    expired: 'bg-error text-white',
    paused: 'bg-gray-400 text-white',
  };
  return classes[status as keyof typeof classes] || classes.active;
}
```

### 4.3 Form Component Template

```typescript
// components/find-buddy/forms/CreateListingForm.tsx
'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateListingSchema, CreateListingInput } from '@/lib/find-buddy/validation';
import { LOCATIONS, DIVE_LEVELS, DIVE_TYPES } from '@/lib/find-buddy/constants';

interface CreateListingFormProps {
  onSubmit: (data: CreateListingInput) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export function CreateListingForm({
  onSubmit,
  isLoading = false,
  initialData,
}: CreateListingFormProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
  } = useForm<CreateListingInput>({
    resolver: zodResolver(CreateListingSchema),
    defaultValues: initialData,
    mode: 'onBlur',
  });

  const diveTypes = watch('diveTypes');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-6 max-w-2xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}
    >
      {/* Location */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          📍 {isRTL ? 'מיקום' : 'Location'} *
        </label>
        <select
          {...register('location')}
          className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="">Select location...</option>
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
        {errors.location && (
          <p className="text-error text-sm mt-1">{errors.location.message}</p>
        )}
      </div>

      {/* Date Range */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <label className="block text-sm font-semibold mb-2">
            {isRTL ? 'מתאריך' : 'From'} *
          </label>
          <input
            type="date"
            {...register('dateFrom', { valueAsDate: true })}
            className="w-full px-4 py-2 border border-border-primary rounded-lg"
          />
          {errors.dateFrom && (
            <p className="text-error text-sm mt-1">{errors.dateFrom.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">
            {isRTL ? 'עד תאריך' : 'To'} *
          </label>
          <input
            type="date"
            {...register('dateTo', { valueAsDate: true })}
            className="w-full px-4 py-2 border border-border-primary rounded-lg"
          />
          {errors.dateTo && (
            <p className="text-error text-sm mt-1">{errors.dateTo.message}</p>
          )}
        </div>
      </div>

      {/* Diving Level */}
      <fieldset>
        <legend className="block text-sm font-semibold mb-3">
          🟢 {isRTL ? 'רמת צלילה' : 'Diving Level'} *
        </legend>
        <div className="space-y-2">
          {DIVE_LEVELS.map((level) => (
            <label key={level.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                {...register('divingLevel')}
                value={level.value}
                className="w-5 h-5"
              />
              <span className="font-medium">{level.icon} {level.label}</span>
            </label>
          ))}
        </div>
        {errors.divingLevel && (
          <p className="text-error text-sm mt-1">{errors.divingLevel.message}</p>
        )}
      </fieldset>

      {/* Dive Types */}
      <fieldset>
        <legend className="block text-sm font-semibold mb-3">
          🪨 {isRTL ? 'סוג צלילה' : 'Dive Type'} *
        </legend>
        <div className="space-y-2">
          {DIVE_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('diveTypes')}
                value={type.value}
                className="w-5 h-5"
              />
              <span className="font-medium">{type.icon} {type.label}</span>
            </label>
          ))}
        </div>
        {errors.diveTypes && (
          <p className="text-error text-sm mt-1">{errors.diveTypes.message}</p>
        )}
      </fieldset>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          💬 {isRTL ? 'תיאור' : 'Description'} *
        </label>
        <textarea
          {...register('description')}
          rows={5}
          placeholder={isRTL ? 'תאר את עצמך...' : 'Tell other divers about yourself...'}
          className="w-full px-4 py-2 border border-border-primary rounded-lg resize-none focus:ring-2 focus:ring-primary"
        />
        {errors.description && (
          <p className="text-error text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          className="flex-1 px-4 py-3 border border-border-primary rounded-lg font-semibold hover:bg-bg-secondary"
        >
          {isRTL ? 'ביטול' : 'Cancel'}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          {isSubmitting || isLoading ? '...' : isRTL ? 'שמור' : 'Save Listing'}
        </button>
      </div>
    </form>
  );
}
```

---

## 5. API Client Pattern

### 5.1 API Client Wrapper

```typescript
// lib/find-buddy/api-client.ts
import { Listing, ContactRequest, CreateListingPayload, FilterPayload } from '@/types/find-buddy';

const API_BASE = '/api/find-buddy';

class FindBuddyApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Listings
  async getMyListings(): Promise<Listing[]> {
    return this.request('/listings/mine');
  }

  async createListing(payload: CreateListingPayload): Promise<Listing> {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateListing(id: string, payload: Partial<Listing>): Promise<Listing> {
    return this.request(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteListing(id: string): Promise<void> {
    return this.request(`/listings/${id}`, { method: 'DELETE' });
  }

  // Browse
  async getBrowseListings(filters: FilterPayload): Promise<Listing[]> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return this.request(`/listings/browse?${query}`);
  }

  // Contact Requests
  async getContactRequests(): Promise<ContactRequest[]> {
    return this.request('/requests/received');
  }

  async createContactRequest(toListingId: string, message: string): Promise<ContactRequest> {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify({ toListingId, message }),
    });
  }

  async approveRequest(requestId: string, message?: string): Promise<void> {
    return this.request(`/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async declineRequest(requestId: string): Promise<void> {
    return this.request(`/requests/${requestId}/decline`, { method: 'POST' });
  }
}

export const apiClient = new FindBuddyApiClient();
```

---

## 6. Custom Hooks

### 6.1 useLocalStorage Hook

```typescript
// lib/find-buddy/hooks.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get from local storage then parse stored json
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    setIsLoaded(true);
  }, [key]);

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue: typeof setStoredValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isLoaded] as const;
}
```

### 6.2 useInfiniteScroll Hook

```typescript
// lib/find-buddy/hooks.ts
export function useInfiniteScroll(
  callback: () => Promise<void>,
  hasMore: boolean,
  isLoading: boolean
) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [callback, hasMore, isLoading]);

  return observerTarget;
}
```

---

## 7. Testing Strategy

### 7.1 Store Unit Tests

```typescript
// stores/find-buddy-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFindBuddyStore } from './find-buddy-store';
import * as apiClient from '@/lib/find-buddy/api-client';

jest.mock('@/lib/find-buddy/api-client');

describe('FindBuddyStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch my listings', async () => {
    const mockListings = [
      { id: '1', location: 'Eilat', status: 'active' },
    ];
    (apiClient.getMyListings as jest.Mock).mockResolvedValue(mockListings);

    const { result } = renderHook(() => useFindBuddyStore());

    await act(async () => {
      await result.current.fetchMyListings();
    });

    expect(result.current.myListings).toEqual(mockListings);
  });

  // More tests...
});
```

### 7.2 Component Integration Tests

```typescript
// Example Playwright E2E test
test('Create and view a buddy listing', async ({ page }) => {
  // Login
  await page.goto('/en/find-buddy');
  
  // Click create listing
  await page.click('button:has-text("Create Listing")');
  
  // Fill form
  await page.selectOption('select', 'eilat');
  await page.fill('input[type="date"]:first-of-type', '2026-06-25');
  await page.fill('input[type="date"]:last-of-type', '2026-06-28');
  await page.click('input[value="intermediate"]');
  await page.check('input[value="reef"]');
  await page.fill('textarea', 'Looking for a buddy...');
  
  // Submit
  await page.click('button:has-text("Save Listing")');
  
  // Verify success
  await expect(page).toContainText('Listing created');
  await expect(page.locator('[aria-label="Eilat, Israel"]')).toBeVisible();
});
```

---

## 8. Performance Optimization

### 8.1 Image Optimization

```typescript
// Use next/image for optimization
import Image from 'next/image';

<Image
  src={blurredImageUrl}
  alt="User profile (blurred)"
  width={200}
  height={200}
  className="rounded-lg blur-lg"
  loading="lazy"
/>
```

### 8.2 Code Splitting

```typescript
// Use dynamic imports for modals
import dynamic from 'next/dynamic';

const ContactRevealModal = dynamic(
  () => import('@/components/find-buddy/modals/ContactRevealModal'),
  { loading: () => <div>Loading...</div> }
);
```

### 8.3 Memoization

```typescript
import { memo } from 'react';

// Prevent unnecessary re-renders
export const ListingCard = memo(function ListingCard({ listing }: Props) {
  return (/* ... */);
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.listing.id === nextProps.listing.id;
});
```

---

## 9. Internationalization (i18n)

### 9.1 Translation Keys Structure

```json
{
  "findBuddy": {
    "title": "Find Buddy",
    "tabs": {
      "myListings": "My Listings",
      "browseBuddies": "Browse Buddies"
    },
    "myListings": {
      "empty": "No listings yet",
      "createButton": "Create Listing"
    },
    "browseBuddies": {
      "empty": "No buddies match your filters",
      "interested": "I'm Interested",
      "reveal": "Reveal & Contact"
    }
  }
}
```

### 9.1 Usage in Components

```typescript
import { useTranslations } from 'next-intl';

export function MyListingsSection() {
  const t = useTranslations('findBuddy.myListings');
  
  return (
    <h2>{t('title')}</h2>
  );
}
```

---

This architecture provides a solid foundation for building the Find Buddy feature with best practices for scalability, maintainability, and performance.
