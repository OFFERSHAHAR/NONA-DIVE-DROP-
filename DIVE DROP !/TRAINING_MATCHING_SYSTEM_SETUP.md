# Free Diving Training Matching System - Complete Setup Guide

## Overview

A comprehensive training matching system for free diving that recommends courses based on user depth progression and skill levels.

**Key Features:**
- 4 depth levels: Beginner (0-10m), Intermediate (10-25m), Advanced (25-40m), Expert (40m+)
- Intelligent matching algorithm
- Depth-based progression rules
- Enrollment management with level eligibility
- Real-time recommendations
- Instructor ratings and certifications

---

## 1. Database Setup

### Migration File
- **Location:** `supabase/migrations/20260620_training_matching_system.sql`
- **Status:** Ready to deploy

### Tables Created

#### Training Programs
```
training_programs
- id (UUID)
- instructor_id (FK to freediving_instructors)
- name, description
- depth_level, depth_min_meters, depth_max_meters
- price_shekel, duration_hours, duration_days
- location, latitude, longitude
- max_students, current_enrollment
- topics, certifications_offered, equipment_provided_list
```

#### User Training Progress
```
user_training_progress
- id (UUID)
- user_id (FK to auth.users)
- current_level, depth_achieved_meters
- certifications, total_trainings_completed, total_training_hours
- medical_clearance_valid, medical_clearance_expiry
- emergency_contact_name, emergency_contact_phone
- preferred_location, preferred_depth_min/max
```

#### Training Recommendations
```
training_recommendations
- user_id (FK)
- training_program_id (FK)
- confidence_score (0-1)
- depth_match_score, experience_match_score, location_match_score
- price_match_score, instructor_quality_score
- was_viewed, was_booked
```

#### Training Enrollments
```
training_enrollments
- user_id (FK)
- training_program_id (FK)
- status: enrolled, in_progress, completed, cancelled
- completion_percentage, passed
- certification_earned, depth_achieved
- student_feedback, student_rating
```

#### Depth Progression Rules
```
depth_progression_rules
- from_level, to_level
- min_depth_achievement
- min_trainings_required, min_hours_required
- certifications_required
```

#### Training Feedback
```
training_feedback
- training_program_id (FK)
- user_id (FK)
- overall_rating, instructor_rating, safety_rating, content_quality_rating
- comfortable_with_depth, would_recommend
```

### Key Functions (PL/pgSQL)

1. **`get_next_training_level(user_id)`**
   - Determines next recommended training level based on current depth

2. **`calculate_recommendation_score(user_id, training_program_id)`**
   - Scores recommendation with weighted factors:
     - Depth match: 30%
     - Experience match: 25%
     - Location match: 15%
     - Price match: 15%
     - Quality match: 15%

3. **`get_training_recommendations(user_id, limit)`**
   - Returns personalized recommendations with scores

4. **`check_training_level_eligibility(user_id, training_program_id)`**
   - Validates user can enroll in training (prevents booking above level)

5. **`update_program_enrollment(training_program_id)`**
   - Auto-updates enrollment count on enrollment changes

6. **`auto_generate_training_recommendations(user_id)`**
   - Automatically creates recommendations when user progresses

7. **`update_user_training_level(user_id)`**
   - Updates user level based on depth achieved in completed trainings

### Row-Level Security (RLS)

- Users can only view their own progress and enrollments
- Public can view verified instructor programs
- Instructors can manage their own training programs
- Recommendations are user-scoped

---

## 2. TypeScript Types

### File
- **Location:** `src/types/training.ts`

### Key Types

```typescript
type TrainingDepthLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface TrainingProgram {
  id: string;
  instructor_id: string;
  name: string;
  description: string;
  depth_level: TrainingDepthLevel;
  depth_min_meters: number;
  depth_max_meters: number;
  price_shekel: number;
  location: string;
  // ... more fields
}

interface UserTrainingProgress {
  id: string;
  user_id: string;
  current_level: TrainingDepthLevel;
  depth_achieved_meters: number;
  certifications: string[];
  total_trainings_completed: number;
  total_training_hours: number;
  // ... more fields
}

interface TrainingRecommendation {
  id: string;
  user_id: string;
  training_program_id: string;
  confidence_score: number;
  reason: string;
  // ... scoring breakdown
}
```

---

## 3. API Endpoints

### Training Programs

#### `GET /api/training`
List all active training programs with filtering

