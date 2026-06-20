# Monitoring & Alerts Setup Guide

**Version:** 1.0  
**Last Updated:** 2026-06-20  
**Purpose:** Configure automated monitoring and alerting for production  

---

## Overview

This document describes the monitoring and alerting infrastructure for DIVE DROP, including:
- GitHub Issues for CI/CD failures
- Vercel performance monitoring
- Supabase database monitoring
- Slack integration (optional)
- Custom metrics and dashboards

---

## 1. GitHub Issues Monitoring (Implemented)

### How It Works

The `monitoring-alerts.yml` GitHub Actions workflow automatically creates issues when:
- CI/CD pipeline fails
- Test coverage drops
- Performance regressions detected
- Security vulnerabilities found

**Location:** `.github/workflows/monitoring-alerts.yml`

### Accessing Alerts

1. **Go to GitHub Issues**
   ```
   https://github.com/REPO/dive-drop/issues
   ```

2. **Filter by monitoring alerts**
   ```
   Query: label:monitoring-alert
   ```

3. **View issues by severity**
   ```
   Query: label:monitoring-alert label:urgent
   Query: label:monitoring-alert label:warning
   ```

### Issue Labels

| Label | Meaning | Response Time |
|-------|---------|-----------------|
| `monitoring-alert` | Automatic alert from CI/CD | 1 hour |
| `urgent` | Production affected | 5 minutes |
| `build-failure` | Build failed | 30 minutes |
| `test-failure` | Tests failed | 30 minutes |
| `performance-regression` | Site slower | 4 hours |
| `security-alert` | Vulnerability found | 1 hour |

### Issue Contents

Each auto-created issue includes:

```markdown
## Monitoring Alert: Build Failure

**Type:** Build Failure
**Severity:** High
**Time:** 2026-06-20 14:32 UTC

### Details
- Workflow: ci-build-test.yml
- Branch: main
- Commit: abc123def456...

### Error
```
Error: TypeScript compilation failed
  src/app/api/users/route.ts:15 - error TS1234: ...
```

### View Full Logs
[View in GitHub Actions](https://github.com/.../actions/runs/...)

### Quick Actions
- [ ] Investigate root cause
- [ ] Create fix
- [ ] Deploy fix
- [ ] Close issue

### Assigned To
@on-call-engineer
```

### Responding to Alerts

**For Build Failures:**

1. Click the issue
2. Click "View in GitHub Actions" link
3. Review the failed step
4. Fix the issue:
   ```bash
   git checkout main
   git pull origin main
   # Reproduce and fix locally
   npm run lint --fix
   npm run build
   npm test
   git push origin main
   ```
5. Watch new workflow run
6. Close issue when fixed

**For Test Failures:**

1. Click the issue
2. Review failing test name
3. Run locally:
   ```bash
   npm test -- FailingTest
   ```
4. Fix test or code
5. Verify passes:
   ```bash
   npm test
   ```
6. Push and close issue

**For Performance Regressions:**

1. Review the metric that regressed
2. Check if related to recent commit
3. Investigate:
   - Did bundle size increase?
   - Did page load time increase?
   - Did database queries slow down?
4. Create hotfix or add to backlog
5. Close issue with explanation

**For Security Alerts:**

1. Review vulnerability details
2. Assess severity (critical vs. minor)
3. Run npm audit:
   ```bash
   npm audit
   ```
4. Update vulnerable dependency:
   ```bash
   npm update [package-name]
   ```
5. Test thoroughly
6. Deploy fix (treat as high-priority)

---

## 2. Vercel Monitoring

### Accessing Vercel Dashboard

1. Navigate to: https://vercel.com/TEAM/dive-drop
2. Sign in with team account
3. View monitoring tabs

### Key Metrics

**Deployments Tab:**
- View all deployments
- See deployment status (green/red)
- Check deployment duration
- View deployment logs

**Analytics Tab:**
- Core Web Vitals (LCP, FID, CLS)
- Page views and traffic
- Request count and errors
- Response time by page

**Settings > Monitoring:**
- Configure error rate threshold
- Set response time threshold
- Configure email alerts
- Enable Slack integration

### Setting Up Email Alerts

1. Go to: https://vercel.com/TEAM/dive-drop/settings/monitoring
2. Scroll to "Alerts"
3. Select alert conditions:
   - [ ] High error rate (>1%)
   - [ ] Slow response time (>2s avg)
   - [ ] Deployment failures
4. Enter email address
5. Click "Save"

### Setting Up Slack Alerts (Optional)

**Step 1: Create Slack Webhook**

