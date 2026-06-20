# Tracking System Dependencies

## Current Stack (Already Installed)

✅ Already in your `package.json`:
- `next@16.2.9` - Framework
- `react@19.2.4` - UI library
- `react-dom@19.2.4` - DOM rendering
- `@supabase/supabase-js@2.108.2` - Real-time database
- `next-intl@4.13.0` - Internationalization
- `zustand@5.0.14` - State management (optional use)
- `tailwindcss@4` - Styling

## Optional Dependencies (Recommended)

### Map Libraries (Choose One)

#### Leaflet + React (Lightweight - Recommended for MVP)
```bash
npm install leaflet @types/leaflet
```
- **Size:** 39KB (gzipped)
- **Cost:** Free
- **Setup:** ~5 minutes
- **Best for:** MVP, quick prototyping, cost-sensitive

#### Google Maps API
```bash
npm install @googlemaps/js-api-loader
```
- **Size:** 500KB (includes deps)
- **Cost:** $7/month per 1000 views (+ free tier)
- **Setup:** ~15 minutes (API key + billing setup)
- **Best for:** Production, route optimization, traffic data

#### Mapbox GL JS
```bash
npm install mapbox-gl
# TypeScript types
npm install --save-dev @types/mapbox-gl
```
- **Size:** 250KB (gzipped)
- **Cost:** Free tier + $500/month plan after
- **Setup:** ~10 minutes (access token)
- **Best for:** Beautiful maps, advanced styling, clustering

### Testing Libraries

```bash
# Unit & integration testing
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# E2E testing
npm install --save-dev @playwright/test

# Mocking
npm install --save-dev msw
```

### Monitoring & Analytics

```bash
# Error tracking
npm install @sentry/nextjs

# Analytics
npm install gtag
```

### Utilities (Nice to Have)

```bash
# Date manipulation
npm install date-fns

# Data validation
npm install zod  # Already installed

# HTTP client
npm install axios
```

## Installation Instructions

### Step 1: Install Leaflet (Recommended First Choice)

```bash
# Core library + types
npm install leaflet @types/leaflet

# If using React, optionally use react-leaflet for hooks
npm install react-leaflet
```

### Step 2: Verify Installation

Create a test file:
```typescript
// src/lib/tracking/leaflet-test.ts
import L from 'leaflet';

export const testLeaflet = () => {
  console.log('Leaflet version:', L.version);
  return true;
};
```

Run in browser console:
```typescript
import { testLeaflet } from '@/lib/tracking/leaflet-test';
testLeaflet(); // Should log version
```

### Step 3: Add Missing Translations (If Needed)

```bash
# Check if i18n locale files exist
ls src/i18n/locales/*/

# Should see:
# src/i18n/locales/en/tracking.json ✅
# src/i18n/locales/he/tracking.json ✅
```

## Dependency Tree

```
dive-drop (your app)
├── next@16.2.9
├── react@19.2.4
├── @supabase/supabase-js@2.108.2
│   └── websocket (for real-time)
├── next-intl@4.13.0
├── tailwindcss@4
├── leaflet@1.9.x (optional)
│   └── (no dependencies)
└── @types/node, @types/react, etc. (dev)
```

**Total Bundle Impact:**
- Without Leaflet: ~180KB (gzipped)
- With Leaflet: ~220KB (gzipped)
- With Google Maps: ~700KB (gzipped)
- With Mapbox GL: ~430KB (gzipped)

## Tailwind Configuration

The tracking components use these Tailwind classes:
```javascript
// Make sure these are in your Tailwind config
module.exports = {
  theme: {
    colors: {
      // Blues
      'blue-50': '#eff6ff',
      'blue-500': '#3b82f6',
      'blue-600': '#2563eb',
      
      // Greens
      'green-50': '#f0fdf4',
      'green-100': '#dcfce7',
      'green-600': '#16a34a',
      
      // Emerald
      'emerald-50': '#f0fdf4',
      'emerald-100': '#dcfce7',
      'emerald-500': '#10b981',
      'emerald-600': '#059669',
      'emerald-800': '#065f46',
      
      // Reds
      'red-100': '#fee2e2',
      'red-500': '#ef4444',
      'red-600': '#dc2626',
      
      // Grays
      'gray-50': '#f9fafb',
      'gray-100': '#f3f4f6',
      'gray-200': '#e5e7eb',
      'gray-300': '#d1d5db',
      'gray-400': '#9ca3af',
      'gray-500': '#6b7280',
      'gray-600': '#4b5563',
      'gray-700': '#374151',
      'gray-800': '#1f2937',
      
      // Other
      'white': '#ffffff',
      'black': '#000000',
    },
  },
};
```