**Query Parameters:**
- `depth_level`: Filter by level (beginner, intermediate, advanced, expert)
- `location`: Filter by location
- `min_price`: Minimum price in shekel
- `max_price`: Maximum price in shekel
- `instructor_rating`: Minimum instructor rating
- `sort_by`: relevance, price, rating, date
- `limit`: Results per page (max 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [TrainingProgram],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "pages": 3
  }
}
```

#### `POST /api/training`
Create a new training program (instructor only)

**Body:**
```json
{
  "name": "Beginner Freediving Course",
  "description": "Learn basic freediving techniques",
  "depth_level": "beginner",
  "depth_min_meters": 0,
  "depth_max_meters": 10,
  "duration_hours": 8,
  "duration_days": 2,
  "max_students": 4,
  "price_shekel": 800,
  "location": "Dead Sea",
  "topics": ["breathing", "relaxation", "safety"],
  "certifications_offered": ["AIDA Level 1"]
}
```

#### `GET /api/training/[id]`
Get details of a specific training program

#### `PUT /api/training/[id]`
Update training program (instructor only)

#### `DELETE /api/training/[id]`
Soft delete training program (instructor only)

---

### User Progress

#### `GET /api/training/progress`
Get user's current training progress and level

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": UserTrainingProgress,
    "activeEnrollments": [TrainingEnrollment],
    "completedTrainings": [CompletedTraining],
    "nextLevel": "intermediate",
    "stats": {
      "completedCount": 3,
      "activeCount": 1,
      "averageRating": "4.5",
      "maxDepthAchieved": 15
    }
  }
}
```

#### `PUT /api/training/progress`
Update user's training progress (personal info, preferences, etc.)

**Body:**
```json
{
  "preferred_location": "Red Sea",
  "preferred_depth_max": 30,
  "emergency_contact_name": "John Doe",
  "emergency_contact_phone": "+972123456789",
  "medical_clearance_valid": true,
  "blood_type": "O+"
}
```

---

### Recommendations

#### `GET /api/training/recommendations`
Get personalized training recommendations

**Query Parameters:**
- `limit`: Number of recommendations (default 5, max 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "training_program_id": "uuid",
      "program_name": "Intermediate Course",
      "instructor_name": "Ahmed",
      "depth_level": "intermediate",
      "confidence_score": 0.85,
      "reason": "Perfect match for your experience level",
      "price_shekel": 1200,
      "location": "Red Sea"
    }
  ],
  "count": 5
}
```

#### `POST /api/training/recommendations/mark-viewed`
Mark a recommendation as viewed

**Body:**
```json
{
  "training_program_id": "uuid"
}
```

---

### Enrollment

#### `POST /api/training/enroll`
Enroll user in a training program

**Body:**
```json
{
  "training_program_id": "uuid",
  "payment_status": "pending"
}
```

**Response:**
```json
{
  "success": true,
  "data": TrainingEnrollment,
  "message": "Successfully enrolled in training program"
}
```

**Error Codes:**
- 403: User not eligible for this level
- 400: Training program is full
- 400: Already enrolled

#### `GET /api/training/enroll`
Check enrollment status for a training

**Query Parameters:**
- `training_program_id`: UUID of the training program

**Response:**
```json
{
  "success": true,
  "data": TrainingEnrollment | null
}
```

---

## 4. React Components

### TrainingRecommendationCard
Displays a single training recommendation with match score

**Props:**
```typescript
interface TrainingRecommendationCardProps {
  recommendation: RecommendationResponse;
  onEnroll?: (trainingId: string) => void;
  onView?: (trainingId: string) => void;
}
```

**Usage:**
```tsx
<TrainingRecommendationCard
  recommendation={recommendation}
  onEnroll={(id) => console.log('Enroll in', id)}
  onView={(id) => console.log('View details', id)}
/>
```

**Features:**
- Visual confidence score bar
- Color-coded depth levels
- Price and location display
- Enrollment button
- Responsive design

---

### DepthMeterIndicator
Shows user's current depth level and progression path

**Props:**
```typescript
interface DepthMeterIndicatorProps {
  progress: UserTrainingProgress;
  nextLevel?: TrainingDepthLevel;
  compact?: boolean;
}
```

**Usage:**
```tsx
<DepthMeterIndicator
  progress={userProgress}
  nextLevel="intermediate"
  compact={false}
/>
```

**Features:**
- Current level display with description
- Progress bar within current level
- Visual progression path (4 levels)
- Training statistics
- Medical clearance status
- Compact view option

---

### TrainingBrowser
Full-featured training program browser with filtering

**Props:**
```typescript
interface TrainingBrowserProps {
  onSelectTraining?: (training: TrainingProgram) => void;
  onEnroll?: (trainingId: string) => void;
}
```

**Usage:**
```tsx
<TrainingBrowser
  onSelectTraining={(training) => {}}
  onEnroll={(id) => {}}
