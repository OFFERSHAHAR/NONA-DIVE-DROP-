# Find Buddy - UI/UX Design Document

## Project Overview
**Feature**: Find Buddy - Diving Partner Matching System
**Route**: `[locale]/find-buddy`
**Protection**: Authenticated users only (redirect to login if not authenticated)
**Languages**: Hebrew (RTL) and English (LTR)
**Framework**: Next.js 16+ with React 19, Tailwind CSS, Zustand, TypeScript
**Status**: Design Phase - Ready for Implementation

---

## 1. File Structure

```
src/
├── app/
│   └── [locale]/
│       └── find-buddy/
│           ├── page.tsx                 # Main page with server-side auth
│           ├── layout.tsx               # Layout wrapper
│           └── client.tsx               # Client-side wrapper
│
├── components/
│   └── find-buddy/
│       ├── sections/
│       │   ├── MyListingsSection.tsx    # "My Listings" tab content
│       │   ├── BrowseBuddiesSection.tsx # "Browse Buddies" tab content
│       │   └── TabNavigation.tsx        # Tab switcher
│       │
│       ├── forms/
│       │   ├── CreateListingForm.tsx    # Create/edit listing form
│       │   ├── FilterPanel.tsx          # Browse filters sidebar
│       │   └── SortDropdown.tsx         # Sort options
│       │
│       ├── cards/
│       │   ├── ListingCard.tsx          # Browse buddy card (profile blur)
│       │   ├── MyListingCard.tsx        # My listing card (own listings)
│       │   └── InquiryBadge.tsx         # Show interested count
│       │
│       ├── modals/
│       │   ├── ContactRevealModal.tsx   # Reveal contact when interested
│       │   ├── ConfirmDeleteModal.tsx   # Delete listing confirmation
│       │   └── MessageModal.tsx         # Send message to interested user
│       │
│       ├── states/
│       │   ├── EmptyStateMyListings.tsx
│       │   ├── EmptyStateBrowse.tsx
│       │   └── LoadingState.tsx
│       │
│       └── shared/
│           ├── DivingLevelBadge.tsx     # Visual level indicator
│           ├── DiveTypeBadge.tsx        # Dive type badge
│           └── LocationTag.tsx          # Location display
│
├── stores/
│   └── find-buddy-store.ts              # Zustand store (listings, filters, modals)
│
├── types/
│   └── find-buddy.ts                    # Type definitions
│
├── lib/
│   └── find-buddy/
│       ├── validation.ts                # Zod schemas
│       ├── constants.ts                 # Static data (levels, types, etc.)
│       ├── helpers.ts                   # Utility functions
│       └── api-client.ts                # API call wrapper
│
└── styles/
    └── find-buddy.css                   # Component-specific styles
```

---

## 2. Route Map

| Route | Purpose | Auth Required | Component |
|-------|---------|---------------|-----------|
| `[locale]/find-buddy` | Main page (tab switcher) | ✅ Yes | `page.tsx` |
| `[locale]/find-buddy?tab=my-listings` | My Listings tab (default) | ✅ Yes | `MyListingsSection.tsx` |
| `[locale]/find-buddy?tab=browse` | Browse Buddies tab | ✅ Yes | `BrowseBuddiesSection.tsx` |

**Query Parameters**:
- `tab`: `my-listings` or `browse` (default: `my-listings`)
- `filter_location`: Filter by location
- `filter_level`: Filter by diving level
- `filter_type`: Filter by dive type
- `sort`: `newest` or `expiring_soon`

---

## 3. Component List (20+ Components)

### Page & Layout (3)
- `page.tsx` - Main page, auth check, layout setup
- `layout.tsx` - Page-specific layout
- `client.tsx` - Client wrapper for client-side logic

### Section Components (3)
- `TabNavigation.tsx` - Tab switcher (My Listings / Browse Buddies)
- `MyListingsSection.tsx` - My listings display & management
- `BrowseBuddiesSection.tsx` - Browse listings with filters

### Forms (3)
- `CreateListingForm.tsx` - Create/edit listing form with validation
- `FilterPanel.tsx` - Filter sidebar for browse section
- `SortDropdown.tsx` - Sort options dropdown