## Build Optimization

### Code Splitting

The tracking components will be automatically code-split:
```javascript
// Next.js automatically chunks these routes
import('leaflet') // Dynamic import in component
import('@/components/tracking') // Route-based splitting
```

### Image Optimization

Driver avatars use Next.js Image:
```typescript
import Image from 'next/image';

<Image
  src={shuttle.driver.avatar_url}
  alt={shuttle.driver.name}
  width={56}
  height={56}
  // Automatically optimized by Next.js
/>
```

## Environment Variables

No additional env vars needed for basic setup, but useful ones:

```env
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For map providers
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key  # Google Maps only
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-token  # Mapbox only

# Optional: For monitoring
SENTRY_DSN=https://...  # Error tracking
NEXT_PUBLIC_GA_ID=G-...  # Google Analytics
```

## Version Compatibility

### Supported Node Versions
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Next.js Version
- ✅ Next.js 16.2.9 (current)
- ✅ Next.js 15.x
- ✅ Next.js 14.x
- ⚠️  Next.js 13.x (may need adjustments)
- ❌ Next.js 12.x or lower

### React Version
- ✅ React 19.2.4 (current)
- ✅ React 18.x
- ❌ React 17.x or lower

## Security Dependencies

No additional security dependencies needed for core tracking.

**If adding sensitive features:**

```bash
# For encryption (contact info)
npm install tweetnacl

# For secure random generation
npm install secure-random-bytes

# For CSRF protection (included in Next.js)
# Already built-in
```

## Development Dependencies

```bash
# Already in your devDeps
npm install --save-dev typescript eslint tailwindcss

# Useful additions
npm install --save-dev:
  - prettier          # Code formatting
  - husky            # Git hooks
  - lint-staged      # Pre-commit linting
  - @testing-library/react
  - vitest
```

## Performance Audit

Check bundle size:
```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Create next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... your config
});

# Run analysis
ANALYZE=true npm run build
```

## Update Strategy

### Regular Updates (Quarterly)
```bash
# Check for outdated packages
npm outdated

# Update dependencies (safe)
npm update

# Run tests
npm test
```

### Major Updates (Annually)
```bash
# Check major version updates
npm outdated --long

# Update Next.js (usually safe)
npm install next@latest

# Update React (test thoroughly)
npm install react@latest react-dom@latest

# Test everything
npm test
npm run build
```

### Security Updates (As Needed)
```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# If manual fix needed
npm audit fix --force
```

## Troubleshooting Dependency Issues

### Module not found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Leaflet CSS not loading
```typescript
// In your layout or global CSS
import 'leaflet/dist/leaflet.css';
```

### TypeScript errors
```bash
# Ensure types are installed
npm install --save-dev @types/leaflet

# Rebuild TypeScript cache
rm -rf .next
npm run build
```

### Import conflicts
```bash
# Check for duplicate versions
npm ls leaflet

# Install specific version
npm install leaflet@1.9.4
```

## Alternative Stacks

### Minimal (Current)
```json
{
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "@supabase/supabase-js": "2.108.2",
    "leaflet": "1.9.x"
  }
}
```

### Production Ready
```json
{
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "@supabase/supabase-js": "2.108.2",
    "@googlemaps/js-api-loader": "latest",
    "@sentry/nextjs": "latest",
    "date-fns": "latest"
  }
}
```

### Full Featured
```json
{
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "@supabase/supabase-js": "2.108.2",
    "@googlemaps/js-api-loader": "latest",
    "mapbox-gl": "latest",
    "@sentry/nextjs": "latest",
    "date-fns": "latest",
    "axios": "latest",
    "zustand": "5.0.14"
  },
  "devDependencies": {
    "@testing-library/react": "latest",
    "vitest": "latest",
    "@playwright/test": "1.61.0",
    "prettier": "latest"
  }
}
```

## Checklist Before Going Live

- [ ] Install `leaflet` or chosen map library
- [ ] Run `npm run build` successfully
- [ ] Run `npm run lint` with no errors
- [ ] All tests passing (if applicable)
- [ ] Bundle size analyzed and acceptable
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Supabase RLS policies in place
- [ ] Test tracking flow end-to-end
