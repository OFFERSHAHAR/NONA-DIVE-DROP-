# Analytics & Trends Feature - Quick Start Guide

## 5-Minute Setup

### Step 1: Import Components

```tsx
import FeedbackTrends from '@/components/FeedbackTrends';
import FeedbackInsights from '@/components/FeedbackInsights';
```

### Step 2: Use Components

```tsx
export default function DiveSiteAnalytics() {
  const siteId = 'your-site-uuid'; // Replace with actual UUID

  return (
    <div className="space-y-8">
      {/* Show key insights and metrics */}
      <FeedbackInsights 
        siteId={siteId}
        siteName="Coral Reef Site"
        days={30}
      />

      {/* Show interactive trend charts */}
      <FeedbackTrends 
        siteId={siteId}
        siteName="Coral Reef Site"
        defaultPeriod="30"
      />
    </div>
  );
}
```

## Key Features

### 📊 FeedbackTrends Component
- **Line charts**: Visibility, Temperature, Current Strength
- **Bar chart**: Feedback submission counts
- **Selectors**: Time period (7/14/30/90 days), Granularity (daily/weekly/monthly)
- **Metrics**: Data quality indicator with coverage percentage

### 💡 FeedbackInsights Component
- **Best conditions**: Highest visibility + temperature day
- **Species**: Most commonly sighted marine life
- **Trend**: Visibility improving/declining/stable
- **Temperature**: Min/max ranges
- **Stats**: Weekly feedback rate, data quality badge

## API Usage

### Get Trends Programmatically

```typescript
const response = await fetch(
  '/api/feedback/trends?siteId=YOUR_UUID&period=30&type=daily'
);
const data = await response.json();

console.log(data.trends); // Array of daily trends
console.log(data.dataQuality); // Coverage metrics
```

### Get Insights Programmatically

```typescript
const response = await fetch('/api/feedback/trends', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ siteId: 'YOUR_UUID', days: 30 })
});
const data = await response.json();

console.log(data.insights);
// {
//   bestConditionsDay,
//   commonSpecies,
//   visibilityTrend,
//   temperatureRange,
//   feedbackCount
// }
```

## Query Parameters

### Trends Endpoint

| Parameter | Values | Default |
|-----------|--------|---------|
| `siteId` | UUID string | Required |
| `period` | '7', '14', '30', '90' | '30' |
| `type` | 'daily', 'weekly', 'monthly' | 'daily' |

### Examples

```
// Last 7 days, daily breakdown
/api/feedback/trends?siteId=abc-123&period=7&type=daily

// Last 90 days, weekly breakdown
/api/feedback/trends?siteId=abc-123&period=90&type=weekly

// Last 30 days, monthly breakdown
/api/feedback/trends?siteId=abc-123&period=30&type=monthly
```

## Response Structure

### Trends Response
```json
{
  "siteId": "uuid",
  "period": "30-day",
  "trends": [
    {
      "date": "2026-06-20",
      "visibility_avg": 25.5,
      "temperature_avg": 22.3,
      "current_avg": 3.2,
      "count": 4,
      "species_counts": {
        "dolphin": 2,
        "coral": 1
      }
    }
  ],
  "totalFeedbackCount": 42,
  "dataQuality": {
    "hasData": true,
    "minimumThreshold": 6,
    "actualCount": 20,
    "percentageFilled": 67
  },
  "generatedAt": "2026-06-20T21:00:00Z"
}
```

### Insights Response
```json
{
  "siteId": "uuid",
  "period": "30-day",
  "insights": {
    "bestConditionsDay": {
      "date": "2026-06-18",
      "visibility": 35,
      "temperature": 24.5
    },
    "commonSpecies": [
      { "species": "dolphin", "count": 12 },
      { "species": "coral", "count": 8 }
    ],
    "visibilityTrend": "improving",
    "temperatureRange": {
      "min": 18.5,
      "max": 26.2
    },
    "feedbackCount": 42
  },
  "generatedAt": "2026-06-20T21:00:00Z"
}
```

## Common Patterns

### Pattern 1: Display Analytics for Current Site

