# Find Buddy - Detailed Wireframes & User Flows

## Table of Contents
1. Page Layouts
2. Component Specifications
3. User Flows
4. Mobile Interactions
5. Responsive Breakpoints
6. RTL/LTR Considerations

---

## 1. Page Layouts

### 1.1 Find Buddy Main Page (Desktop - 1024px+)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🌊 DiveDrop            Find Buddy                        🔔 (3)       ☰      │ Header (h-16)
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 My Listings           🔍 Browse Buddies                             │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │ │
│  │  │ Listing 1        │  │ Listing 2        │  │ Listing 3        │   │ │
│  │  │                  │  │                  │  │                  │   │ │
│  │  │ [Card Content]   │  │ [Card Content]   │  │ [Card Content]   │   │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │ │
│  │                                                                         │ │
│  │  ┌──────────────────┐  ┌──────────────────────────────────────────┐ │ │
│  │  │ + Create Listing │  │ (Empty space or more listings)           │ │ │
│  │  └──────────────────┘  └──────────────────────────────────────────┘ │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Browse Section (Desktop - 1024px+)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🌊 DiveDrop            Find Buddy                        🔔 (3)       ☰      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │  FILTERS           │  │ Listing 1              [Sort: Newest ▼]         │ │
│  │  ────────────────  │  ├─────────────────────────────────────────────────┤ │
│  │                    │  │ ┌──────────────────────────────────────────┐    │ │
│  │  📍 Location       │  │ │ 🫀 A.M. [Blur]  🌊                      │    │ │
│  │  ├─ All            │  │ │ 📍 Eilat, Israel                         │    │ │
│  │  ├─ Eilat          │  │ │ 🗓️ Jun 25-28, 2026                      │    │ │
│  │  ├─ Red Sea        │  │ │ 🟢 Intermediate  🪨 Reef                 │    │ │
│  │  └─ Hawaii         │  │ │ "Looking for friendly..."               │    │ │
│  │                    │  │ │ [I'm Interested] [Reveal & Contact]     │    │ │
│  │  🗓️ Date Range     │  │ └──────────────────────────────────────────┘    │ │
│  │  From: [--------]  │  │                                                 │ │
│  │  To:   [--------]  │  │ Listing 2                                       │ │
│  │                    │  │ ├─────────────────────────────────────────────────┤
│  │  🟢 Level          │  │ │ ┌──────────────────────────────────────────┐   │ │
│  │  ├─ All            │  │ │ │ 🫀 J.D. [Blur]  🌊                      │   │ │
│  │  ├─ Beginner       │  │ │ │ 📍 Red Sea, Egypt                        │   │ │
│  │  ├─ Intermediate   │  │ │ │ 🗓️ Jul 1-5, 2026                        │   │ │
│  │  └─ Advanced       │  │ │ │ 🟢 Advanced  ⛵ Boat                     │   │ │
│  │                    │  │ │ │ "Experienced diver..."                 │   │ │
│  │  🪨 Dive Type      │  │ │ │ [I'm Interested] [Reveal & Contact]     │   │ │
│  │  ├─ Reef           │  │ │ └──────────────────────────────────────────┘   │ │
│  │  ├─ Boat           │  │ │                                                │ │
│  │  └─ Cave           │  │ │ [Load More...]                                │ │
│  │                    │  │ │                                                │ │
│  │  [Reset Filters]   │  │ └─────────────────────────────────────────────────┘ │
│  └────────────────────┘  │                                                 │
│                          └─────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Mobile Layout - My Listings (375px)

```
┌────────────────────────────┐
│ 🌊 DiveDrop      🔔 (3) ☰  │ h-16
├────────────────────────────┤
│                            │
│ 📋 My... 🔍 Browse...      │ Tabs (scrollable)
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                            │
│ ┌──────────────────────┐   │
│ │ Listing 1            │   │
│ │ STATUS: ACTIVE       │   │
│ │ 📍 Eilat, Israel     │   │
│ │ 🗓️ Jun 25-28, 2026   │   │
│ │ 🟢 Intermediate      │   │
│ │ 🪨 Reef              │   │
│ │ "Looking for buddy"  │   │
│ │ 👥 3 interested      │   │
│ │ [Edit] [View Reqs]   │   │
│ └──────────────────────┘   │
│                            │
│ ┌──────────────────────┐   │
│ │ Listing 2            │   │
│ │ STATUS: ACTIVE       │   │
│ │ [Card Content]       │   │
│ └──────────────────────┘   │
│                            │
│ ┌──────────────────────┐   │
│ │ ➕ Create Listing    │   │
│ └──────────────────────┘   │
│                            │
├────────────────────────────┤
│  🏠 📍 🤿 📊 👤 ⚙️  (Nav)  │
└────────────────────────────┘
```

### 1.4 Mobile Layout - Browse (375px)

```
┌────────────────────────────┐
│ 🌊 DiveDrop      🔔 (3) ☰  │
├────────────────────────────┤
│                            │
│ 📋 My... 🔍 Browse...      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                            │
│ [🔍 Search] [Sort ▼]       │
│ [Filters ▼]                │
│                            │
│ ┌──────────────────────┐   │
│ │ 🫀 A.M. [Blur]      │   │
│ │ 🌊 Profile Image    │   │
│ │ 📍 Eilat, Israel     │   │
│ │ 🗓️ Jun 25-28, 2026   │   │
│ │ 🟢 Intermediate      │   │
│ │ 🪨 Reef              │   │
│ │ "Looking for..."     │   │
│ │ [I'm Interested]     │   │
│ │ [Reveal & Contact]   │   │
│ └──────────────────────┘   │
│                            │
│ ┌──────────────────────┐   │
│ │ 🫀 J.D. [Blur]      │   │
│ │ [Card Content]       │   │
│ └──────────────────────┘   │
│                            │
│ [Load More...]             │
│                            │
├────────────────────────────┤
│  🏠 📍 🤿 📊 👤 ⚙️  (Nav)  │
└────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 My Listing Card (Own Listings)

**States**: `active`, `expired`, `paused`

```
┌────────────────────────────────────┐
│ STATUS: ACTIVE      [•••]          │ <- Status badge + more menu
│                                    │
│ 📍 Eilat, Israel                   │ <- Location
│ 🗓️ Jun 25-28, 2026                 │ <- Date range
│ 🟢 Intermediate  🪨 Reef  ⛵ Boat   │ <- Level & types
│                                    │
│ "Looking for a friendly diving     │ <- Description (2-3 lines)
│ buddy who enjoys..."               │
│                                    │
│ ────────────────────────────────── │
│ 👥 3 interested                    │ <- Interest count with avatar
│ [Edit Listing] [View Requests]     │ <- Action buttons
│                                    │
└────────────────────────────────────┘
```

**Responsive**:
- Desktop: Full card with side-by-side buttons
- Mobile: Stacked buttons, smaller text

**Status Badge Colors**:
- `active`: Green (#10b981)
- `expired`: Red (#ef4444)
- `paused`: Gray (#6b7280)

---

### 2.2 Browse Listing Card (Other Users)

```
┌─────────────────────────────────────┐
│ 🫀 A.M. (Initials)  🌊 Blur        │ <- Profile blur with initials
│ 📍 Eilat, Israel                    │ <- Location
│ 🗓️ Jun 25-28, 2026                  │ <- Date range
│ 🟢 Intermediate  🪨 Reef            │ <- Level & types
│                                     │
│ "Looking for a friendly buddy who   │ <- Description
│ enjoys exploring new sites..."      │
│                                     │
│ [🔗 I'm Interested] [👁️ Reveal]   │ <- Action buttons
│                                     │
└─────────────────────────────────────┘
```

**Profile Blur States**:
- **Default**: Blurred image with user initials overlay
- **Hover**: Slightly less blur with "Reveal & Contact" hint
- **After Interest**: Show user option to reveal full profile

**Actions**:
- `I'm Interested`: Creates request without revealing user
- `Reveal & Contact`: Immediately shows contact modal

---

### 2.3 Create Listing Form

```
FORM STRUCTURE:

[Location Selection]
  <Select>
    - Eilat, Israel
    - Red Sea, Egypt
    - Hawaii, USA
    - ...
  </Select>

[Diving Period]
  <DatePicker from> | <DatePicker to>
  Helper: "Min 2 days, Max 60 days"

[Diving Level] *
  Radio buttons (3 options):
    ○ 🔵 Beginner - Basic cert, shallow dives
    ○ 🟢 Intermediate - 50+ dives, 20m depth
    ○ 🔴 Advanced - 100+ dives, deep/specialty

[Dive Type] *
  Checkboxes (3 options):
    ☑ 🪨 Reef - Colorful sites
    ☑ ⛵ Boat - Deep diving
    ☐ 🔦 Cave - Technical diving

[Description] *
  <Textarea rows="5">
    - Placeholder: "Tell other divers about yourself..."
    - Min: 10 chars, Max: 500 chars
    - Character counter below

[Action Buttons]
  [Cancel] [Clear] [Save Listing]

VALIDATION:
✓ Location: Required
✓ Dates: Required, future, end > start
✓ Level: Required
✓ Types: At least 1 required
✓ Description: 10-500 chars
✓ Success toast: "Listing created!"
✓ Error toast: Show field-level errors
```

---

### 2.4 Filter Panel (Desktop) / Filter Modal (Mobile)

```
DESKTOP (Sidebar):
┌──────────────────┐
│ FILTERS          │
│ ────────────────│
│                  │
│ 📍 Location      │
│ ┌──────────────┐ │
│ │ All        ▼ │ │
│ └──────────────┘ │
│                  │
│ 🗓️ Date Range    │
│ From: ┌───────┐  │
│       │ Dates │  │
│       └───────┘  │
│ To:   ┌───────┐  │
│       │ Dates │  │
│       └───────┘  │
│                  │
│ 🟢 Level         │
│ ☑ Beginner       │
│ ☑ Intermediate   │
│ ☑ Advanced       │
│                  │
│ 🪨 Dive Type     │
│ ☑ Reef           │
│ ☑ Boat           │
│ ☐ Cave           │
│                  │
│ [Reset Filters]  │
│                  │
└──────────────────┘

MOBILE (Drawer from bottom):
┌──────────────────┐
│ Filters          │
│ ────────────────│
│                  │
│ [Selection UI]   │ (Stacked vertically)
│                  │
│ [Reset]          │
│ [Apply Filters]  │
│                  │
└──────────────────┘
```

---

### 2.5 Contact Reveal Modal

```
┌─────────────────────────────────────┐
│ Contact from Sarah M.          [×]  │ <- Title + close
├─────────────────────────────────────┤
│                                     │
│ 👤 Sarah M. wants to dive with you! │ <- User greeting
│                                     │
│ Her Diving Details:                 │ <- Context section
│ ├─ 📍 Eilat, Israel                │
│ ├─ 🗓️ Jun 25-28, 2026              │
│ ├─ 🟢 Intermediate  🪨 Reef         │
│ └─ "Looking for friendly buddy..."│
│                                     │
│ ═════════════════════════════════ │ <- Divider
│                                     │
│ 📋 Contact Information:              │ <- Contact section
│ ├─ 📧 sarah.m@email.com             │
│ ├─ 📱 +972-54-XXX-XXXX              │
│ └─ 💬 Telegram: @sarah_diver        │
│ [Copy Contact Info]                 │
│                                     │
│ 💬 Message from Sarah:               │ <- Message section
│ "Hi! I'm really excited about       │
│  diving with you in Eilat. I've     │
│  been diving for 5 years and love   │
│  exploring reefs..."                │
│                                     │
│ ═════════════════════════════════ │
│                                     │
│ Your Response (Optional):            │ <- Reply section
│ ┌─────────────────────────────────┐ │
│ │ Type a message to Sarah...      │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Decline Contact] [Approve & Reply] │ <- Actions
│                                     │
└─────────────────────────────────────┘

MOBILE VERSION:
- Full screen or large bottom sheet
- Stacked layout
- Touch-friendly buttons (48px min height)
```

---

### 2.6 Tab Navigation

```
DESKTOP:
┌─────────────────────────────────────┐
│ 📋 My Listings    🔍 Browse Buddies │
│ ─────────────────────────────────── │
│ (Active tab has border-bottom)       │
└─────────────────────────────────────┘

MOBILE:
┌─────────────────────────────────┐
│ 📋 My...   🔍 Browse...        │ (Scrollable if needed)
│ ─────────────────────────────── │
└─────────────────────────────────┘

TAB STATES:
- Active: 
  ├─ Text color: #006b9e (primary)
  ├─ Bottom border: 2px #006b9e
  └─ Font weight: semibold

- Inactive:
  ├─ Text color: text-secondary
  ├─ Bottom border: none
  └─ Font weight: normal

- Hover (desktop):
  ├─ Text color: primary
  └─ Opacity: 0.8
```

---

## 3. User Flows

### 3.1 Create Listing Flow

```
START: Click "Create Listing" Button
  ↓
MODAL/PAGE: Show Form
  ├─ Select Location
  ├─ Pick Dates (from-to)
  ├─ Choose Diving Level
  ├─ Select Dive Types
  └─ Write Description
  ↓
VALIDATE: Check all fields
  ├─ No → Show field errors, stay on form
  └─ Yes → Continue
  ↓
SUBMIT: Send to API
  ├─ Loading state: Show spinner
  ├─ Error → Show error toast, stay on form
  └─ Success → Show success toast
  ↓
END: Redirect to My Listings tab, show new listing

KEYBOARD SHORTCUTS (Optional):
- Tab: Move between fields
- Shift+Tab: Move back
- Enter: Submit
- Esc: Cancel
```

### 3.2 Browse & Interest Flow

```
START: User views Browse Buddies tab
  ↓
DISPLAY: Load listings with filters
  ├─ Initial load: Show 10 listings
  ├─ Infinite scroll: Load 10 more at bottom
  └─ Filter changes: Re-fetch with new criteria
  ↓
USER SEES CARD: "I'm Interested" Button
  ↓
CLICK "I'm Interested":
  ├─ Show loading state
  ├─ Create contact request (no reveal)
  └─ Show success toast: "Interest sent! The user can contact you if interested."
  ↓
OR CLICK "Reveal & Contact":
  ├─ Show modal (loading state)
  ├─ Fetch user's contact info
  ├─ Show full modal with contact details
  └─ Allow sending optional message
  ↓
CLICK "Approve & Contact":
  ├─ Send contact info to requesting user
  ├─ Show success: "You've connected!"
  └─ Both users can now see each other's contact
  ↓
END: Users can contact each other directly
```

### 3.3 Manage Listings Flow

```
START: View "My Listings"
  ↓
DISPLAY: Show user's listings
  ├─ Active listings (green badge)
  ├─ Expired listings (red badge)
  └─ Paused listings (gray badge)
  ↓
CLICK "View Requests" on a listing:
  ├─ Show who's interested
  ├─ Display their profile peek
  └─ Options: Approve/Decline/Message
  ↓
CLICK "Edit" on a listing:
  ├─ Open form pre-filled with data
  ├─ Modify fields
  └─ Save changes
  ↓
CLICK "Delete" (via ... menu):
  ├─ Show confirmation modal
  ├─ User confirms
  └─ Delete listing, show toast
  ↓
END: Listing updated or deleted
```

---

## 4. Mobile Interactions

### 4.1 Touch Targets
All interactive elements must be **48px × 48px minimum**:
- Buttons
- Icon buttons
- Form inputs
- Radio buttons (with padding)
- Checkboxes (with padding)
- Links in card content

### 4.2 Tap Feedback
```css
/* Visual feedback on tap */
button:active {
  opacity: 0.7;
  transform: scale(0.98);
}

/* 200ms transition for smooth feedback */
transition: all 200ms ease-in-out;
```

### 4.3 Modal Behavior (Mobile)
- Bottom sheet or full-screen modal
- Swipe down to close
- Tap outside (if applicable) to close
- No background scrolling when modal open
- Safe area padding for notch/island

### 4.4 Keyboard Behavior
- Numeric inputs: Show number keyboard
- Email inputs: Show email keyboard
- Text inputs: Show regular keyboard
- Auto-scroll input into view when focused
- Dismiss keyboard on action

### 4.5 Form Layout (Mobile)
```
┌────────────────────┐
│ Form Title         │
├────────────────────┤
│                    │
│ Label              │ Full width
│ ┌──────────────┐   │
│ │ Input        │   │
│ └──────────────┘   │
│ Helper text        │
│                    │
│ Label              │ Full width
│ ┌──────────────┐   │
│ │ Input        │   │
│ └──────────────┘   │
│ Error message      │
│                    │
│ ┌──────────────┐   │
│ │ [Full Width] │   │
│ │ Submit Btn   │   │
│ └──────────────┘   │
│                    │
└────────────────────┘
```

---

## 5. Responsive Breakpoints

### 5.1 Tailwind Breakpoints

| Breakpoint | Width | Device | Usage |
|-----------|-------|--------|-------|
| Default | < 640px | Mobile | Base styles |
| `sm` | 640px+ | Tablet | Adjust spacing |
| `md` | 768px+ | Tablet/Small Desktop | Grid to 2 cols |
| `lg` | 1024px+ | Desktop | Full layout with sidebar |
| `xl` | 1280px+ | Large Desktop | Max width container |

### 5.2 Grid Layout Changes

```
MOBILE (< 640px):
- 1 column
- Full width cards
- No sidebar filters
- Filters as drawer/modal

SM (640px - 767px):
- 1 column
- Wider padding
- Still no sidebar

MD (768px - 1023px):
- 2 columns for listings
- Filters as collapsible section above
- Sidebar only on full desktop

LG (1024px+):
- 3 columns for listings
- Permanent sidebar (250px)
- Main content area (calc(100% - 250px))
- Filters in sidebar
```

### 5.3 Component Changes

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Header | Hamburger menu | Same | Same |
| Tabs | Scrollable | Full width | Full width |
| Cards | Full width, stacked | 2 cols | 2-3 cols |
| Modal | Full screen | Full screen | Center, 90% width |
| Filter | Bottom drawer | Collapsible | Fixed sidebar |
| Buttons | Full width, 48px | Full width | Inline |

---

## 6. RTL/LTR Considerations

### 6.1 Direction Classes

```tsx
// Use in templates
<div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
  <div>Content 1</div>
  <div>Content 2</div>
</div>

// Or use direction selector in Tailwind
<div className="flex rtl:flex-row-reverse">
```

### 6.2 Common RTL Adjustments

| Element | LTR | RTL |
|---------|-----|-----|
| Flex direction | left to right | right to left |
| Icon alignment | left icons | right icons |
| Text align | left | right |
| Margin | mr-4 | ml-4 |
| Padding | pl-4 | pr-4 |
| Transform | translateX(n) | translateX(-n) |

### 6.3 Badges & Icons

```
LTR: 🟢 Intermediate 🪨 Reef
RTL: 🪨 Reef 🟢 Intermediate

LTR: [Button] Content
RTL: Content [Button]
```

### 6.4 Form Direction

```
LTR:
Label
[Input]
Helper text

RTL:
Label (aligned right)
[Input]
Helper text (aligned right)
```

---

## 7. Animation Specifications

### 7.1 Transitions

```css
/* Fade in/out */
.fade {
  transition: opacity 200ms ease-in-out;
}

/* Slide in from right */
.slide-in-right {
  animation: slideInRight 300ms ease-out;
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Modal backdrop fade */
.modal-backdrop {
  transition: background-color 200ms ease-in-out;
}

/* Hover scale */
.card-hover {
  transition: transform 200ms, box-shadow 200ms;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
```

### 7.2 Loading States

```
Skeleton loader pattern:
┌─────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ (animated gray bars)
│                 │
│ ▓▓▓▓▓▓▓▓       │
│                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓   │
└─────────────────┘

Pulse animation:
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 8. Accessibility Features

### 8.1 Keyboard Navigation

- Tab: Navigate forward through interactive elements
- Shift+Tab: Navigate backward
- Enter: Activate buttons/submit forms
- Space: Toggle checkboxes/radio buttons
- Escape: Close modals/drawers
- Arrow keys: Navigate within selects/menus

### 8.2 Screen Reader Support

```tsx
// Form labels
<label htmlFor="location">📍 Location</label>
<select id="location" aria-label="Select diving location">

// Icon buttons
<button aria-label="Open filters menu">🔍</button>

// Badges
<span role="img" aria-label="Intermediate level">🟢</span>

// Status indicators
<span aria-live="polite" role="status">
  {loadingMessage}
</span>
```

### 8.3 Color Contrast

Ensure WCAG AA compliance (4.5:1 for text):
- Text on white: #000 (21:1)
- Text on primary (#006b9e): #fff (8.5:1)
- Text on gray: Check with tool
- Links: Underline + color

### 8.4 Focus Visible

```css
button:focus-visible,
input:focus-visible {
  outline: 2px solid #006b9e;
  outline-offset: 2px;
}
```

---

## 9. Performance Considerations

### 9.1 Image Optimization

- Profile images: Lazy load with `loading="lazy"`
- Blur effect: Use CSS, not image processing
- Use modern formats (WebP with fallback)
- Srcset for responsive images

### 9.2 List Virtualization

For large lists (100+ items):
- Render only visible items
- Consider `react-window` or `react-virtual`
- Implement `IntersectionObserver` for infinite scroll

### 9.3 Code Splitting

- Modal components: Lazy load
- Form components: Lazy load
- Filter panel: Lazy load on desktop

### 9.4 State Management

- Keep store normalized
- Don't denormalize large objects
- Use selectors for derived state
- Memoize expensive computations

---

## 10. Testing Checklist

### Unit Tests
- [ ] Form validation (Zod schemas)
- [ ] Store actions (create, update, delete)
- [ ] Filter logic
- [ ] Date calculations

### Integration Tests
- [ ] Create listing flow
- [ ] Browse and filter flow
- [ ] Contact reveal flow
- [ ] Approve/decline flow

### E2E Tests (Playwright)
- [ ] Full user journey (new listing → browse → contact)
- [ ] Mobile viewport (375px)
- [ ] Tablet viewport (768px)
- [ ] Desktop viewport (1024px+)
- [ ] RTL rendering
- [ ] Error states

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast (axe-core)
- [ ] Focus management
- [ ] ARIA labels

### Performance Tests
- [ ] Lighthouse scores (75+)
- [ ] Core Web Vitals
- [ ] Bundle size
- [ ] Memory leaks

---

This wireframe document provides the complete visual and interaction specification for the Find Buddy feature.
