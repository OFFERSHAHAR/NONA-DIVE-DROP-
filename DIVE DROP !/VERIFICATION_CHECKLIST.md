# Phase 1 Performance Optimizations - Verification Checklist

## Pre-Deployment Verification

### 1. Dependencies & Build
- [ ] Run `npm install` successfully
- [ ] Run `npm run build` completes without errors
- [ ] No TypeScript errors in build output
- [ ] ESLint validation passes: `npm run lint`
- [ ] Check `node_modules` contains `leaflet` package
- [ ] Verify `next` version is 16.2.9

### 2. Font Loading Tests

#### Visual Verification
```bash
npm run dev
# Go to http://localhost:3000
# Check:
✓ Text renders immediately (no FOUT)
✓ Font switches smoothly after load
✓ Hebrew text renders correctly (RTL)
✓ All font weights display (bold, semibold, etc.)
```

#### Network Tab Verification
```
Chrome DevTools > Network tab:
✓ Google Fonts CSS file loads: fonts.googleapis.com
✓ Font files load from: fonts.gstatic.com
✓ Check for both Inter & Poppins fonts
✓ Font size: ~15-25 KB per font (with subsetting)
✓ Cache-Control headers present
```

#### CSS Variables Check
```bash
# Check in browser console:
getComputedStyle(document.documentElement).getPropertyValue('--font-inter')
getComputedStyle(document.documentElement).getPropertyValue('--font-poppins')
# Should return font family strings
```

---

### 3. Image Optimization Tests

#### Homepage Images
```bash
npm run dev
# Go to http://localhost:3000

Chrome DevTools > Network:
✓ Hero image (divedrop-hero-v2.png):
  - Format: WebP (in Chrome) or JPEG (fallback)
  - Size: Should be <500 KB
  - Lazy attribute: No (priority image)
  - Loads first in waterfall

✓ Card images:
  - Format: WebP
  - Lazy attribute: Yes
  - Size: <100 KB each
  - Load after main content

✓ Logo image:
  - Format: SVG
  - Width/Height attributes present
  - Size: <20 KB
```

#### Explore Page Images
```bash
npm run dev
# Go to http://localhost:3000/he/explore (or /en/explore)

Chrome DevTools > Network:
✓ Each dive site image:
  - Has lazy attribute
  - Size: <150 KB
  - Responsive (different sizes on different breakpoints)
  - Format: WebP for modern browsers
```

#### Image Rendering (No Layout Shift)
```bash
Chrome DevTools > Lighthouse:
✓ Run Lighthouse report
✓ Check "Cumulative Layout Shift" < 0.1
✓ All images show proper dimensions
✓ No visual jumps during page load
```

---

### 4. ISR (Incremental Static Regeneration) Tests

#### Cache Headers Verification
```bash
# For home page
curl -I http://localhost:3000/he
# Check response headers:
✓ Cache-Control header present
✓ Content should be static (no Set-Cookie from dynamic render)

# Production test:
curl -I https://yourdomain.com/he
✓ x-nextjs-cache: HIT (after first build)
✓ Age header shows cache time
```

#### ISR Behavior Test
```typescript
// In browser console on home page:
performance.getEntriesByType('navigation')[0].type
// Should show 'navigate' not 'fetch' (indicating static page)
```

#### Database Query Reduction
```bash
# Check Supabase logs:
✓ Queries for home page should show:
  - One daily query during build
  - No queries on subsequent page loads within 1 hour
✓ Queries for explore page similar pattern
```

---

### 5. Dynamic Imports Tests

#### TrackingMap Dynamic Loading
```bash
npm run dev
# Go to a page with tracking map (e.g., tracking page)

Chrome DevTools > Network:
✓ Leaflet library NOT in main bundle
✓ Separate chunk file loads: leaflet-*.js or tracking-*.js
✓ Loading state shows while component loads
✓ Map renders correctly after load
✓ Map is functional (pan, zoom, markers work)

Console:
✓ No JavaScript errors
✓ No module resolution errors
```

#### Bundle Analysis
```bash
npm install --save-dev @next/bundle-analyzer
ANALYZE=true npm run build

# Check generated analysis:
✓ Leaflet not in main bundle
✓ Heavy components split into separate chunks
✓ Main bundle size < 400 KB (after tree-shaking)
✓ Total JS < 1.5 MB (including all chunks)
```

---

### 6. Performance Metrics Tests

#### PageSpeed Insights
```bash
1. Go to https://pagespeed.web.dev
2. Enter production URL
3. Check metrics:
   ✓ LCP (Largest Contentful Paint): < 2.5s (ideally < 1.8s)
   ✓ FCP (First Contentful Paint): < 1.8s (ideally < 0.9s)
   ✓ CLS (Cumulative Layout Shift): < 0.1 (ideally < 0.08)
   ✓ FID: N/A (replaced by INP)
   ✓ Overall Score: > 85

4. Check suggestions:
   ✓ No major image optimization warnings
   ✓ No font loading warnings
   ✓ Caching warnings resolved
```

#### Lighthouse (Local)
```bash
Chrome DevTools:
1. Go to Lighthouse tab
2. Run performance audit
3. Check scores:
   ✓ Performance: > 85
   ✓ Accessibility: > 80
   ✓ Best Practices: > 80
   ✓ SEO: > 85

4. Check opportunities:
   ✓ Largest Contentful Paint: Optimized
   ✓ Cumulative Layout Shift: Minimized
   ✓ First Input Delay: Improved
```

