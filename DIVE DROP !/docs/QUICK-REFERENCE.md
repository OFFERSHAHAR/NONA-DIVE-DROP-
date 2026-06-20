# DIVE DROP Quick Reference Card

**Print this and keep at your desk!**

---

## Emergency Contact

| If... | Then... |
|-------|---------|
| Site down | Post to #incidents, call @devops-lead |
| Can't deploy | Check GitHub Actions, then @tech-lead |
| Database issue | Check Supabase dashboard, ping @db-admin |
| Security concern | Report to @tech-lead immediately |

---

## Daily Commands

```bash
# Start development
npm run dev                    # → http://localhost:3000

# Check everything works
npm run lint                   # Linting
npm run build                  # Build
npm test                       # Tests

# Deploy to production
git tag v1.2.3                # Create version
git push origin v1.2.3        # Deploy (auto)

# Check health
curl https://dive-drop.app/api/health
```

---

## CI/CD Status

| Check | Where |
|-------|-------|
| Build status | https://github.com/REPO/dive-drop/actions |
| Deployment status | https://vercel.com/TEAM/dive-drop |
| Alerts | https://github.com/REPO/dive-drop/issues?q=label:monitoring-alert |
| Performance | https://vercel.com/TEAM/dive-drop/analytics |

---

## Common Issues

### Build Failed
```
→ Check: npm run lint
→ Check: npx tsc --noEmit
→ Fix: See error, fix code, push
```

### Site Returns 500 Error
```
→ Check: Vercel Logs for exception
→ Check: Supabase status (too many connections?)
→ Check: GitHub Issue (was it just created?)
→ Fix: Investigate root cause or rollback
```

### Page Loads Slowly
```
→ Check: Vercel Analytics for LCP
→ Check: DevTools Network tab (what's slow?)
→ Fix: Optimize images, reduce JS, add indexes
```

### Can't Log In
```
→ Check: Supabase Auth status
→ Check: JWT token generation
→ Fix: Restart app, clear cookies, check auth flow
```

---

## Rollback (Fast Recovery)

**Option 1: Vercel Dashboard** (easiest)
1. Go to https://vercel.com/TEAM/dive-drop/deployments
2. Find previous good deployment
3. Right-click → "Promote to Production"
4. Confirm

**Option 2: Git Revert** (if code issue)
```bash
git revert <bad-commit>
git push origin main
```

**Option 3: Database Restore**
- Go to Supabase > Settings > Backups
- Click "Restore" on previous backup
- (Takes 15-30 minutes)

---

## Monitoring URLs

| Service | Dashboard |
|---------|-----------|
| GitHub | https://github.com/REPO/dive-drop |
| Vercel | https://vercel.com/TEAM/dive-drop |
| Supabase | https://app.supabase.com |
| Production | https://dive-drop.app |
| Staging | https://staging.vercel.app |

---

## Key Files

| File | Purpose |
|------|---------|
| `TEAM-HANDOFF.md` | Complete handoff (read first!) |
| `OPERATIONS-RUNBOOK.md` | Daily operations procedures |
| `MONITORING-AND-ALERTS.md` | Monitoring setup |
| `.github/workflows/` | CI/CD pipelines |
| `supabase/migrations/` | Database schema |
| `src/lib/schemas.ts` | Input validation (Zod) |

---

## Tech Stack (Cheat Sheet)

```
Frontend:  React 19 + Next.js 16
Styling:   TailwindCSS 4
Database:  Supabase (PostgreSQL)
Auth:      Jose JWT
Validate:  Zod schemas
State:     Zustand
Testing:   Vitest + Playwright
Deploy:    Vercel
```

---

## Critical Secrets (GitHub Secrets)

```
VERCEL_TOKEN              # For deployments
VERCEL_ORG_ID
VERCEL_PROJECT_ID

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

ANTHROPIC_API_KEY
```

---

## Environment Variables (.env.local)

