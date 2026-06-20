# Dive Site Feedback Card System - Design Specification
**Date:** 2026-06-20  
**Status:** Approved

---

## Overview
A feedback card system that allows divers to report real-time dive conditions (visibility, temperature, currents) and marine life observations after completing a booked dive experience. Data aggregates across multiple feedback entries per dive site to display accurate daily conditions.

---

## Core Features

### 1. Feedback Card Form (Post-Dive)
**Trigger:** After diver completes a booked dive package, feedback card appears

**Fields:**

#### A. Sea Conditions (Sliders)
- **Visibility** (0-50 meters)
  - Numeric input + slider
  - Displays current value
- **Temperature** (Celsius)
  - Numeric input + slider
  - Range: typical diving temps
- **Current Strength** (0-10 scale)
  - Slider only
  - Visual intensity indicator

#### B. Marine Life Observations (Checkboxes)
- 6-8 common species: dolphins, sea turtles, coral, fish schools, rays, seahorses, etc.
- **"Other"** checkbox → reveals free-text field for custom descriptions
  - Example: "Saw a manta ray near university area, 9m depth"

#### C. General Feedback
- Free text field (max 300 characters)
- Label: "Additional notes or observations"
- **Image Upload Button**
  - Max 3 images per feedback card
  - JPEG/PNG only, validated on client + server
  - Compressed before upload

---

### 2. Data Aggregation & Dashboard

**Location:** Dive site detail page → "Conditions Today" section

**Display Format (Non-Cluttered):**

#### Sea Conditions Card
- **Visibility:** Average ± range (e.g., "8m (6-10m)")
- **Temperature:** Average only (e.g., "22°C")
- **Current:** Average only (e.g., "Moderate (5/10)")
- Minimum feedback entries to display: **2**

#### Marine Life Card
- Icon-based with species name + count
- Example: 🐬 Dolphins ×3 | 🐢 Turtles ×1
- Click "View Details" → list of submitted observations with custom "Other" entries

#### Recent Feedback
- "X divers reported conditions" badge
- Expandable list of last 5 feedback entries

---

## Data Model

### Feedback Entity
```
{
  id: uuid
  dive_booking_id: uuid (FK)
  diver_id: uuid (FK)
  dive_site_id: uuid (FK)
  visibility_meters: number
  temperature_celsius: number
  current_strength: 0-10
  marine_life: string[] (selected species)
  marine_life_custom: string (optional, for "Other")
  notes: string (max 300 chars)
  image_urls: string[] (max 3)
  submitted_at: timestamp
  created_at: timestamp
}
```

### Aggregation (Calculated Daily)
```
{
  dive_site_id: uuid
  date: date
  visibility_avg: number
  visibility_min: number
  visibility_max: number
  temperature_avg: number
  current_strength_avg: number
  species_counts: { [species]: count }
  total_feedback_count: number
  cached_at: timestamp
}
```

---

## Integration Points

1. **After Dive Completion**
   - Redirect to feedback card modal/page
   - Pre-fill dive_site_id from booking

2. **Dive Site Detail Page**
   - Add "Conditions Today" section
   - Display aggregated data when count >= 2

3. **Recent Dive Card**
   - Optional: "Added feedback ✓" indicator

---

## Performance & Security

### Performance
- ✅ Aggregations cached (5-minute TTL)
- ✅ Images optimized (max 2MB per file, auto-compress)
- ✅ Lazy-load "View Details" for marine life

### Security
- ✅ Image upload validation (MIME type, size, dimensions)
- ✅ Text sanitization (XSS prevention on custom observations)
- ✅ Rate limiting on feedback submission (1 per dive booking)
- ✅ Row-level security: diver can only see/edit own feedback
- ✅ Authenticated endpoint (only logged-in divers)

---

## Success Criteria
- [ ] Feedback card form functional and accessible
- [ ] Images upload and display correctly
- [ ] Aggregation logic accurate (avg, min, max)
- [ ] Dashboard displays non-cluttered, professional UI
- [ ] Performance: page load < 2s (with cache)
- [ ] Security: no XSS, SQL injection, unauthorized access
- [ ] Mobile responsive

---

## Out of Scope (Phase 2)
- Export/analytics dashboard
- Email notifications for site conditions
- ML-based condition predictions
- Historical trend charts