1. Go to Slack Workspace Settings
2. Navigate to: Apps & Integrations > Manage Apps
3. Click "Build" > Create New App > From scratch
4. App name: "Vercel Monitoring"
5. Select your workspace
6. Enable "Incoming Webhooks"
7. Click "Add New Webhook to Workspace"
8. Select #incidents channel
9. Copy Webhook URL

**Step 2: Add to Vercel**

1. Go to: https://vercel.com/TEAM/dive-drop/settings/monitoring
2. Under "Integrations", click "Connect Slack"
3. Paste webhook URL
4. Test: Post manual message to verify

**Example Slack Alert:**
```
Vercel Alert: High Error Rate
Project: DIVE DROP
Time: 14:32 UTC
Error Rate: 2.3%
Threshold: 1%

View Dashboard: https://vercel.com/...
```

### Performance Baselines

**Expected Metrics (Production):**

| Metric | Target | Action if Exceeded |
|--------|--------|--------------------| 
| LCP | <2.5s | Investigate images/CSS |
| FID | <100ms | Check JavaScript |
| CLS | <0.1 | Fix layout shifts |
| Error Rate | <0.1% | SEV-1 incident |
| Response Time | <500ms | Optimize API |

### Investigating Performance Issues

1. **Check dashboard for trend**
   - When did metric degrade?
   - Was it a recent deployment?

2. **If deployment-related:**
   - Check what code changed
   - Compare bundle size to previous version
   - Rollback if necessary

3. **If ongoing degradation:**
   - Check database performance
   - Check for traffic spike
   - Monitor resource usage

---

## 3. Supabase Monitoring

### Accessing Supabase Dashboard

1. Navigate to: https://app.supabase.com
2. Select your project
3. Go to Monitoring tab

### Key Metrics to Monitor

**CPU Usage**
- Normal: 20-40%
- Warning: >70%
- Action: Check slow queries, add indexes

**Disk Space**
- Normal: >50% free
- Warning: <10% free
- Action: Archive old data or upgrade

**Connection Count**
- Normal: 10-50 connections
- Warning: >100 connections
- Action: Check for connection leaks

**Replication Lag**
- Normal: <1 second
- Warning: >5 seconds
- Critical: >30 seconds
- Action: Investigate replication status

### Database Health Query

```sql
-- Run in Supabase SQL Editor to check health

-- Table sizes
SELECT 
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection info
SELECT datname, usename, application_name, state, query
FROM pg_stat_activity
WHERE datname = 'postgres';

-- Cache hit ratio
SELECT 
  sum(heap_blks_read) as heap_read, 
  sum(heap_blks_hit) as heap_hit, 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as heap_ratio
FROM pg_statio_user_tables;

-- Slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index Creation

```sql
-- Find missing indexes for common queries
-- Example: Queries frequently filtered by dive_site_id

CREATE INDEX idx_feedback_site_id 
ON feedback(dive_site_id) 
WHERE deleted_at IS NULL;

-- Or with sort
CREATE INDEX idx_feedback_site_created 
ON feedback(dive_site_id, created_at DESC);

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Backup Verification

1. Go to Supabase Dashboard > Settings > Backups
2. Verify latest backup:
   - [ ] Completed successfully
   - [ ] Within last 24 hours
   - [ ] Size is reasonable

3. Test restore (quarterly):
   ```sql
   -- Can't restore via SQL, use dashboard
   -- Settings > Backups > Restore > Select date
   ```

---

## 4. Custom Metrics & Dashboards

### Application Metrics to Track

**Business Metrics:**
- Bookings per day
- Revenue per day
- Active divers per day
- Feedback submissions per day

**Technical Metrics:**
- API response times
- Database query times
- Error rates by endpoint
- Cache hit rates

### Adding Custom Metrics (Advanced)

**Option 1: Vercel KV (for simple metrics)**

```typescript
// Example: Track daily bookings
// src/lib/metrics.ts

import { kv } from '@vercel/kv';

export async function recordBooking(bookingData) {
  const date = new Date().toISOString().split('T')[0];
  
  // Increment daily counter
  await kv.incr(`bookings:${date}`);
  
  // Store detailed booking (expires after 30 days)
  await kv.setex(
    `booking:${bookingData.id}`,
    30 * 24 * 60 * 60,
    JSON.stringify(bookingData)
  );
}

// Retrieve metric
export async function getDailyBookings(date) {
  return kv.get(`bookings:${date}`);
}
```

**Option 2: Supabase Analytics Table**

```sql
-- Create analytics table
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW(),
  INDEX (metric_name, recorded_at DESC)
);

-- Insert metrics from application
-- Then query for dashboards
SELECT 
  DATE(recorded_at) as date,
  metric_name,
  SUM(metric_value) as total,
  AVG(metric_value) as average
FROM analytics
WHERE metric_name = 'bookings'
  AND recorded_at > NOW() - INTERVAL '30 days'
GROUP BY date, metric_name
ORDER BY date DESC;
```