```tsx
export default function CurrentSiteAnalytics() {
  const siteId = useParams().siteId; // From URL params

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Site Analytics</h1>
      <FeedbackInsights siteId={siteId} days={30} />
      <FeedbackTrends siteId={siteId} />
    </div>
  );
}
```

### Pattern 2: Admin Dashboard with Multiple Sites

```tsx
export default function AdminDashboard() {
  const sites = [
    { id: 'site-1', name: 'Coral Reef' },
    { id: 'site-2', name: 'Kelp Forest' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {sites.map(site => (
        <FeedbackInsights 
          key={site.id}
          siteId={site.id}
          siteName={site.name}
          days={30}
        />
      ))}
    </div>
  );
}
```

### Pattern 3: Custom Time Period Selector

```tsx
'use client';

export default function CustomPeriod() {
  const [period, setPeriod] = useState<'7' | '14' | '30' | '90'>('30');
  const siteId = 'your-site-id';

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['7', '14', '30', '90'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p as any)}
            className={period === p ? 'bg-blue-600' : 'bg-gray-200'}
          >
            {p} days
          </button>
        ))}
      </div>
      <FeedbackInsights siteId={siteId} days={parseInt(period)} />
      <FeedbackTrends siteId={siteId} defaultPeriod={period as any} />
    </div>
  );
}
```

## Error Handling

### Component Error States

Both components handle errors gracefully:

```
- Loading state: Spinner + "Loading insights..."
- Error state: Red box with error message
- No data state: Blue box with "No feedback data available"
```

### API Error Responses

```javascript
// 400: Invalid parameters
{ "error": "Invalid query parameters", "details": {...} }

// 404: Insufficient data
{ "error": "Insufficient feedback data", "dataQuality": {...} }

// 429: Rate limit exceeded
{ "error": "Too many requests" }

// 500: Server error
{ "error": "Failed to calculate trends" }
```

## Performance Tips

1. **Use Longer Periods**: Daily for 30 days is faster than 90 days
2. **Cache Results**: HTTP cache is 5 minutes, reuse data if possible
3. **Request Weekly/Monthly**: For trend analysis, weekly/monthly reduces data points
4. **Lazy Load Charts**: Load trends component only when user scrolls to it
5. **Batch Requests**: Use Promise.all() for multiple sites

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data showing | Ensure site has feedback submissions |
| Slow loading | Check Network tab for cache hits |
| Wrong data | Verify siteId is correct UUID |
| Charts not showing | Check browser console for errors |
| Rate limited | Wait 1 minute and retry |

## Testing

### Test the API Endpoint

```bash
# Test trends with curl
curl "http://localhost:3000/api/feedback/trends?siteId=YOUR_UUID&period=30&type=daily"

# Test insights with curl
curl -X POST http://localhost:3000/api/feedback/trends \
  -H "Content-Type: application/json" \
  -d '{"siteId":"YOUR_UUID","days":30}'
```

### Run Component Tests

```bash
npm test -- FeedbackTrends
npm test -- FeedbackInsights
npm test -- trendAnalysis
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Documentation

For more detailed information:

- **Full Documentation**: See `src/lib/feedback/ANALYTICS.md`
- **Examples**: See `src/examples/feedback-analytics-example.tsx`
- **Implementation Details**: See `ANALYTICS_FEATURE_SUMMARY.md`

## Key Files

```
src/lib/feedback/
├── trendAnalysis.ts          # Core functions
├── trendAnalysis.test.ts     # Tests
└── ANALYTICS.md              # Full docs

src/components/
├── FeedbackTrends.tsx        # Trend charts component
└── FeedbackInsights.tsx      # Insights dashboard component

src/app/api/feedback/trends/
└── route.ts                  # API endpoints

src/examples/
└── feedback-analytics-example.tsx # Reference examples
```

## Next Steps

1. ✅ Copy site UUID from database
2. ✅ Add components to your page
3. ✅ Test with browser DevTools
4. ✅ Customize styling to match your design
5. ✅ Add error boundaries as needed
6. ✅ Monitor performance in production

## Support

Having issues? Check:
1. Console for error messages
2. Network tab for API response
3. Component props are correct
4. Site has feedback data
5. Date range is valid

---

**Happy analyzing!** 📊