### Cards (3)
- `ListingCard.tsx` - Browse card with blurred profile
- `MyListingCard.tsx` - My listing card with edit/delete
- `InquiryBadge.tsx` - Shows count of interested users

### Modals (3)
- `ContactRevealModal.tsx` - Reveal contact + message
- `ConfirmDeleteModal.tsx` - Delete listing confirmation
- `MessageModal.tsx` - Send message to interested user

### UI Components (5)
- `DivingLevelBadge.tsx` - Level display (beginner/intermediate/advanced)
- `DiveTypeBadge.tsx` - Dive type display (reef/boat/cave)
- `LocationTag.tsx` - Location display with icon
- `DateRangeDisplay.tsx` - Shows date range nicely
- `ProfileBlurOverlay.tsx` - Blurred profile with reveal button

### Empty & Loading States (3)
- `EmptyStateMyListings.tsx` - No listings yet
- `EmptyStateBrowse.tsx` - No results after filter
- `LoadingState.tsx` - Skeleton loaders

### Supporting (2+)
- `useLocalStorage.ts` - Draft form persistence
- `useInfiniteScroll.ts` - Lazy load browsing listings
- Helpers & constants

---

## 4. Wireframes

### 4.1 My Listings Tab (Default)

```
┌─────────────────────────────────────────────────────┐
│ DiveDrop         Find Buddy              🔔 (3)     │ <- Header
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 My Listings    🔍 Browse Buddies   <- Tabs      │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ ┌──────────────────────┐  ┌──────────────────────┐ │
│ │ STATUS: ACTIVE  [×]  │  │ STATUS: ACTIVE  [×]  │ │
│ │                      │  │                      │ │
│ │ 📍 Eilat, Israel     │  │ 📍 Eilat, Israel     │ │
│ │ 🗓️ Jun 25-28, 2026   │  │ 🗓️ Jun 25-28, 2026   │ │
│ │ 🟢 Intermediate      │  │ 🟢 Intermediate      │ │
│ │ 🪨 Reef              │  │ 🪨 Reef              │ │
│ │                      │  │                      │ │
│ │ Looking for a buddy  │  │ Looking for a buddy  │ │
│ │ who enjoys...        │  │ who enjoys...        │ │
│ │                      │  │                      │ │
│ │ 👥 3 interested      │  │ 👥 0 interested      │ │
│ │ [Edit] [View Reqs]   │  │ [Edit] [View Reqs]   │ │
│ └──────────────────────┘  └──────────────────────┘ │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ ➕ Create New Listing                      │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
                  <- Bottom Nav
```

### 4.2 Create Listing Form

