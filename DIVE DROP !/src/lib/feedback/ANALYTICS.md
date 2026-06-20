# Analytics & Trends Feature Documentation

## Overview

The Analytics & Trends feature provides comprehensive feedback data analysis and visualization for the DIVE DROP platform. Divers and administrators can view historical trends, spot patterns, and gain insights about dive site conditions over time.

## Architecture

### Components & Files

```
src/lib/feedback/
├── trendAnalysis.ts          # Core trend calculation functions
├── trendAnalysis.test.ts     # Comprehensive test suite
└── ANALYTICS.md              # This file

src/components/
├── FeedbackTrends.tsx        # Interactive trend visualization component
└── FeedbackInsights.tsx      # Insights dashboard component

src/app/api/feedback/trends/
└── route.ts                  # API endpoints for trends and insights
```

## Features

### 1. Trend Calculation Utility (`trendAnalysis.ts`)

Provides functions to calculate feedback trends across different time periods:

#### `calculateDailyTrend(siteId, days)`
- **Purpose**: Calculate trends at daily granularity
- **Parameters**:
  - `siteId` (string): UUID of the dive site
  - `days` (number): Number of days to look back (default: 30)
- **Returns**: `TrendAnalysisResult` with daily trend data
- **Data Aggregated**:
  - Visibility average, temperature, current strength
  - Marine species counts
  - Feedback count per day
  - Data quality metrics

#### `calculateWeeklyTrend(siteId, weeks)`
- **Purpose**: Calculate trends at weekly granularity
- **Parameters**:
  - `siteId` (string): UUID of the dive site
  - `weeks` (number): Number of weeks to look back (default: 12)
- **Returns**: `TrendAnalysisResult` with weekly trend data
- **Use Cases**: Medium-term trend analysis, seasonal patterns

#### `calculateSeasonalTrend(siteId, months)`
- **Purpose**: Calculate trends at monthly granularity
- **Parameters**:
  - `siteId` (string): UUID of the dive site
  - `months` (number): Number of months to look back (default: 12)
- **Returns**: `TrendAnalysisResult` with monthly trend data
- **Use Cases**: Long-term seasonal analysis, year-over-year comparisons

#### `getInsights(siteId, days)`
- **Purpose**: Extract key insights from feedback data
- **Parameters**:
  - `siteId` (string): UUID of the dive site
  - `days` (number): Number of days to analyze (default: 30)
- **Returns**:
  ```typescript
  {
    bestConditionsDay: { date, visibility, temperature } | null,
    commonSpecies: Array<{ species, count }>,
    visibilityTrend: 'improving' | 'declining' | 'stable',
    temperatureRange: { min, max },
    feedbackCount: number
  }
  ```

### 2. API Endpoints (`/api/feedback/trends`)

#### GET: Retrieve Trends

**Endpoint**: `GET /api/feedback/trends?siteId=...&period=30&type=daily`

**Query Parameters**:
- `siteId` (required): UUID of the dive site
- `period` (optional): Time range in days - '7', '14', '30', or '90' (default: '30')
- `type` (optional): Granularity - 'daily', 'weekly', or 'monthly' (default: 'daily')

**Response (200)**:
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

**Error Responses**:
- `400`: Invalid query parameters
- `404`: Insufficient feedback data
- `429`: Rate limit exceeded (60 per minute)
- `500`: Server error

#### POST: Get Insights

**Endpoint**: `POST /api/feedback/trends`

**Request Body**:
```json
{
  "siteId": "uuid",
  "days": 30
}
```

**Response (200)**:
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
    "temperatureRange": { "min": 18.5, "max": 26.2 },
    "feedbackCount": 42
  },
  "generatedAt": "2026-06-20T21:00:00Z"
}
```

### 3. Visualization Components

#### FeedbackTrends Component

Interactive chart component for visualizing trend data.

**Props**:
```typescript
interface FeedbackTrendsProps {
  siteId: string;           // UUID of dive site
  siteName?: string;        // Display name (default: 'Dive Site')
  defaultPeriod?: '7' | '14' | '30' | '90';  // Default time period
}
```

**Features**:
- Line chart for visibility trends
- Line chart for temperature trends
- Line chart for current strength trends
- Bar chart for feedback submission counts
- Interactive time period selector (7/14/30/90 days)
- Granularity selector (daily/weekly/monthly)
- Data quality indicator with coverage percentage
- Custom tooltips with detailed data

**Example Usage**:
```tsx
import FeedbackTrends from '@/components/FeedbackTrends';

export default function Page() {
  return (
    <FeedbackTrends 
      siteId="site-uuid"
      siteName="Coral Reef Site"
      defaultPeriod="30"
    />
  );
}
```

#### FeedbackInsights Component

Dashboard displaying key metrics and insights.

**Props**:
```typescript
interface FeedbackInsightsProps {
  siteId: string;    // UUID of dive site
  siteName?: string; // Display name (default: 'Dive Site')
  days?: number;     // Analysis period (default: 30)
}
```

**Features**:
- Best conditions day card
- Visibility trend indicator
- Temperature range card
- Feedback submission count
- Most common marine species
- Data quality assessment
- Summary statistics
- Weekly feedback rate

**Example Usage**:
```tsx
import FeedbackInsights from '@/components/FeedbackInsights';

