# DIVE DROP Deployment Procedures

**Release & Operations Playbook for Engineering & DevOps Teams**

**Version:** 1.0  
**Last Updated:** June 20, 2026  
**Audience:** DevOps, Tech Leads, Engineers

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Standard Deployment](#standard-deployment)
3. [Hotfix Deployment](#hotfix-deployment)
4. [Rollback Procedure](#rollback-procedure)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Before Any Deployment

**72 Hours Before Release:**
- [ ] Release notes drafted
- [ ] Version number decided (major.minor.patch)
- [ ] Changelog reviewed and complete
- [ ] All PRs merged to `main`
- [ ] All tests passing (CI/CD green)

**24 Hours Before Release:**
- [ ] Security team sign-off obtained
- [ ] Load testing completed
- [ ] Backup taken
- [ ] Deployment team assigned
- [ ] Incident response team notified

**2 Hours Before Release:**
- [ ] Staging deployment successful
- [ ] All staging tests passing
- [ ] Database migration tested (if applicable)
- [ ] Performance baseline verified
- [ ] Team ready in #deployments Slack channel

**30 Minutes Before Release:**
- [ ] Status page updated (announcing maintenance if needed)
- [ ] Team on standby
- [ ] Monitoring dashboards open
- [ ] Rollback plan reviewed
- [ ] Go/No-Go decision made

### Version Numbering

Format: `MAJOR.MINOR.PATCH`

```
1.0.0
├─ MAJOR: Breaking changes, major features (quarterly)
├─ MINOR: New features, improvements (monthly)
└─ PATCH: Bug fixes, hotfixes (as needed)

Example versions:
1.0.0 - Initial release
1.1.0 - Rate limiter added
1.1.1 - Token validation bug fix
2.0.0 - Architecture redesign
```

---

## Standard Deployment

### Process Overview

```
main branch (code merged)
    ↓
Automated CI/CD runs tests
    ↓
Deploy to Staging on Vercel
    ↓
Manual testing in staging
    ↓
Deploy to Production on Vercel
    ↓
Verify deployment
    ↓
Monitor for 24 hours
```

### Step 1: Create Release Tag

```bash
# On main branch
git tag -a v1.1.0 -m "Release v1.1.0: Add rate limiting

Features:
- Redis-backed rate limiting
- Per-endpoint configuration

Fixes:
- Fix token rotation bug

Breaking Changes:
- None

Migration Required:
- Yes: Add Redis instance

See CHANGELOG.md for details"

git push origin v1.1.0
```

### Step 2: Verify CI/CD Pipeline

1. Go to GitHub Actions
2. Verify all checks pass:
   - [ ] Lint (ESLint)
   - [ ] Types (TypeScript)
   - [ ] Tests (Vitest)
   - [ ] Build (Next.js)
3. Wait for deployment to staging

**Expected:** All checks green ✅

### Step 3: Staging Deployment

Vercel automatically deploys to staging on tag push.

**Staging URL:** `https://staging-dive-drop.vercel.app`

**Verification:**
```bash
# Check staging deployment status
vercel status

# Verify deployment
curl -I https://staging-dive-drop.vercel.app
# Should return 200 OK
```

### Step 4: Staging Testing (1-2 hours)

**Smoke Tests (Essential):**
1. [ ] Site loads without errors
2. [ ] Login works
3. [ ] Create listing works
4. [ ] Express interest works
5. [ ] Contact reveal works
6. [ ] Block user works
7. [ ] Report abuse works
8. [ ] Admin panel accessible

**Performance Tests:**
1. [ ] Page load time < 2 seconds
2. [ ] Database queries < 100ms
3. [ ] No memory leaks (check Lighthouse)
4. [ ] No console errors (DevTools)

**Security Tests:**
1. [ ] HTTPS enforced (no HTTP)
2. [ ] Security headers present (DevTools → Network)
3. [ ] XSS prevention working (try `<script>alert('xss')</script>`)
4. [ ] CORS working (cross-origin request blocked)

**Database Migration Test (if applicable):**
```bash
# Backup staging database first
vercel env pull # Export env vars
# Test migration manually:
# - Check table structure
# - Verify data integrity
# - Run queries
```

### Step 5: Production Deployment

**Two Deployment Strategies:**

#### Option A: Manual Deployment (Safer for critical changes)

```bash
# 1. Pull latest main
git checkout main && git pull origin main

# 2. Trigger production deployment
vercel --prod

# 3. Verify deployment
curl https://dive-drop.com
# Should return 200 OK
```

#### Option B: Automated Deployment (Fast for small changes)

Vercel automatically deploys to production when tag is created on main:
1. Wait for Vercel to detect tag
2. Verify production URL in Vercel dashboard
3. Confirm deployment in #deployments channel

**Production URL:** `https://dive-drop.com`

### Step 6: Post-Deployment Verification

Immediately after deployment (within 5 minutes):

```bash
# Check error logs
curl https://dive-drop.com/health

# Verify database connection
# (Visit admin dashboard, check if data loads)

# Verify rate limiting
# (Send 10 requests in 1 second, should be throttled)

# Verify authentication
# (Test login flow)
```

### Step 7: Monitor for Issues

**First 1 Hour:**
- [ ] Error logs stable (no spike)
- [ ] Performance metrics normal
- [ ] Users reporting no issues
- [ ] All core features working

**First 24 Hours:**
- [ ] No major incidents
- [ ] Performance regression < 5%
- [ ] Database performance normal
- [ ] User complaints addressed

---

## Hotfix Deployment

### For Critical Production Issues

Use this process for urgent bug fixes that cannot wait for next release.

### Step 1: Create Hotfix Branch

```bash
# From main branch
git checkout main && git pull origin main

# Create hotfix branch
git checkout -b hotfix/critical-bug-description

# Fix the bug
# ... code changes ...

# Commit
git add .
git commit -m "fix: critical bug description

Description of the bug and fix.

Fixes: #ISSUE_NUMBER

[Fix details]"

# Push
git push origin hotfix/critical-bug-description
```

### Step 2: PR & Review

1. Create PR to `main`
2. Title: `[HOTFIX] Critical bug description`
3. Add comment: "This is a critical hotfix for production"
4. Add labels: `hotfix`, `critical`
5. Request review from tech lead + security team
6. Merge after approval (no wait)

### Step 3: Deploy Hotfix

```bash
# Tag immediately with patch version
git checkout main && git pull origin main

git tag -a v1.1.1 -m "Hotfix v1.1.1: Critical bug fix

Bug: [Description]
Impact: [What was broken]
Fix: [How we fixed it]

Deployed: [Date/Time]"

git push origin v1.1.1
```

### Step 4: Notify Users

1. Post to #deployments: "🚨 HOTFIX DEPLOYED: [description]"
2. Update status page if customer-facing
3. Send email if data impact
4. Include: What was wrong, what we fixed, what to do

---

## Rollback Procedure

### If Something Goes Wrong

**Decision Tree:**

```
Issue detected?
├─ Minor bug (<50 users affected)
│  └─ Monitor and prepare fix
├─ Significant bug (>50 users affected)
│  └─ Rollback immediately
└─ Data corruption or security breach
   └─ Rollback immediately + incident response
```

### Instant Rollback (< 5 minutes)

```bash
# Option 1: Using Vercel Dashboard (fastest)
# 1. Go to https://vercel.com/dashboard
# 2. Select dive-drop project
# 3. Click "Deployments"
# 4. Find previous stable deployment
# 5. Click "..." menu
# 6. Click "Promote to Production"
# 7. Confirm

# Option 2: Using Vercel CLI
vercel --prod --force

# Then checkout previous version
git checkout v1.0.0
vercel --prod
```

**Expected:** Deployment completes in 2-5 minutes

### Verify Rollback

```bash
# Check version
curl https://dive-drop.com/health
# Should show v1.0.0

# Manual testing
# - Login
# - Browse listings
# - Create listing
# All should work as before
```

### Post-Rollback

1. **Declare Incident** in #incidents Slack
2. **Notify Users** if applicable
3. **Investigation** of what went wrong
4. **Fix** the issue on develop branch
5. **Test** thoroughly
6. **Redeploy** when ready

---

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

```bash
# Health check
curl -I https://dive-drop.com
# HTTP/2 200 OK

# Check error rate
curl https://dive-drop.com/health
# { "status": "healthy", "errors_1h": "0" }

# Database connectivity
# (Admin dashboard should load)

# Core workflows
# 1. Login
# 2. Create listing
# 3. View listings
# 4. Express interest
```

### Short-term Monitoring (5 min - 1 hour)

**Metrics to Monitor:**
```
✓ Error rate: Should be < 0.1% (5xx errors)
✓ Response time: Should be < 2s (p95)
✓ Database latency: Should be < 100ms
✓ Memory usage: Should be stable
✓ CPU usage: Should not spike
```

**Check Dashboards:**
- Vercel: https://vercel.com/dashboard
- Sentry (errors): https://sentry.io/dive-drop
- Analytics: Vercel Analytics

### Long-term Verification (1-24 hours)

1. [ ] No critical errors in logs
2. [ ] Performance regression < 5%
3. [ ] No user complaints
4. [ ] Database backups successful
5. [ ] All monitoring alerts normal

---

## Environment Configuration

### Vercel Environment Variables

**Production Environment:**

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://dive-drop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# Authentication
JWT_SECRET=***
NEXTAUTH_URL=https://dive-drop.com
NEXTAUTH_SECRET=***

# External Services
ANTHROPIC_API_KEY=***
RESEND_API_KEY=***

# Configuration
NODE_ENV=production
ALLOWED_ORIGINS=https://dive-drop.com,https://www.dive-drop.com
REDIS_URL=***
SENTRY_DSN=***

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_MONITORING=true
ENABLE_LOGGING=true
```

**Staging Environment:**

```env
# Same as production but points to staging databases
NEXT_PUBLIC_SUPABASE_URL=https://staging-dive-drop.supabase.co
# ... rest same structure, different secrets
```

### Environment Variable Rotation

**Quarterly (Every 3 months):**
1. [ ] Rotate all API keys
2. [ ] Rotate database passwords
3. [ ] Rotate JWT secrets
4. [ ] Update monitoring credentials
5. [ ] Test all systems work with new credentials

**After Security Incident:**
1. [ ] Immediately rotate all keys
2. [ ] Audit access logs
3. [ ] Change database password
4. [ ] Revoke old credentials

---

## Monitoring & Alerts

### Alerting Configuration

**Set Up Alerts in Vercel:**

1. Go to Project Settings → Integrations
2. Add Slack integration
3. Configure alerts for:
   - [ ] Deployment failed
   - [ ] Build error
   - [ ] Runtime error spike

**Error Monitoring (Sentry):**

1. Create project: https://sentry.io
2. Install Sentry package: `npm install @sentry/nextjs`
3. Configure in `sentry.server.config.js`
4. Set up alerts for:
   - [ ] New issue created
   - [ ] Error rate spike > 1%

**Performance Monitoring (Vercel Analytics):**

1. Enable in Vercel dashboard
2. Monitor:
   - [ ] Core Web Vitals
   - [ ] Performance regressions
   - [ ] Page load times

### On-Call Rotation

**Setup:**
- Primary: [Engineer Name] - Mon-Sun Week 1
- Secondary: [Engineer Name] - Mon-Sun Week 2

**Responsibilities:**
- Respond to critical alerts within 15 minutes
- Investigate production issues
- Perform hotfixes if needed
- Escalate to tech lead if unsure

**Alert Priority:**
- 🔴 **P0 (Critical):** Immediate response
  - Site down
  - Data corruption
  - Security breach
  - Example: "Database connection failed"

- 🟠 **P1 (High):** Within 30 minutes
  - Core feature broken
  - 1000+ users affected
  - Example: "Login not working"

- 🟡 **P2 (Medium):** Within 2 hours
  - Non-core feature broken
  - <1000 users affected
  - Example: "Search filter not working"

- 🟢 **P3 (Low):** Next business day
  - Minor bug
  - Cosmetic issue
  - Example: "Button color wrong"

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Deployment Fails

**Symptom:** "Build failed" error in GitHub Actions

**Diagnosis:**
```bash
# Check what failed
gh run view <run-id>

# Typical causes:
# - TypeScript errors
# - Test failures
# - ESLint errors
```

**Solution:**
```bash
# Fix the error locally
npm run build  # Check build
npm run test   # Check tests
npm run lint   # Check lint

# Commit fix
git add .
git commit -m "fix: resolve build error"
git push origin main

# Re-run CI
gh workflow run ci.yml
```

#### 2. Performance Regression

**Symptom:** Page load time > 3 seconds (was 1.5s)

**Diagnosis:**
```bash
# Check which files changed
git log --oneline main~5..main

# Use Lighthouse
# DevTools → Lighthouse → Performance

# Check bundle size
npm run analyze
```

**Solution:**
```bash
# Common causes:
# 1. Large dependency added
# 2. Image not optimized
# 3. Query not optimized

# For large dependency:
npm list [dependency-name]  # Find size
npm uninstall [dependency-name]  # Remove

# For images:
# Use next/image with proper width/height

# For queries:
# Add indexes, optimize SQL
```

#### 3. Database Connection Error

**Symptom:** "Connection pool exhausted" or timeout errors

**Diagnosis:**
```bash
# Check Supabase dashboard
# → Project Settings → Database
# → Connection Pooling Status

# Check active connections
SELECT count(*) FROM pg_stat_activity;
```

**Solution:**
```bash
# 1. Increase connection pool size (Supabase)
# 2. Check for connection leaks in code
# 3. Restart Supabase
# 4. Scale up database
```

#### 4. 500 Error in Production

**Symptom:** Users see "Internal Server Error" or 500 status

**Diagnosis:**
```bash
# Check Sentry
# https://sentry.io/dive-drop → Issues

# Check server logs (Vercel)
# Vercel Dashboard → Logs → Functions

# Common causes:
# 1. Uncaught exception in server action
# 2. Database query failed
# 3. Third-party API timeout
```

**Solution:**
```bash
# Review error stack trace
# Fix in code
# Test in staging
# Redeploy
```

#### 5. Rollback Not Working

**Symptom:** Rolled back version but errors continue

**Diagnosis:**
```bash
# Check if rollback actually deployed
curl https://dive-drop.com/health
# Check version in response

# Check if changes still in code
git log --oneline main | head
```

**Solution:**
```bash
# Force rollback with git
git revert <commit-hash>
git push origin main

# Or use Vercel CLI
vercel --prod --force
```

### Debug Checklist

For any issue:

1. [ ] **Gather Information**
   - What broke?
   - When did it break?
   - How many users affected?
   - Error message/logs?

2. [ ] **Locate the Problem**
   - Server-side or client-side?
   - Development or production?
   - All users or some users?
   - Specific feature or across app?

3. [ ] **Reproduce Issue**
   - Can you recreate it?
   - Which browser/device?
   - Which steps to reproduce?

4. [ ] **Isolate Root Cause**
   - Which code changed?
   - Which dependency changed?
   - Which config changed?

5. [ ] **Implement Fix**
   - Fix locally
   - Test in staging
   - Deploy to production
   - Verify fix

6. [ ] **Post-Mortem**
   - How did it get to production?
   - How do we prevent similar issues?
   - Update runbooks

---

## Release Checklist

**Use this before each production release:**

### Code Quality
- [ ] All tests passing
- [ ] Lint checks passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Code review completed
- [ ] Security review completed

### Deployment
- [ ] Staging deployment successful
- [ ] Staging smoke tests passed
- [ ] Staging performance acceptable
- [ ] Database migration tested (if applicable)
- [ ] Rollback plan reviewed

### Communication
- [ ] Release notes drafted
- [ ] Changelog updated
- [ ] Team notified
- [ ] Status page prepared
- [ ] Customer email drafted (if needed)

### Monitoring
- [ ] Error monitoring active
- [ ] Performance monitoring active
- [ ] On-call team assigned
- [ ] Incident response plan reviewed
- [ ] Alerts configured

### Go/No-Go
- [ ] [ ] GO - Proceed with deployment
- [ ] [ ] NO-GO - Hold and investigate

---

## Release Notes Template

```markdown
# Release v1.1.0 - [Date]

## New Features
- [Feature 1]: [Description]
- [Feature 2]: [Description]

## Improvements
- [Improvement 1]: [Description]
- [Improvement 2]: [Description]

## Bug Fixes
- [Bug 1]: [Description]
- [Bug 2]: [Description]

## Security Updates
- [Security issue]: [Description of fix]

## Breaking Changes
- [Breaking change]: [Migration guide if applicable]

## Migration Guide
If your deployment requires database changes:
1. Step 1: [Description]
2. Step 2: [Description]

## Known Issues
- [Known issue]: [Workaround if available]

## Thank You
Thank you to [contributors] for this release!

## Download
Download this release: [Link to GitHub releases page]
```

---

## Post-Deployment Communication

### For Users
```
Subject: [Product] Update - v1.1.0 Released

We've released a new version with improvements and bug fixes.

New Features:
- [Feature 1]
- [Feature 2]

What Changed:
- [Change 1]
- [Change 2]

No action needed - you'll see changes automatically.

Questions? Reply to this email or contact support@dive-drop.com
```

### For Internal Team
```
#deployments channel:

:rocket: DEPLOYMENT SUCCESSFUL: v1.1.0

Time: [Time]
Duration: [Duration]
Status: :white_check_mark: All checks passed

Changes:
- [Change 1]
- [Change 2]

Next: Monitor for issues, watch for user feedback
```

---

## Rollback Checklist

If rollback is needed:

- [ ] Declare incident in #incidents
- [ ] Decide rollback vs. quick fix
- [ ] Rollback using procedure above
- [ ] Verify rollback successful
- [ ] Notify users
- [ ] Root cause analysis
- [ ] Fix implemented
- [ ] Prevention measures identified

---

**Deployment Owner:** DevOps Team  
**Last Updated:** June 20, 2026  
**Next Review:** September 20, 2026