```
┌─────────────────────────────────────────────────────┐
│ DiveDrop         Create Listing             ✓       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📍 Location *                                      │
│  ┌──────────────────────────────────────┐          │
│  │ Select Location ▼                    │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  📅 Diving Period *                                 │
│  From:  [Jun 25, 2026]    To: [Jun 28, 2026]      │
│                                                     │
│  🟢 Diving Level *                                  │
│  ○ Beginner  ○ Intermediate  ○ Advanced            │
│                                                     │
│  🪨 Dive Type *                                     │
│  □ Reef  □ Boat  □ Cave                            │
│                                                     │
│  💬 Description                                     │
│  ┌──────────────────────────────────────┐          │
│  │ Tell other divers about yourself...  │          │
│  │                                      │          │
│  │                                      │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  [Cancel]  [Save Listing]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.3 Browse Buddies Tab

```
┌─────────────────────────────────────────────────────┐
│ DiveDrop         Find Buddy              🔔 (3)     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 My Listings    🔍 Browse Buddies   <- Tabs      │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ [🔍 Search Buddy]              [Sort: Newest ▼]   │
│                                                     │
│ Filters ▼                                           │
│ ├─ 📍 Location: All                               │
│ ├─ 🗓️ Date Range: Any                             │
│ ├─ 🟢 Level: Intermediate                         │
│ ├─ 🪨 Type: Reef                                  │
│ └─ [Reset Filters]                                │
│                                                     │
│ ┌────────────────────────────────────────────┐    │
│ │ 🫀 A.M. (Initials Blur)   🌊 Profile Blur │    │
│ │                                            │    │
│ │ 📍 Eilat, Israel                           │    │
│ │ 🗓️ Jun 25-28, 2026                         │    │
│ │ 🟢 Intermediate  🪨 Reef                   │    │
│ │                                            │    │
│ │ "Looking for friendly diver..."            │    │
│ │                                            │    │
│ │ [🔗 I'm Interested]  [👁️ Reveal & Contact]│    │
│ └────────────────────────────────────────────┘    │
│                                                     │
│ ┌────────────────────────────────────────────┐    │
│ │ 🫀 J.D. (Initials Blur)   🌊 Profile Blur │    │
│ │                                            │    │
│ │ 📍 Red Sea, Egypt                          │    │
│ │ 🗓️ Jul 1-5, 2026                           │    │
│ │ 🟢 Advanced  ⛵ Boat                        │    │
│ │                                            │    │
│ │ "Experienced diver seeking..."             │    │
│ │                                            │    │
│ │ [🔗 I'm Interested]  [👁️ Reveal & Contact]│    │
│ └────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.4 Contact Reveal Modal

```
┌─────────────────────────────────────────────────────┐
│ ✓ Contact Request from Sarah M.                 [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 👤 Sarah M. wants to connect!                      │
│                                                     │
│ Her diving details:                                 │
│ 📍 Eilat, Israel                                    │
│ 🗓️ Jun 25-28, 2026                                 │
│ 🟢 Intermediate  🪨 Reef                            │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ Contact Information:                                │
│ 📧 sarah.m@email.com                               │
│ 📱 +972-54-XXX-XXXX                                │
│ 💬 Telegram: @sarah_diver                          │
│                                                     │
│ Message from Sarah:                                 │
│ "Hi! I'm excited to dive with you!"                │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ Your Response (optional):                           │
│ ┌──────────────────────────────────────┐          │
│ │ Type a message...                    │          │
│ └──────────────────────────────────────┘          │
│                                                     │
│ [Decline]  [Approve & Reply]                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Zustand Store Structure

```typescript
// stores/find-buddy-store.ts

interface Listing {
  id: string;
  userId: string;
  location: string;
  dateFrom: Date;
  dateTo: Date;
  divingLevel: 'beginner' | 'intermediate' | 'advanced';
  diveTypes: ('reef' | 'boat' | 'cave')[];
  description: string;
  status: 'active' | 'expired' | 'paused';
  createdAt: Date;
  expiresAt: Date;
  interestedCount: number;
}

interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  toListingId: string;
  status: 'pending' | 'approved' | 'declined';
  message?: string;
  userContactInfo: {
    email: string;
    phone: string;
    telegram?: string;
  };
  createdAt: Date;
}

interface FilterState {
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  divingLevel?: 'beginner' | 'intermediate' | 'advanced';
  diveType?: 'reef' | 'boat' | 'cave';
  sortBy: 'newest' | 'expiring_soon';
}

interface BuddyStore {
  // My Listings
  myListings: Listing[];
  loadingMyListings: boolean;
  fetchMyListings: () => Promise<void>;
  createListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;

  // Browse
  browseListing: Listing[];
  loadingBrowse: boolean;
  hasMore: boolean;
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  fetchBrowseListing: () => Promise<void>;
  fetchMoreListing: () => Promise<void>;

  // Contact Requests
  contactRequests: ContactRequest[];
  loadingRequests: boolean;
  fetchContactRequests: () => Promise<void>;
  createRequest: (toListingId: string, message: string) => Promise<void>;
  approveRequest: (requestId: string, response: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;

  // Modal States
  modals: {
    contactReveal: {
      isOpen: boolean;
      requestId?: string;
    };
    confirmDelete: {
      isOpen: boolean;
      listingId?: string;
    };
    message: {
      isOpen: boolean;
      recipientId?: string;
    };
  };
  openContactRevealModal: (requestId: string) => void;
  closeContactRevealModal: () => void;
  openDeleteConfirm: (listingId: string) => void;
  closeDeleteConfirm: () => void;
  openMessageModal: (recipientId: string) => void;
  closeMessageModal: () => void;
}
```

---

## 6. Type Definitions

```typescript
// types/find-buddy.ts

export type DivingLevel = 'beginner' | 'intermediate' | 'advanced';
export type DiveType = 'reef' | 'boat' | 'cave';
export type ListingStatus = 'active' | 'expired' | 'paused';
export type RequestStatus = 'pending' | 'approved' | 'declined';
export type SortOption = 'newest' | 'expiring_soon';

export interface Listing {
  id: string;
  userId: string;
  location: string;
  dateFrom: string; // ISO string
  dateTo: string;   // ISO string
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
  toUserId: string;
  toListingId: string;
  fromUser: BuddyProfile;
  status: RequestStatus;
  message?: string;
  contactInfo: {
    email: string;
    phone: string;
    telegram?: string;
  };
  createdAt: string;
  respondedAt?: string;
}

export interface ListingWithProfile extends Listing {
  userProfile: BuddyProfile;
}

export interface CreateListingPayload {
  location: string;
  dateFrom: string;
  dateTo: string;
  divingLevel: DivingLevel;
  diveTypes: DiveType[];
  description: string;
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
```

---

## 7. Validation Schemas (Zod)

```typescript
// lib/find-buddy/validation.ts

import { z } from 'zod';

export const DivingLevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export const DiveTypeEnum = z.enum(['reef', 'boat', 'cave']);

export const CreateListingSchema = z.object({
  location: z.string().min(2, 'Location is required').max(100),
  dateFrom: z.date().min(new Date(), 'Start date must be in future'),
  dateTo: z.date(),
  divingLevel: DivingLevelEnum,
  diveTypes: z.array(DiveTypeEnum).min(1, 'Select at least one dive type'),
  description: z.string().min(10, 'Description too short').max(500),
}).refine(
  (data) => data.dateTo > data.dateFrom,
  { message: 'End date must be after start date', path: ['dateTo'] }
);

export const ContactRequestSchema = z.object({
  toListingId: z.string().uuid(),
  message: z.string().min(10, 'Message too short').max(300),
});

export const FilterSchema = z.object({
  location: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  divingLevel: DivingLevelEnum.optional(),
  diveType: DiveTypeEnum.optional(),
  sortBy: z.enum(['newest', 'expiring_soon']).default('newest'),
}).partial();

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type ContactRequestInput = z.infer<typeof ContactRequestSchema>;
export type FilterInput = z.infer<typeof FilterSchema>;
```

---

## 8. Implementation Checklist

### Phase 1: Setup & Infrastructure (Week 1)
- [ ] Create directory structure
- [ ] Set up types and schemas
- [ ] Create Zustand store with actions
- [ ] Create API client wrapper
- [ ] Set up constants (locations, levels, etc.)
- [ ] Create utility helpers

### Phase 2: Page & Layouts (Week 1)
- [ ] Create `[locale]/find-buddy/page.tsx` with auth
- [ ] Create `layout.tsx`
- [ ] Create `client.tsx` wrapper
- [ ] Implement protected route middleware
- [ ] Set up error boundary

### Phase 3: UI Components (Week 2)
- [ ] `TabNavigation.tsx` - Tab switcher
- [ ] `DivingLevelBadge.tsx`
- [ ] `DiveTypeBadge.tsx`
- [ ] `LocationTag.tsx`
- [ ] `DateRangeDisplay.tsx`
- [ ] `ProfileBlurOverlay.tsx`

### Phase 4: My Listings Section (Week 2)
- [ ] `MyListingsSection.tsx` - Container
- [ ] `CreateListingForm.tsx` - Form with validation
- [ ] `MyListingCard.tsx` - Card display
- [ ] `InquiryBadge.tsx` - Interest counter
- [ ] `EmptyStateMyListings.tsx`
- [ ] `LoadingState.tsx` skeletons

### Phase 5: Browse Section (Week 3)
- [ ] `BrowseBuddiesSection.tsx` - Container
- [ ] `ListingCard.tsx` - Browse card
- [ ] `FilterPanel.tsx` - Filter sidebar
- [ ] `SortDropdown.tsx` - Sort options
- [ ] `EmptyStateBrowse.tsx`
- [ ] Infinite scroll implementation

### Phase 6: Modals & Interactions (Week 3)
- [ ] `ContactRevealModal.tsx` - Reveal contact
- [ ] `ConfirmDeleteModal.tsx` - Delete confirmation
- [ ] `MessageModal.tsx` - Send message
- [ ] Connect to store actions
- [ ] Toast notifications

### Phase 7: Mobile Optimization (Week 4)
- [ ] Test responsive breakpoints
- [ ] Optimize touch targets (48px minimum)
- [ ] Optimize modals for mobile
- [ ] Test RTL/LTR rendering
- [ ] Optimize images & lazy loading

### Phase 8: Testing & Refinement (Week 4)
- [ ] Unit tests for store
- [ ] Component tests
- [ ] Integration tests
- [ ] E2E tests with Playwright
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 9: Polish & Deploy (Week 5)
- [ ] Error handling & edge cases
- [ ] Loading states
- [ ] Empty states
- [ ] Analytics tracking
- [ ] Documentation
- [ ] Deployment & monitoring

---

## 9. Design Requirements

### Colors & Styling
- **Primary**: `#006b9e` (DiveDrop blue)
- **Success**: `#10b981` (Green for active)
- **Warning**: `#f59e0b` (Amber for expiring)
- **Error**: `#ef4444` (Red for expired/delete)
- **RTL Support**: Use `flex-row-reverse` for RTL contexts
- **Responsive**: Mobile-first with breakpoints at 640px, 768px, 1024px

### Typography
- **Headings**: `font-bold` with 3xl-4xl sizes
- **Body**: `font-normal` with sm-base sizes
- **Labels**: `font-semibold` with xs-sm sizes
- **Truncation**: Use `line-clamp-2` for descriptions

### Spacing
- **Padding**: 4, 6, 8 units (16px, 24px, 32px)
- **Gaps**: 2, 3, 4 units between components
- **Margins**: 6, 8 units for major sections

### Accessibility
- [ ] All buttons have clear labels
- [ ] Form fields have labels and descriptions
- [ ] Focus visible on interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Keyboard navigation support
- [ ] Color contrast WCAG AA

### Performance
- **Images**: Lazy load with `loading="lazy"`
- **Lists**: Use windowing for long lists
- **Forms**: Client-side validation before submit
- **Modal**: Don't load until needed
- **Scroll**: Infinite scroll with pagination

### Error Handling
- Network errors with retry button
- Form validation with field-level errors
- User-friendly error messages
- Loading states on all async operations

---

## 10. Sample Data for Development

```typescript
// Mock listings for testing
const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    userId: 'user-2',
    location: 'Eilat, Israel',
    dateFrom: '2026-06-25',
    dateTo: '2026-06-28',
    divingLevel: 'intermediate',
    diveTypes: ['reef'],
    description: 'Looking for a friendly buddy for a week of diving in Eilat. I love exploring reefs and taking photos!',
    status: 'active',
    createdAt: '2026-06-20',
    expiresAt: '2026-06-25',
    interestedCount: 3,
  },
  // ... more listings
];

const LOCATIONS = [
  { value: 'eilat', label: 'Eilat, Israel' },
  { value: 'red-sea', label: 'Red Sea, Egypt' },
  { value: 'hawaii', label: 'Hawaii, USA' },
  { value: 'cayman', label: 'Cayman Islands' },
  { value: 'bali', label: 'Bali, Indonesia' },
];
```

---

## 11. Next Steps

1. **Review with stakeholders** - Confirm design direction
2. **Set up backend API** - Database schema and endpoints
3. **Begin implementation** - Start with Phase 1
4. **Regular demos** - Weekly progress reviews
5. **User testing** - Gather feedback early

---

## 12. Future Enhancements

- [ ] Buddy matching algorithm (recommend compatible divers)
- [ ] Ratings & reviews system for matched divers
- [ ] Integrated messaging/chat with notifications
- [ ] Calendar integration for dive planning
- [ ] Payment processing for group dive packages
- [ ] Social features (followers, buddy groups)
- [ ] Statistics dashboard (dives logged, locations visited)
- [ ] Integration with dive certification databases