export default function Page() {
  return (
    <FeedbackInsights 
      siteId="site-uuid"
      siteName="Coral Reef Site"
      days={30}
    />
  );
}
```

## Data Quality & Caching

### Cache Strategy

- **API Response Cache**: 5 minutes (HTTP `Cache-Control` headers)
- **In-Memory Cache**: Implemented in API route handler
- **Cache Key**: `trends:{siteId}:{period}:{type}`
- **TTL**: 300 seconds (5 minutes)

### Data Quality Metrics

Each trend result includes a `dataQuality` object:

```typescript
{
  hasData: boolean,              // Whether any data exists
  minimumThreshold: number,      // Target data points (20-30% of period)
  actualCount: number,           // Actual data points returned
  percentageFilled: number       // Coverage percentage (0-100)
}
```

**Coverage Targets**:
- Daily trends: 20% of days with data
- Weekly trends: 25% of weeks with data
- Monthly trends: 30% of months with data

### Performance

- **Query Optimization**: Indexes on `dive_site_id` and `created_at`
- **Aggregation**: Done in application layer (not database)
- **Response Time**: <500ms with cache hit, <2s with fresh calculation
- **Supported Periods**: 7-90 days for daily, 12 weeks for weekly, 12 months for monthly

## Type Definitions

### DailyTrend
```typescript
interface DailyTrend {
  date: string;                    // YYYY-MM-DD
  visibility_avg: number;          // meters (0-50)
  temperature_avg: number;         // Celsius (5-40)
  current_avg: number;             // 0-10 scale
  count: number;                   // feedback submissions
  species_counts: Record<string, number>;
}
```

### WeeklyTrend
```typescript
interface WeeklyTrend {
  week: string;                    // YYYY-Www (ISO week)
  visibility_avg: number;
  temperature_avg: number;
  current_avg: number;
  count: number;
  species_counts: Record<string, number>;
}
```

### SeasonalTrend
```typescript
interface SeasonalTrend {
  month: string;                   // YYYY-MM
  visibility_avg: number;
  temperature_avg: number;
  current_avg: number;
  count: number;
  species_counts: Record<string, number>;
}
```

## Usage Examples

### Example 1: Display 30-Day Trends

```tsx
import FeedbackTrends from '@/components/FeedbackTrends';

export default function DiveSiteAnalytics() {
  const siteId = 'your-site-uuid';

  return (
    <FeedbackTrends 
      siteId={siteId}
      siteName="Great Barrier Reef"
      defaultPeriod="30"
    />
  );
}
```

### Example 2: Fetch Trends Programmatically

```typescript
const response = await fetch(
  '/api/feedback/trends?siteId=your-id&period=30&type=daily'
);
const trends = await response.json();

console.log(`Average visibility: ${trends.trends[0].visibility_avg}m`);
console.log(`Data coverage: ${trends.dataQuality.percentageFilled}%`);
```

### Example 3: Get Insights

```typescript
const response = await fetch('/api/feedback/trends', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    siteId: 'your-id',
    days: 30,
  }),
});

const data = await response.json();
console.log(`Best day: ${data.insights.bestConditionsDay.date}`);
console.log(`Trend: ${data.insights.visibilityTrend}`);
```

## Testing

### Test Coverage

The feature includes comprehensive tests in `trendAnalysis.test.ts`:

- **Unit Tests**:
  - `calculateDailyTrend`: 6 tests
  - `calculateWeeklyTrend`: 3 tests
  - `calculateSeasonalTrend`: 3 tests
  - `getInsights`: 7 tests

- **Integration Tests**: 3 tests
  - Empty data handling
  - Cross-period consistency
  - Data consistency between trends and insights

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- trendAnalysis.test.ts

# Watch mode
npm test -- --watch
```

## Troubleshooting

### No Data Returned

**Issue**: Component shows "No feedback data available"

**Solutions**:
1. Verify site has feedback submissions
2. Check date range is within data availability
3. Ensure minimum feedback count (2 entries required)
4. Clear browser cache and retry

### Slow Performance

**Issue**: Trends take > 2 seconds to load

**Solutions**:
1. Check cache headers (`X-Cache: HIT`)
2. Verify database indexes exist
3. Consider requesting longer periods (weekly/monthly)
4. Check for network latency

### Inconsistent Data

**Issue**: Trends don't match aggregated conditions

**Solutions**:
1. Verify timestamps are in UTC
2. Check date filtering logic
4. Ensure species array is properly formatted
5. Review marine_life column structure

## Future Enhancements

- [ ] Predictive trends (ML-based forecasting)
- [ ] Anomaly detection (unusual conditions)
- [ ] Comparative analysis (vs other sites)
- [ ] Export to PDF/CSV
- [ ] Real-time updates (WebSocket)
- [ ] Custom date ranges
- [ ] Filtering by diver type/experience
- [ ] Weather data correlation
- [ ] Mobile optimizations
- [ ] Accessibility improvements

## Security Considerations

- All database queries are parameterized (SQL injection prevention)
- Rate limiting: 60 requests/minute for trends endpoint
- User authentication not required (public data)
- CORS headers properly configured
- XSS protection via React/JSX
- No sensitive data in responses

## Related Files

- Database schema: Check `SECURITY_PERFORMANCE.md` for feedback table details
- Feedback validation: `validation.ts`
- Feedback submission: `route.ts` (POST /api/feedback)
- Marine species: `types/feedback.ts`

## Support

For issues or questions about the Analytics feature:
1. Check this documentation
2. Review test cases for examples
3. Check component prop types
4. Review API response schemas
5. Open an issue on GitHub with reproduction steps