#### WebPageTest
```bash
1. Go to https://www.webpagetest.org
2. Enter URL
3. Run test
4. Check results:
   ✓ First Byte Time: < 500ms
   ✓ Start Render: < 1s
   ✓ Speed Index: < 1.5s
   ✓ Visually Complete: < 2.5s
```

---

### 7. Browser Compatibility Tests

#### Desktop Browsers
- [ ] Chrome (latest): All features work
- [ ] Firefox (latest): All features work
- [ ] Safari (latest): All features work
- [ ] Edge (latest): All features work

#### Mobile Browsers
- [ ] iOS Safari 12.2+: All features work
- [ ] Chrome Android: All features work
- [ ] Samsung Internet: All features work

#### Test WebP Support Fallback
```bash
# In Chrome:
Network tab should show .webp images

# In Safari:
Network tab should show original format images

# No broken images in either browser
```

---

### 8. RTL (Right-to-Left) Language Tests

#### Hebrew Layout
```bash
npm run dev
# Go to http://localhost:3000/he

✓ All text flows right-to-left
✓ Images align properly in RTL
✓ Buttons and controls mirror correctly
✓ Form inputs RTL-aware
✓ Fonts display Hebrew correctly
✓ No horizontal scrolling issues
```

#### Mixed Content
```bash
✓ English words within Hebrew sentences display correctly
✓ Numbers display in correct order
✓ Icons mirror appropriately
```

---

### 9. Network & Slow Connection Tests

#### Simulate Slow 3G
```bash
Chrome DevTools > Network:
1. Set throttling: Slow 3G
2. Disable cache
3. Reload page
4. Check metrics:
   ✓ Page still loads and is usable
   ✓ Loading states show appropriately
   ✓ Critical content loads first
   ✓ Images lazy load as scrolled
   ✓ No timeout errors
```

#### Simulate Offline
```bash
Chrome DevTools > Network:
1. Go offline
2. Try to navigate page
3. Check:
   ✓ Cached pages load
   ✓ Graceful error handling
   ✓ No broken functionality
```

---

### 10. Production Deployment Tests

#### Vercel Deployment
```bash
# After deploying to Vercel:

1. Check deployment logs:
   ✓ No build errors
   ✓ Image optimization completes
   ✓ All functions deploy successfully

2. Test production URL:
   ✓ Pages load correctly
   ✓ All images display
   ✓ Fonts render properly
   ✓ Dynamic imports work
   ✓ No console errors

3. Check Vercel Analytics:
   ✓ Performance metrics improving
   ✓ Core Web Vitals in green
```

#### Self-hosted Deployment
```bash
1. Build locally:
   npm run build
   
2. Check build output:
   ✓ .next/static/chunks shows code splitting
   ✓ .next/static/images shows optimized images
   ✓ No build warnings

3. Run production:
   npm start
   
4. Verify:
   ✓ Pages serve correctly
   ✓ Cache headers set properly
   ✓ Images optimize on first request
   ✓ ISR revalidation works
```

---

## Post-Deployment Verification

### Real User Monitoring
```bash
1. Set up analytics (Vercel/Datadog/etc)
2. Monitor over 24 hours:
   ✓ Average page load time improving
   ✓ Core Web Vitals stable in green
   ✓ Error rate < 0.1%
   ✓ No major issues reported
```

### Database Monitoring
```bash
Supabase dashboard:
✓ Database query count reduced (especially for home/explore)
✓ Query response times consistent
✓ No query timeouts
✓ Connection pool healthy
```

### Error Tracking
```bash
Sentry/Error monitoring:
✓ No new errors from optimizations
✓ Image loading errors < 0.01%
✓ Font loading errors < 0.01%
✓ Dynamic import errors < 0.01%
```

---

## Rollback Plan (If Issues Found)

### Quick Revert
```bash
# If critical issues:
git revert <commit-hash>
git push
npm run deploy
```

### Partial Revert
If only one optimization has issues, revert that specifically:

**Fonts**: Remove next/font, restore CSS imports
**Images**: Remove next/image, restore <img> tags
**ISR**: Change revalidate back to force-dynamic
**Dynamic**: Import components directly instead of dynamic()

---

## Sign-off Checklist

After all tests pass:

- [ ] All verifications complete
- [ ] No critical issues found
- [ ] Performance improvements validated
- [ ] Browser compatibility confirmed
- [ ] Mobile experience verified
- [ ] RTL layout correct
- [ ] Production metrics green
- [ ] Team approval obtained
- [ ] Ready for release

---

## Test Execution Log

| Test Category | Status | Date | Notes |
|---------------|--------|------|-------|
| Build | ⭕ Pending | — | |
| Fonts | ⭕ Pending | — | |
| Images | ⭕ Pending | — | |
| ISR | ⭕ Pending | — | |
| Dynamic Imports | ⭕ Pending | — | |
| Performance | ⭕ Pending | — | |
| Compatibility | ⭕ Pending | — | |
| RTL | ⭕ Pending | — | |
| Slow Network | ⭕ Pending | — | |
| Production | ⭕ Pending | — | |

---

## Notes

- Expect build times to increase by 5-10s due to image optimization
- First pageload after deployment triggers image optimization
- ISR revalidation happens automatically after 1 hour
- Monitor dashboard closely for first 24 hours post-deployment

---

**Verification Date**: [Fill in]  
**Verified By**: [Fill in]  
**Status**: ⭕ Not Started