```bash
# Next.js
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Supabase (secret)
SUPABASE_SERVICE_ROLE_KEY=...

# Third-party
ANTHROPIC_API_KEY=...
```

---

## Incident Response (5-min checklist)

- [ ] Open Slack #incidents channel
- [ ] Post: "SEV-[1-4]: [Description]"
- [ ] Check GitHub Issues (monitoring alert?)
- [ ] Check Vercel dashboard (when did it break?)
- [ ] Check Supabase (DB health?)
- [ ] Investigate: root cause?
- [ ] Fix: code? deployment? database?
- [ ] Verify: curl health endpoint
- [ ] Update Slack: RESOLVED + cause + plan

---

## Debugging Commands

```bash
# TypeScript check
npx tsc --noEmit --pretty

# ESLint
npm run lint
npm run lint -- --fix

# Test specific file
npm test -- src/lib/auth.test.ts

# Test with coverage
npm run test:coverage

# E2E tests
npx playwright test

# Check database
supabase migration list
supabase logs
```

---

## Git Workflow

```bash
# New feature
git checkout -b feature/name
# ... make changes ...
git push origin feature/name

# Create PR on GitHub
# Wait for CI/CD (10 min)
# Get review
# Merge to main

# Deploy
git tag v1.2.3
git push origin v1.2.3
# Auto-deploys to production
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | <2.5s |
| FID (First Input Delay) | <100ms |
| CLS (Cumulative Layout Shift) | <0.1 |
| Build time | <5min |
| Deploy time | <10min |
| API response | <500ms |
| Error rate | <0.1% |
| Uptime | >99.9% |

---

## RLS (Row Level Security) Quick Ref

```sql
-- Allow users to see own feedback
SELECT auth.uid() = diver_id

-- Allow divers to update own feedback
UPDATE: auth.uid() = diver_id

-- Allow anyone to see public aggregations
SELECT: true
```

---

## One-Minute Checklist

**Before merging to main:**
- [ ] Tests pass: `npm test`
- [ ] TypeScript clean: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Builds: `npm run build`
- [ ] Code review approved
- [ ] No console errors in browser
- [ ] No sensitive data in code
- [ ] Security checks passed

---

## Architecture (1-page diagram)

```
┌─ User Browser ──────────────────────────┐
│                                         │
│  React (Next.js 16) + TailwindCSS      │
└────────────┬────────────────────────────┘
             │ HTTPS
        ┌────▼─────────┐
        │ Vercel Edge  │  ← Fast, global
        │ (Next.js)    │
        └────┬──────┬──┘
             │      │
         ┌───▼──┐  ┌▼──────────────┐
         │  DB  │  │ Third Parties │
         │Supabase│ │ - Email       │
         │  Auth │  │ - Payments    │
         │Storage│  │ - AI (Claude) │
         └──────┘  └───────────────┘
```

---

## Three Golden Rules

1. **Always test before deploying**
   ```bash
   npm run test && npm run build
   ```

2. **Communicate in #incidents channel**
   - Create issue for tracking
   - Keep team informed

3. **When in doubt, ask**
   - @tech-lead for guidance
   - @devops-lead for infrastructure
   - #engineering for general questions

---

## Resources

| Type | Location |
|------|----------|
| Runbook | `docs/OPERATIONS-RUNBOOK.md` |
| Handoff | `docs/TEAM-HANDOFF.md` |
| Monitoring | `docs/MONITORING-AND-ALERTS.md` |
| Meeting | `docs/TEAM-MEETING-AGENDA.md` |

---

## Last Resort Numbers

```
🚨 PRODUCTION DOWN?
1. Check GitHub Issues (label:monitoring-alert)
2. Check Vercel dashboard
3. Check Supabase status
4. Call @devops-lead immediately
5. Do NOT make random changes!
```

---

**Print & Post at Desk!**  
Questions? Ask @tech-lead on Slack  
Version 1.0 | Updated 2026-06-20
