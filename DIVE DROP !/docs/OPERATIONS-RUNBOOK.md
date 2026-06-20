# DIVE DROP Operations Runbook

**Version:** 1.0  
**Last Updated:** 2026-06-20  
**Audience:** Operations, DevOps, On-Call Engineers  

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Deployment & Release Management](#deployment--release-management)
3. [Incident Response](#incident-response)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Maintenance Tasks](#maintenance-tasks)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Rollback Procedures](#rollback-procedures)
8. [Disaster Recovery](#disaster-recovery)

---

## Daily Operations

### Morning Health Check (5-10 minutes)

**Time:** Beginning of business day (9:00 AM)

**Procedure:**

1. **Check CI/CD Status**
   - Navigate to: https://github.com/REPO/dive-drop/actions
   - Verify no failed workflows on `main` branch
   - If failures exist, click failed job and review logs
   - Action: Create GitHub Issue if not already created

2. **Check Production Status**
   - Navigate to: https://vercel.com/TEAM/dive-drop
   - Click "Deployments" tab
   - Verify latest deployment shows green checkmark
   - Hover over deployment for last deployed time
   - Action: If older than 24 hours, verify main branch is healthy

3. **Check Application Health**
   ```bash
   # In terminal:
   curl -s https://dive-drop.app/api/health | jq .
   
   # Expected response:
   # { "status": "healthy", "timestamp": "2026-06-20T..." }
   ```
   - Action: If 500 error, check Supabase dashboard next

4. **Check Supabase Status**
   - Navigate to: https://app.supabase.com > Select project > Monitoring
   - Verify CPU usage <50%
   - Verify connected clients normal
   - Verify disk space >10% free
   - Action: If concerning metrics, check database connections

5. **Review Error Tracking**
   - Navigate to: https://github.com/REPO/dive-drop/issues
   - Filter by label: `monitoring-alert`, `urgent`
   - Read any issues created in last 12 hours
   - Action: Assign to on-call engineer if not already assigned

**If All Green:** Log completion in team Slack

**If Issues Found:** See [Incident Response](#incident-response) section

### Hourly Monitoring (During business hours)

**Every hour, check:**
1. Error rate in GitHub Issues (new alerts?)
2. Vercel deployment status (any recent failures?)
3. Slack for #incidents or #status-page updates

**Time commitment:** 2-3 minutes per hour

### End-of-Day Summary (5 minutes)

**Time:** Before leaving for the day

1. Check for any pending deployments
   - If staging only: OK to leave
   - If production pending: Coordinate with team

2. Update on-call engineer about any ongoing issues

3. Add notes to team Slack #incidents if any alerts remain open

---

## Deployment & Release Management

### Pre-Deployment Checklist

Before any deployment to production:

- [ ] All changes merged to `main` branch
- [ ] Latest commit has green checks (all CI/CD passed)
- [ ] Staging deployment successful (if applicable)
- [ ] Team lead approval obtained
- [ ] Deployment window scheduled (preferably off-peak hours)
- [ ] Runbook printed or accessible
- [ ] Rollback plan understood
- [ ] Backup created (Supabase auto-backup)

### Standard Release Process

**Step 1: Prepare Release Branch**
```bash
# Only do this if NOT using git tags (which auto-deploy)
git checkout main
git pull origin main
git log --oneline -10  # Review recent commits
```

**Step 2: Create Git Tag**
```bash
# Tag format: vX.Y.Z (e.g., v1.2.3)
# Use semantic versioning:
#   Major version: breaking changes
#   Minor version: new features
#   Patch version: bug fixes

git tag v1.2.3 -m "Release v1.2.3: Brief description of changes"
git push origin v1.2.3

# GitHub Actions will automatically:
# 1. Trigger build and test
# 2. Deploy to production
# 3. Create release notes
# 4. Send notification
```

**Step 3: Monitor Deployment**
```
Go to: GitHub Actions > Deploy to Production > [latest run]
Watch these steps:
1. pre-deployment-checks ✓
2. build-and-test ✓
3. deploy-production ✓
4. post-deployment-validation ✓

Estimated time: 8-12 minutes
```

**Step 4: Verify Production**
- [ ] Deployment shows "success" status
- [ ] Health check returns 200: `curl https://dive-drop.app/api/health`
- [ ] Homepage loads without errors: Visit https://dive-drop.app
- [ ] Login page works: Try login form (don't submit)
- [ ] No error spikes in monitoring

**Step 5: Notify Team**
```
Post to Slack:
"Deployment v1.2.3 successful! 
- Changes: [list key changes]
- Deploy time: [duration]
- Status: Healthy
- Next steps: [if any]"
```

### Hotfix Release (Emergency)

**Use when:** Critical bug in production, data corruption, security issue

**Timeline:** Deploy in <15 minutes

**Process:**

1. **Create hotfix branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue-description
   ```

2. **Make minimal fix**
   - Change ONLY the necessary code
   - Skip refactoring
   - Add inline comment explaining the fix

3. **Test fix locally**
   ```bash
   npm run test                    # Unit tests
   npm run build                   # Verify builds
   npm run dev                     # Manual test in browser
   ```

4. **Push and create PR**
   ```bash
   git add .
   git commit -m "HOTFIX: Brief description"
   git push origin hotfix/...
   ```
   - Create PR on GitHub
   - Mark as "HOTFIX" in title
   - Skip normal review process (tech lead can review after)

5. **Merge immediately**
   ```bash
   # After any quick review or if time-critical:
   git checkout main
   git pull origin main
   git merge hotfix/...
   git push origin main
   ```

6. **Tag and deploy**
   ```bash
   git tag v1.2.3-hotfix.1 -m "Critical hotfix"
   git push origin v1.2.3-hotfix.1
   ```

7. **Monitor**
   - Watch GitHub Actions carefully
   - If issue appears, immediately rollback (see Rollback Procedures)

8. **Post-Incident**
   - Create post-mortem issue
   - Review why bug wasn't caught earlier
   - Add test to prevent recurrence

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|----|
| **SEV-1** | Service down, data loss risk, security breach | Immediate (1 min) | All hands on deck |
| **SEV-2** | Service degraded, errors for some users | 5 minutes | Tech lead + DevOps |
| **SEV-3** | Non-critical bug, workaround available | 30 minutes | Assigned engineer |
| **SEV-4** | Minor issue, documentation needed | Next business day | Normal process |

### Incident Detection

**Automatic Detection:**
- GitHub Issues auto-created by `monitoring-alerts.yml` workflow
- Label applied based on severity
- Auto-assigned to on-call engineer

**Manual Detection:**
- Engineer notices issue while using the app
- User reports issue via support channel
- Monitoring dashboard shows spike

### SEV-1 Response Procedure

**Minute 0-1: Initial Assessment**
1. Determine scope: All users or just some?
2. Determine impact: Data loss risk? Complete outage?
3. Is it production or staging?

**Minute 1-5: Escalation & Communication**
1. Post to #incidents Slack channel:
   ```
   SEV-1: [Service] - [Brief description]
   Impact: [who/what affected]
   Investigating: @on-call-engineer
   Updates in thread
   ```

2. Notify tech lead: `@tech-lead SEV-1 incident, need your eyes`

3. Start incident timeline document:
   ```
   [HH:MM] Issue detected - [description]
   [HH:MM] Root cause identified - [what]
   [HH:MM] Fix deployed - [what changed]
   [HH:MM] Verified resolved - [tests run]
   ```

**Minute 5-15: Investigation & Fix**

1. **If deployment-related:**
   ```bash
   # Check what changed
   git log --oneline -5
   
   # Roll back immediately
   # See Rollback Procedures section
   ```

2. **If database-related:**
   ```bash
   # Check Supabase dashboard:
   # 1. CPU usage (should be <80%)
   # 2. Connection count (check for spikes)
   # 3. Replication lag (should be <1 second)
   # 4. Recent query logs (any errors?)
   ```

3. **If application error:**
   ```bash
   # Check error logs:
   # Vercel: Deployments > [current] > Logs
   # Search for errors in last 5 minutes
   
   # If known bug, create hotfix (see above)
   # Deploy hotfix immediately
   ```

**Minute 15-30: Verification**
1. Verify fix worked: `curl https://dive-drop.app/api/health`
2. Load application in browser, test core flows
3. Check error rate dropped to normal
4. Verify no data was lost

**Minute 30+: Communication & Closure**
1. Update Slack with resolution:
   ```
   SEV-1 RESOLVED: [Service]
   Root cause: [explanation]
   Fix deployed: [details]
   Impact: [how many affected, duration]
   Mitigation: [how to prevent]
   ```

2. Create post-mortem GitHub Issue (within 24 hours)

3. Close incident

### SEV-2 Response Procedure

**Similar to SEV-1 but:**
- Timeline: 5-10 minutes to fix
- Can assess situation before escalating
- Escalate to tech lead only if unsure

### SEV-3 Response Procedure

**For non-critical bugs:**
1. Create GitHub Issue with reproducible steps
2. Add to engineering backlog
3. Fix in next available sprint
4. Include regression test in fix

### Post-Incident Review (All Severities)

**Within 24 hours of incident resolution:**

1. **Create post-mortem issue:**
   - Title: "[POST-MORTEM] Incident name - Date"
   - Include: Timeline, root cause, contributing factors, lessons learned

2. **Schedule post-mortem meeting** (30-60 min)
   - All involved engineers
   - Tech lead facilitates
   - Document: "What went well? What could improve?"

3. **Action items:**
   - Add test to prevent recurrence
   - Update documentation
   - Process improvements

---

## Monitoring & Alerting

### GitHub Issues Alerts

**How it works:**
- `monitoring-alerts.yml` workflow monitors builds and tests
- Creates GitHub Issue when:
  - Workflow fails
  - Test coverage drops below threshold
  - Performance regressions detected
  - Security vulnerabilities found

**Where to find:**
- https://github.com/REPO/dive-drop/issues
- Filter by label: `monitoring-alert`

**Response required:**
- [ ] Click issue to see details
- [ ] Click linked workflow run
- [ ] Review error logs
- [ ] Determine action: Fix, merge, or skip

### Vercel Monitoring

**Dashboard:** https://vercel.com/TEAM/dive-drop

**Key metrics to watch:**
- **Deployments:** Latest deployment status
- **Error Rate:** Spike indicates issue
- **Response Time:** Degradation indicates overload
- **Redirects:** Unusual redirects indicate configuration issue

**Setup alerts (optional):**
1. Go to Settings > Monitoring
2. Configure email/Slack alerts for:
   - Deployment failures
   - High error rates (>1%)
   - Slow response times (>2s average)

### Supabase Monitoring

**Dashboard:** https://app.supabase.com > Select project > Monitoring

**Key metrics:**
- **CPU Usage:** Should stay <50% normally, warn if >70%
- **Disk Usage:** Warn if <10% free
- **Connection Count:** Spike indicates potential attack
- **Network Traffic:** Unusual spikes indicate issues
- **Replication Lag:** Critical - should be <1 second

**Action on alerts:**
```
High CPU:
1. Check for slow queries
   Go to: Logs > Slow queries
2. Identify bottleneck
3. Add index or optimize query
4. Deploy fix

Disk space low:
1. Check table sizes
   Go to: Database > [table] > Size
2. Identify largest tables
3. Archive old data or optimize
4. Plan disk expansion

Connection spike:
1. Could be DDoS attack
2. Check error logs for pattern
3. Block suspicious IPs if needed
4. Contact Supabase support if unresolved
```

### Setting Up Additional Monitoring (Optional)

**Option 1: Slack Integration**
1. Create Slack App with webhook
2. Add webhook URL to GitHub Secrets as `SLACK_WEBHOOK_URL`
3. Add step to workflows to post to Slack on failure

**Option 2: PagerDuty Integration**
1. Create PagerDuty account
2. Add integration key to GitHub Secrets
3. Create workflow to trigger incident
4. Set escalation policy for on-call

**Option 3: DataDog Integration**
1. Create DataDog account
2. Install APM agent in application
3. Create monitors for key metrics
4. Set up alert channels

---

## Maintenance Tasks

### Weekly Tasks (30-45 minutes)

**Monday Morning:**

1. **Review & Merge Dependabot PRs**
   ```bash
   # Go to: GitHub > Pull Requests > Author: dependabot
   # For each PR:
   - Review changes (check breaking changes)
   - Run npm run build locally to verify
   - Merge if safe
   - Watch CI/CD for failures
   ```

2. **Check Database Health**
   - Supabase Dashboard > Monitoring
   - Look for: CPU, disk, connections, replication lag
   - If concerning, investigate slow queries

3. **Review Application Logs**
   - Vercel Dashboard > Logs for last 7 days
   - Look for error patterns
   - Create GitHub Issues for recurring errors

4. **Verify Backup Status**
   - Supabase automatically backs up daily
   - Verify in: Settings > Backup Schedule
   - No action needed unless customization desired

**Friday Afternoon:**

1. **Summary Report**
   ```
   Post to #incidents:
   "Weekly Status Report:
   - Uptime: [%]
   - Errors: [count]
   - Deployments: [count]
   - Critical issues: [count]
   - Upcoming: [maintenance window details if any]"
   ```

### Monthly Tasks (1-2 hours)

**First Monday of Month:**

1. **Security Updates**
   ```bash
   npm audit
   # Review any high/critical vulnerabilities
   npm audit fix --force  # Only if safe
   npm run test           # Verify nothing broke
   npm run build          # Verify builds
   # Create PR and follow standard deployment
   ```

2. **Dependency Updates**
   ```bash
   npm outdated
   # Identify outdated packages
   npm update             # Updates non-major versions
   npm run test
   npm run build
   # Create PR with message "chore: Update dependencies"
   ```

3. **Database Maintenance**
   - Supabase Dashboard > Database > Analyze
   - Identify tables needing VACUUM or ANALYZE
   - Run during off-peak hours:
     ```
     SELECT schemaname, tablename, 
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
     FROM pg_tables 
     WHERE schemaname != 'pg_catalog' 
     ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
     ```

4. **Performance Baseline Review**
   - Compare Core Web Vitals to last month
   - Identify trends (improving/degrading?)
   - Plan optimizations if degrading

5. **Disaster Recovery Drill**
   - Restore from backup to test environment
   - Verify all data restored correctly
   - Test critical flows
   - Document any issues

### Quarterly Tasks (Half day)

**Every 3 months:**

1. **Security Audit**
   - Review all GitHub Secrets are still needed
   - Rotate any long-lived credentials
   - Check access logs for unusual activity
   - Review RLS policies are working correctly

2. **Architecture Review**
   - Database schema changes needed?
   - API patterns consistent?
   - Performance bottlenecks?
   - Scalability concerns?

3. **Documentation Review**
   - Is this runbook still accurate?
   - Any process changes needed?
   - Update version number
   - Commit changes

4. **Capacity Planning**
   - Disk space growing? When will it fill?
   - Connection limits adequate?
   - Request/month trending?
   - Plan scaling if needed

---

## Troubleshooting Guide

### Category 1: Deployment Issues

**Problem: Deployment fails with "Build error"**

**Steps:**
1. Check GitHub Actions: Actions > Deploy to Production > [latest run]
2. Scroll to "Build Application" step
3. Click step to expand logs
4. Look for error message

**Common causes:**
- TypeScript compilation error
- Missing environment variable
- Dependency conflict

**Fix:**
```bash
# Reproduce locally
git checkout main
git pull
npm install
npm run build

# This will show the same error
# Fix locally, test, push
git add .
git commit -m "fix: Resolve build issue"
git push origin main
```

---

**Problem: Deployment fails with "Test failure"**

**Steps:**
1. Check GitHub Actions > build-and-test > Run unit tests
2. Click step to see failures
3. Common issues:
   - New code broke existing test
   - Database fixture not set up
   - Async test timeout

**Fix:**
1. Reproduce locally:
   ```bash
   npm run test              # Run all tests
   npm run test -- [name]    # Run specific test
   ```

2. Fix the test or code causing failure
3. Verify all tests pass locally
4. Push fix and watch CI/CD

---

**Problem: "post-deployment-validation" fails**

**Steps:**
1. Check "Health check" step in Actions
2. Application might be starting up (takes ~60 seconds)
3. Retry the workflow:
   - Go to Actions > [failed workflow]
   - Click "Re-run failed jobs"
   - Usually passes on second try

**If still fails:**
1. Application is truly broken
2. Rollback immediately (see Rollback Procedures)

---

### Category 2: Application Runtime Issues

**Problem: Users see 500 error on certain pages**

**Steps:**
1. Try to reproduce: Visit the page yourself
2. If you see error: Problem is widespread
   - Go to Vercel Logs for that page request
   - Look for exception in logs
3. If you don't see error: Problem is intermittent
   - Check GitHub Issues for `monitoring-alert` labels
   - Review user reports

**Common causes:**
- Database connection dropped
- Malformed request from user
- Missing environment variable
- Third-party service (email, payment) failure

**Fix:**
- If database issue: Check Supabase health
- If code issue: Create hotfix (see Deployment section)
- If third-party: Check that service status page
- If intermittent: Monitor and create GitHub Issue

---

**Problem: Application loads but features are broken**

**Steps:**
1. Identify which feature is broken
2. Test feature in different browsers (Chrome, Firefox, Safari)
3. Check browser console for JavaScript errors
   - Open DevTools (F12)
   - Click Console tab
   - Reload page
   - Look for red errors

**Common causes:**
- CSS not loading (check Network tab)
- JavaScript module not loading
- Third-party script failure
- Browser compatibility issue

**Fix:**
- If CSS: Check public/styles loaded correctly
- If JavaScript: Check bundle in Vercel logs
- If third-party: Check that service
- Browser compat: Update documentation

---

**Problem: Slow page loads**

**Steps:**
1. Check Core Web Vitals in Vercel dashboard
2. Identify which page is slow
3. Check when slowness started (deploy-related?)
4. Use Vercel Analytics for details

**Common causes:**
- Large images not optimized
- Too many network requests
- Database query slow
- JavaScript bundle too large

**Fix:**
- Image optimization: Use Next.js Image component
- Network requests: Check waterfall in DevTools
- Database: Add index or optimize query
- Bundle size: Use dynamic imports

```typescript
// Example: Dynamic import for code splitting
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  { loading: () => <p>Loading...</p> }
);
```

---

### Category 3: Database Issues

**Problem: "Database connection failed" errors**

**Steps:**
1. Go to Supabase Dashboard > Monitoring
2. Check CPU usage (should be <80%)
3. Check disk space (should have >10% free)
4. Check connection count (unusual spike?)
5. Check replication lag (should be <1 second)

**Common causes:**
- Database paused (for free tier)
- Too many connections (connection pool exhausted)
- Disk full
- Network connectivity issue

**Fix:**
```bash
# If on free tier, resume database:
# Go to: Supabase Dashboard > Settings > Pause project
# Click "Resume"

# If connection limit hit:
# 1. Wait 5 minutes (connections time out)
# 2. Or restart application
# 3. Or increase connection pool limit

# If disk full:
# 1. Archive old data
# 2. Delete old files
# 3. Upgrade plan for more space
```

---

**Problem: "RLS policy blocks query"**

**Steps:**
1. Check user is authenticated
   - Generate JWT token
   - Verify token is valid
2. Check RLS policy
   - Go to Supabase: Auth > Policies
   - Verify policy matches user permissions

**Example RLS policy test:**
```sql
-- Test if user can see their own feedback
-- In Supabase SQL editor:

SET request.jwt.claims = jsonb_build_object(
  'sub', 'user-uuid-here'
);

SELECT * FROM feedback 
WHERE diver_id = auth.uid();
-- Should return results if policy allows
```

---

### Category 4: Performance Issues

**Problem: API endpoints respond slowly**

**Steps:**
1. Measure response time:
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s https://dive-drop.app/api/endpoint
   ```

2. Check if database is slow:
   - Supabase Dashboard > Logs > Slow Queries
   - Look for queries taking >1 second

3. Check if API code is slow:
   - Vercel Logs > function duration
   - Look for long-running functions

**Common causes:**
- Missing database index
- Inefficient query (N+1 problem)
- Large payload returned
- External API call slow

**Fix:**
```sql
-- Add index for common queries:
CREATE INDEX idx_feedback_site_date 
ON feedback(dive_site_id, created_at DESC);

-- Query plan to find bottleneck:
EXPLAIN ANALYZE SELECT * FROM feedback 
WHERE dive_site_id = 'site-uuid'
ORDER BY created_at DESC LIMIT 10;
```

---

**Problem: Website loads slowly for users**

**Steps:**
1. Check Core Web Vitals in Vercel Dashboard
2. Check if issue is global or regional:
   - Vercel > Analytics > Geography
3. Test with WebPageTest.org:
   - https://www.webpagetest.org
   - Test from different locations

**Common causes:**
- Large images
- Unoptimized CSS
- Too many third-party scripts
- JavaScript bundle too large

**Fix:**
```typescript
// Optimize images:
import Image from 'next/image';

// NOT: <img src="large.jpg" />
// YES:
<Image 
  src="large.jpg" 
  alt="description"
  width={800}
  height={600}
  priority={false}
/>

// Lazy load below-the-fold:
<Image ... loading="lazy" />
```

---

## Rollback Procedures

### Quick Rollback (Recommended)

**Use when:** Recent deployment is broken, need fast recovery

**Time:** 2-5 minutes

**Steps:**

1. **Identify previous good deployment**
   ```
   Go to: Vercel Dashboard > Deployments
   Find: Most recent deployment with green checkmark
   Note: Deployment URL or date
   ```

2. **Promote to production**
   ```
   Right-click on previous deployment
   Select: "Promote to Production"
   Confirm: Click "Promote"
   ```

3. **Verify rollback**
   ```bash
   curl https://dive-drop.app/api/health
   # Should return 200 OK
   
   # Check application loads
   Visit: https://dive-drop.app
   ```

4. **Notify team**
   ```
   Post to Slack:
   "Rolled back from [bad-deployment] to [previous-deployment]
   Reason: [brief explanation]
   Status: Investigating root cause"
   ```

---

### Git-based Rollback

**Use when:** Need to pinpoint exact commit that broke things

**Time:** 5-10 minutes

**Steps:**

1. **Identify bad commit**
   ```bash
   git log --oneline main -20
   # Find commit that broke things
   
   git revert <bad-commit-hash>
   # This creates new commit that undoes the change
   ```

2. **Push revert**
   ```bash
   git push origin main
   # GitHub Actions will auto-deploy
   ```

3. **Monitor deployment**
   - Watch Actions tab
   - Verify post-deployment-validation passes

---

### Full Database Rollback (Emergency Only)

**Use when:** Data corruption, accidental deletion, security breach

**Time:** 15-30 minutes + coordination

**WARNING:** This affects all users!

**Process:**

1. **Contact Supabase Support** (if production database)
   - Supabase Dashboard > Help > Contact Support
   - Explain: "Need to restore from backup due to [reason]"
   - Provide: Exact timestamp to restore to

2. **Supabase performs restore** (takes 10-30 minutes)

3. **Verify data integrity**
   - Check critical tables
   - Verify user data is intact
   - Test critical features

4. **Deploy any necessary code fixes**
   - If bug caused issue, fix and deploy hotfix

5. **Communication**
   - Inform all stakeholders
   - Post status update
   - Estimate recovery time

**Note:** For dev/staging: Can do manual restore via dashboard

---

## Disaster Recovery

### Backup Strategy

**Supabase Automated Backups:**
- Daily automatic backups
- 30-day retention
- Stored in separate region
- Accessible via Supabase dashboard

**Verify backups exist:**
```
Go to: Supabase Dashboard > Settings > Backups
Check: Latest backup completed timestamp
```

### Disaster Scenarios

**Scenario 1: Database completely down**

Recovery time: 2-4 hours (with Supabase support)

Process:
1. Contact Supabase Support
2. Request restore from latest backup
3. Supabase restores to new cluster
4. Update connection string in production
5. Deploy code changes to point to new database

**Scenario 2: Application code corrupted**

Recovery time: 5 minutes

Process:
1. Identify last good commit
2. Create hotfix that reverts to that state
3. Deploy hotfix
4. Verify functionality

**Scenario 3: All deployments broken (CI/CD failure)**

Recovery time: 10-15 minutes

Process:
1. Manually deploy to Vercel:
   ```bash
   npm install -g vercel
   vercel --token $VERCEL_TOKEN --prod
   ```

2. Or via Vercel CLI in GitHub Actions
3. Verify deployment succeeded

**Scenario 4: GitHub account compromised**

Recovery time: 30 minutes + GitHub support

Process:
1. Revoke all GitHub tokens
2. Rotate GitHub Secrets
3. Audit recent actions
4. Contact GitHub support if needed

### Testing Disaster Recovery

**Quarterly Drill (1st Friday of quarter):**

1. **Database Restore Test**
   ```
   Go to: Supabase > Backups
   Restore to temporary environment
   Verify: All tables intact
   Verify: RLS policies working
   Cleanup: Delete test environment
   ```

2. **Failover Test**
   - Simulate Vercel failure
   - Deploy to alternative hosting (Firebase, Railway, etc.)
   - Verify application works
   - Document time to failover

3. **Code Rollback Drill**
   - Deploy a test change
   - Roll it back using each method
   - Measure time to recovery
   - Document process

4. **Team Communication Drill**
   - Simulate incident
   - Test Slack notification flow
   - Verify all team members notified
   - Document response time

---

## Emergency Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Tech Lead | - | @tech-lead | - |
| DevOps Lead | - | @devops-lead | - |
| Database Admin | - | @db-admin | - |
| On-Call (this week) | [Check schedule] | #on-call-schedule | [See Slack] |
| Vercel Support | - | - | https://vercel.com/support |
| Supabase Support | - | - | support@supabase.io |

---

## Useful Commands Reference

```bash
# Status Checks
curl -s https://dive-drop.app/api/health | jq .

# Local Development
npm run dev                        # Start dev server
npm run build                      # Build for production

# Testing
npm test                           # Run tests
npm run test:coverage              # Coverage report
npx playwright test                # E2E tests

# Deployment
git tag v1.2.3                     # Create version tag
git push origin v1.2.3             # Trigger production deploy

# Database (if using Supabase CLI)
supabase start                     # Start local Supabase
supabase migration up              # Apply migrations
supabase db list-tables            # List tables

# Logs
npm run dev 2>&1 | tee debug.log   # Capture logs to file
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-20 | Initial runbook for production |
| 1.1 | TBD | Post-deployment updates |

---

**Document Owner:** DevOps Lead  
**Last Updated:** 2026-06-20  
**Next Review:** 2026-07-20