/>
```

**Features:**
- Depth level filter (4 levels)
- Location search
- Price range filter
- Instructor rating filter
- Multiple sort options
- Pagination (20 per page)
- Responsive grid layout
- Availability indicator
- Instructor ratings display

---

## 5. Deployment Checklist

### Database
- [ ] Run migration: `20260620_training_matching_system.sql`
- [ ] Verify all tables created
- [ ] Verify RLS policies enabled
- [ ] Test RPC functions

### Backend
- [ ] Deploy API routes
  - [ ] `/api/training`
  - [ ] `/api/training/[id]`
  - [ ] `/api/training/recommendations`
  - [ ] `/api/training/progress`
  - [ ] `/api/training/enroll`
- [ ] Test all endpoints
- [ ] Verify authentication requirements

### Frontend
- [ ] Deploy components
  - [ ] `TrainingRecommendationCard`
  - [ ] `DepthMeterIndicator`
  - [ ] `TrainingBrowser`
- [ ] Test component rendering
- [ ] Test enrollment flow
- [ ] Verify responsive design

### Testing
- [ ] Unit tests for matching algorithm
- [ ] Integration tests for API endpoints
- [ ] E2E tests for enrollment flow
- [ ] Mobile responsiveness testing

---

## 6. Configuration & Environment

### Environment Variables
None required (uses Supabase connection from existing setup)

### Authentication
All endpoints except GET require authentication:
- POST /api/training (instructor only)
- PUT /api/training/[id] (owner only)
- DELETE /api/training/[id] (owner only)
- POST /api/training/enroll (authenticated users)
- GET /api/training/progress (authenticated users)
- PUT /api/training/progress (authenticated users)

---

## 7. Key Algorithm: Matching Score

The recommendation algorithm calculates a confidence score (0-1) based on:

### Scoring Components

**1. Depth Match (30% weight)**
- Perfect match: User depth is within program's depth range = 1.0
- Below range: Score decreases with distance = (range_start - user_depth) / 40
- Above range: Lower score = 0.5

**2. Experience Match (25% weight)**
- Same level: 1.0
- Within +1 level: 0.3
- Multiple levels above: 0.1
- Below level: 0.0

**3. Location Match (15% weight)**
- Preferred location matches program: 1.0
- No preference or different location: 0.6-0.8

**4. Price Match (15% weight)**
- Moderate price (500-2000₪): 1.0
- Lower: 0.8
- Higher: 0.6

**5. Quality Match (15% weight)**
- Instructor rating / 5.0
- Average rating to 0-1 scale

### Final Score Formula
```
confidence_score = (
  (depth_match × 0.3) +
  (experience_match × 0.25) +
  (location_match × 0.15) +
  (price_match × 0.15) +
  (quality_match × 0.15)
)
```

---

## 8. Usage Examples

### For Users

**1. View Training Progress**
```typescript
// Get user's current progress
const response = await fetch('/api/training/progress');
const { data } = await response.json();
// data.progress contains current level, depth, certifications, etc.
```

**2. Get Recommendations**
```typescript
// Get personalized recommendations
const response = await fetch('/api/training/recommendations?limit=5');
const { data } = await response.json();
// data is array of recommendations with match scores
```

**3. Browse and Enroll**
```typescript
// Use TrainingBrowser component
// Filter by depth, location, price, rating
// Click "Enroll Now" to join a training
// System validates eligibility before enrolling
```

### For Instructors

**1. Create Training Program**
```typescript
const response = await fetch('/api/training', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Intermediate Freediving',
    depth_level: 'intermediate',
    depth_min_meters: 10,
    depth_max_meters: 25,
    price_shekel: 1500,
    // ... more fields
  })
});
```

**2. Update Program Details**
```typescript
const response = await fetch('/api/training/program-id', {
  method: 'PUT',
  body: JSON.stringify({
    price_shekel: 1600,
    next_start_date: '2026-07-15'
  })
});
```

---

## 9. File Structure

```
src/
├── app/api/training/
│   ├── route.ts                  # GET/POST all trainings
│   ├── [id]/route.ts             # GET/PUT/DELETE specific training
│   ├── recommendations/route.ts  # GET/POST recommendations
│   ├── progress/route.ts         # GET/PUT user progress
│   └── enroll/route.ts           # POST enrollment, GET status
├── components/training/
│   ├── TrainingRecommendationCard.tsx
│   ├── DepthMeterIndicator.tsx
│   ├── TrainingBrowser.tsx
│   └── index.ts
├── types/
│   └── training.ts               # All type definitions
└── supabase/migrations/
    └── 20260620_training_matching_system.sql
```

---

## 10. Testing Recommendations

### Unit Tests
- Test matching score calculation with various user profiles
- Test level eligibility checks
- Test recommendation filtering

### Integration Tests
- Test full enrollment flow
- Test recommendation generation after training completion
- Test level progression rules

### E2E Tests
- User journey: Create progress → View recommendations → Enroll → Complete
- Filter and search functionality
- Mobile responsiveness

---

## 11. Future Enhancements

1. **Waiting List**
   - Queue system for full trainings
   - Email notifications when spots open

2. **Advanced Recommendations**
   - ML-based matching (user engagement history)
   - Buddy system recommendations

3. **Certification Tracking**
   - Certificate generation after completion
   - Expiry date management

4. **Payment Integration**
   - Connect to payment system
   - Automatic enrollment on payment success

5. **Analytics**
   - Recommend → View → Enroll conversion rates
   - Popular training programs by depth level

---

## 12. Support & Documentation

All functions include inline TypeScript documentation.
All API endpoints are RESTful and follow consistent response patterns.
Component props are fully typed for IDE support.

**Status:** Ready for production deployment ✅

---

Generated: June 20, 2026
System: DIVE DROP Free Diving Training Matching
Version: 1.0.0