**Option 3: Third-Party Dashboard (DataDog, New Relic)**

1. Create account at https://www.datadoghq.com/
2. Install APM agent:
   ```bash
   npm install @datadog/browser-rum
   ```

3. Initialize in application:
   ```typescript
   // src/instrumentation.ts
   import { datadogRum } from '@datadog/browser-rum';
   
   datadogRum.init({
     applicationId: 'YOUR_APP_ID',
     clientToken: 'YOUR_CLIENT_TOKEN',
     site: 'datadoghq.com',
     service: 'dive-drop',
     version: '1.0.0',
     sessionSampleRate: 100,
     trackUserInteractions: true,
     trackResources: true,
     trackLongTasks: true,
   });
   ```

4. View dashboards in DataDog console

---

## 5. Alert Escalation Policy

### Escalation Matrix

**For urgent issues (SEV-1):**

1. **5 minutes:** On-call engineer investigates
2. **10 minutes:** Escalate to Tech Lead if not resolved
3. **15 minutes:** Escalate to DevOps Lead if not resolved
4. **20 minutes:** Declare incident, all hands on deck

**For high-priority issues (SEV-2):**

1. **30 minutes:** On-call engineer investigates
2. **1 hour:** Escalate to Tech Lead if not resolved

**For medium-priority issues (SEV-3):**

1. **4 hours:** Assign to available engineer
2. **24 hours:** Must be started (fix or plan)

### On-Call Schedule

**Rotation:** Weekly, Monday-Sunday

**On-call duties:**
- Monitor GitHub Issues (check hourly)
- Respond to alerts within 5 minutes (SEV-1)
- Be reachable via Slack (best effort)

**On-call backup:**
- Secondary on-call for coverage during off-hours
- Takes over if primary unavailable

**See:** Slack #on-call-schedule for current schedule

---

## 6. Alert Tuning

### False Positives

**Issue:** Alerts triggering for non-critical items

**Solution:**

1. Identify which alerts are noisy
2. Adjust threshold:
   - Vercel: increase error % threshold
   - GitHub: add more specific filters
3. Document reason for adjustment
4. Re-evaluate monthly

### Missing Alerts

**Issue:** Critical problems not triggering alerts

**Solution:**

1. Identify gap
2. Add new alert or adjust existing threshold
3. Document in this file
4. Notify team of new alert

### Example: Adding New Alert

```yaml
# In .github/workflows/monitoring-alerts.yml

- name: Check Performance Regression
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const metrics = context.payload.workflow_run;
      
      // Check if performance metric degraded
      if (metrics.conclusion === 'failure') {
        github.rest.issues.create({
          owner: context.repo.owner,
          repo: context.repo.repo,
          title: '⚠️ Performance Regression Detected',
          body: `Performance metrics degraded in commit ${context.sha}`,
          labels: ['monitoring-alert', 'performance-regression']
        });
      }
```

---

## 7. Monitoring Checklist

### Daily
- [ ] Check GitHub Issues for alerts
- [ ] Review Vercel dashboard (any errors?)
- [ ] Quick Supabase health check

### Weekly
- [ ] Review error trends
- [ ] Check performance metrics
- [ ] Verify backups completed

### Monthly
- [ ] Analyze core metrics
- [ ] Review and tune alerts
- [ ] Identify performance improvements

### Quarterly
- [ ] Full disaster recovery test
- [ ] Security audit of monitoring
- [ ] Update monitoring strategy

---

## 8. Troubleshooting Monitoring

**Problem: Alert too sensitive (fires on every deploy)**

Solution:
1. Identify the metric
2. Increase threshold in settings
3. Document reason for change
4. Review in next month

**Problem: Alert not firing when issue occurs**

Solution:
1. Check alert is enabled in settings
2. Verify notification channel configured
3. Add more specific alert criteria
4. Test with manual failure

**Problem: Slack integration not working**

Solution:
1. Verify webhook URL is correct
2. Check channel name is valid
3. Verify bot has permission to post
4. Re-create webhook if needed

---

## Quick Reference

| Platform | Dashboard | Key Metric |
|----------|-----------|------------|
| GitHub | https://github.com/REPO/dive-drop/issues?q=label:monitoring-alert | Build status |
| Vercel | https://vercel.com/TEAM/dive-drop/analytics | LCP, error rate |
| Supabase | https://app.supabase.com > Monitoring | CPU, disk, connections |

---

**Document Owner:** DevOps Lead  
**Last Updated:** 2026-06-20  
**Next Review:** 2026-07-20
