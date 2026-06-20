# Training Matching System - Quick Start (5 Minutes)

## Deployment Steps

### 1. Deploy Database Migration (2 min)

```bash
# Run the SQL migration in your Supabase project
# Copy contents of: supabase/migrations/20260620_training_matching_system.sql
# Paste in Supabase SQL Editor and execute

# Verify tables were created:
select * from training_programs limit 1;
select * from user_training_progress limit 1;
select * from training_recommendations limit 1;
```

### 2. API Endpoints Ready (Already created)

All API routes are ready:
- ✅ `src/app/api/training/route.ts`
- ✅ `src/app/api/training/[id]/route.ts`
- ✅ `src/app/api/training/recommendations/route.ts`
- ✅ `src/app/api/training/progress/route.ts`
- ✅ `src/app/api/training/enroll/route.ts`

### 3. React Components Ready

All components are ready to use:
- ✅ `src/components/training/TrainingRecommendationCard.tsx`
- ✅ `src/components/training/DepthMeterIndicator.tsx`
- ✅ `src/components/training/TrainingBrowser.tsx`

### 4. TypeScript Types Ready

- ✅ `src/types/training.ts` - All 40+ types defined

---

## Integration in Your App

### Option 1: Training Discovery Page

```tsx
// app/[locale]/training/page.tsx
'use client';

import { TrainingBrowser } from '@/components/training';
import { useRouter } from 'next/navigation';

export default function TrainingPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Discover Training Programs</h1>
      
      <TrainingBrowser
        onSelectTraining={(training) => {
          router.push(`/training/${training.id}`);
        }}
        onEnroll={(trainingId) => {
          // Handle enrollment
        }}
      />
    </div>
  );
}
```

### Option 2: User Dashboard with Recommendations

```tsx
// app/[locale]/dashboard/training/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  TrainingRecommendationCard,
  DepthMeterIndicator,
} from '@/components/training';
import { UserTrainingProgress, RecommendationResponse } from '@/types/training';

export default function TrainingDashboard() {
  const [progress, setProgress] = useState<UserTrainingProgress | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Get user progress
      const progressRes = await fetch('/api/training/progress');
      const progressData = await progressRes.json();
      setProgress(progressData.data?.progress);

      // Get recommendations
      const recsRes = await fetch('/api/training/recommendations?limit=5');
      const recsData = await recsRes.json();
      setRecommendations(recsData.data);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Depth Progress */}
      {progress && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
          <DepthMeterIndicator progress={progress} />
        </section>
      )}

      {/* Recommendations */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <TrainingRecommendationCard
              key={rec.training_program_id}
              recommendation={rec}
              onEnroll={(id) => {
                // Handle enrollment
              }}
              onView={(id) => {
                // Navigate to training details
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Option 3: Instructor - Create Training Program

```tsx
// app/[locale]/instructor/create-training/page.tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { TrainingDepthLevel } from '@/types/training';

export default function CreateTrainingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    depth_level: 'beginner' as TrainingDepthLevel,
    depth_min_meters: 0,
    depth_max_meters: 10,
    duration_hours: 8,
    duration_days: 1,
    max_students: 4,
    price_shekel: 800,
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast({
          type: 'success',
          message: 'Training program created successfully!',
        });
        // Redirect or reset form
      } else {
        showToast({
          type: 'error',
          message: result.error || 'Failed to create training',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create Training Program</h1>

      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium mb-2">Program Name</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Depth Level</label>
        <select
          value={formData.depth_level}
          onChange={(e) =>
            setFormData({
              ...formData,
              depth_level: e.target.value as TrainingDepthLevel,
            })
          }
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="beginner">Beginner (0-10m)</option>
          <option value="intermediate">Intermediate (10-25m)</option>
          <option value="advanced">Advanced (25-40m)</option>
          <option value="expert">Expert (40m+)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Price (₪)</label>
        <input
          type="number"
          required
          min="100"
          value={formData.price_shekel}
          onChange={(e) =>
            setFormData({ ...formData, price_shekel: parseFloat(e.target.value) })
          }
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Add more fields as needed */}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Training Program'}
      </button>
    </form>
  );
}
```

---

## Testing the System

### 1. Create a Training Program (as instructor)

```bash
curl -X POST http://localhost:3000/api/training \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beginner Freediving",
    "description": "Learn the basics",
    "depth_level": "beginner",
    "depth_min_meters": 0,
    "depth_max_meters": 10,
    "duration_hours": 8,
    "duration_days": 1,
    "max_students": 4,
    "price_shekel": 800,
    "location": "Dead Sea"
  }'
```

### 2. Get User Progress

```bash
curl http://localhost:3000/api/training/progress
```

### 3. Get Recommendations

```bash
curl http://localhost:3000/api/training/recommendations?limit=5
```

### 4. Enroll in Training

```bash
curl -X POST http://localhost:3000/api/training/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "training_program_id": "uuid-here"
  }'
```

---

## Component Usage Examples

### Recommendation Card

```tsx
import { TrainingRecommendationCard } from '@/components/training';

<TrainingRecommendationCard
  recommendation={{
    training_program_id: 'uuid',
    program_name: 'Intermediate Freediving',
    instructor_name: 'Ahmed',
    depth_level: 'intermediate',
    confidence_score: 0.85,
    reason: 'Perfect for your current level',
    price_shekel: 1200,
    location: 'Red Sea'
  }}
  onEnroll={(id) => console.log('Enroll:', id)}
  onView={(id) => console.log('View:', id)}
/>
```

### Depth Meter

```tsx
import { DepthMeterIndicator } from '@/components/training';

<DepthMeterIndicator
  progress={userProgress}
  nextLevel="intermediate"
  compact={false}
/>
```

### Training Browser

```tsx
import { TrainingBrowser } from '@/components/training';

<TrainingBrowser
  onSelectTraining={(training) => {
    console.log('Selected:', training);
  }}
  onEnroll={(id) => {
    console.log('Enroll:', id);
  }}
/>
```

---

## Key Features Checklist

- ✅ 4 depth levels (Beginner → Expert)
- ✅ Intelligent matching algorithm
- ✅ Level eligibility checking (prevents booking above level)
- ✅ Automatic recommendations
- ✅ User progress tracking
- ✅ Enrollment management
- ✅ Instructor ratings integration
- ✅ Location-based filtering
- ✅ Price filtering
- ✅ Medical clearance tracking
- ✅ Certification tracking
- ✅ Full RLS security
- ✅ Responsive components

---

## What's Ready for Deployment

### Database ✅
- 6 new tables
- 7 PL/pgSQL functions
- 30+ indexes
- RLS policies

### API ✅
- 5 endpoint groups
- Full CRUD operations
- Error handling
- Authentication

### Frontend ✅
- 3 React components
- 40+ TypeScript types
- Responsive design
- Toast notifications

### Documentation ✅
- Complete API docs
- Component usage examples
- Algorithm explanation
- Testing guide

---

## Next Steps

1. **Deploy Database**: Run the migration in Supabase
2. **Test API**: Use curl commands to test endpoints
3. **Integrate Components**: Add to your pages
4. **Add Navigation**: Link to training discovery pages
5. **Customize Styling**: Match your design system
6. **Add Features**: Payment integration, etc.

---

## Support

Refer to `TRAINING_MATCHING_SYSTEM_SETUP.md` for:
- Complete API documentation
- Database schema details
- Algorithm explanation
- Deployment checklist
- Future enhancements

**Status: Production Ready** ✅

Estimated setup time: **30-60 minutes**
