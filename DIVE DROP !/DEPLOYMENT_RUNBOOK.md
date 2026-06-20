# DIVE DROP - Deployment Runbook

## Quick Reference

### Current Status Commands

```bash
# Check latest deployment
gh run list --workflow=deploy-production.yml --limit 5

# View specific run logs
gh run view <RUN_ID> --log

# Check running workflows
gh run list --status in_progress

# View recent commits
git log --oneline -10
```

## Staging Deployment (develop → staging)

### Automatic Deployment

Staging deploys automatically when code is pushed to `develop` branch.

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to develop
git push origin feature/new-feature
git checkout develop
git merge feature/new-feature
git push origin develop

# Watch deployment
gh run list --workflow=deploy-staging.yml --limit 1
```

### Manual Staging Deployment

```bash
# If you need to manually trigger staging deployment
gh workflow run deploy-staging.yml

# Monitor
gh run list --workflow=deploy-staging.yml --limit 1
gh run view <RUN_ID> --log
```

### Verify Staging

```bash
# Check health
curl https://staging.dive-drop.vercel.app/api/health

# Check homepage
curl https://staging.dive-drop.vercel.app/en

# View logs in Vercel
open https://vercel.com/dashboard
# → Select DIVE DROP
# → Deployments
# → Find staging deployment
# → Click to view logs
```

## Production Deployment (main → production)

### Pre-Deployment Checklist

- [ ] All features tested on staging
- [ ] Code reviewed by 2+ senior engineers
- [ ] Security scan passed
- [ ] All CI checks passing
- [ ] Release notes prepared
- [ ] Rollback plan ready
- [ ] Team notified

### Deployment Process

```bash
# 1. Ensure main branch is up to date
git checkout main
git pull origin main

# 2. Option A: Merge from develop
git merge develop
git push origin main

# 2. Option B: Create release with version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 3. Monitor deployment
# Go to: https://github.com/yourusername/dive-drop/actions
# Select: "Deploy to Production" workflow
# You'll need to approve after CI checks pass
```

### Approval Process

1. Deployment workflow triggers and runs tests
2. Waits at "production" environment for approval
3. Required reviewers receive notification
4. Reviewers check the PR/commit and approve
5. Deployment proceeds to production
6. Post-deployment validation runs
7. Monitoring alerts activated

```bash
# Monitor approval status
gh run view <RUN_ID> --log

# View deployment after approval
gh api repos/owner/repo/deployments --limit 1
```

### Verify Production

```bash
# Health check
curl https://dive-drop.app/api/health

# Verify endpoints
curl https://dive-drop.app/en
curl https://dive-drop.app/he
curl https://dive-drop.app/en/auth/login

# Check Vercel analytics
open https://vercel.com/dashboard
# → DIVE DROP
# → Analytics or Insights

# Check error tracking (if Sentry configured)
open https://sentry.io
```

## Monitoring Post-Deployment

### Automated Monitoring

Monitoring workflow runs every hour automatically:

```bash
# View monitoring runs
gh run list --workflow=monitoring-alerts.yml --limit 5

# Check latest monitoring report
gh run view <RUN_ID> --log

# View artifacts
gh run view <RUN_ID> --json artifacts
```

### Manual Health Checks

```bash
# Complete health check
./scripts/health-check.sh  # if available

# Or manual verification:
curl -v https://dive-drop.app/api/health
curl -v https://dive-drop.app/en
curl -v https://dive-drop.app/he

# Check response times
time curl https://dive-drop.app/en

# Test critical functionality
# - Login flow
# - Data submission
# - API calls
```

### Viewing Logs

```bash
# Vercel deployment logs
vercel logs

# Or in Vercel Dashboard:
# DIVE DROP → Deployments → [Version] → Logs

# Application logs (if integrated)
# Sentry, Datadog, or other monitoring service
```

## Rollback Procedures

### Quick Rollback (< 5 minutes)

**Best for**: Critical bugs, security issues

```bash
# Method 1: Vercel Dashboard
# 1. Go to https://vercel.com/dashboard
# 2. Select DIVE DROP
# 3. Click "Deployments"
# 4. Find previous stable deployment
# 5. Click "..." → "Promote to Production"

# Method 2: Vercel CLI
vercel rollback  # Rolls back to previous deployment
vercel rollback v1.0.0  # Rolls back to specific version

# Verify rollback
curl https://dive-drop.app/api/health
```

### Git-based Rollback (10-15 minutes)

**Best for**: Code-related issues

```bash
# 1. Identify problematic commit
git log --oneline main | head -20

# 2. Revert commit
git revert --no-edit <COMMIT_SHA>
git push origin main

# This triggers deployment workflow automatically

# 3. Monitor
gh run list --workflow=deploy-production.yml --limit 1
gh run view <RUN_ID> --log
```

### Tag-based Rollback (15-20 minutes with approvals)

**Best for**: Version-specific rollback

```bash
# 1. Find previous stable version
git tag -l | sort -V | tail -10

# 2. Checkout and deploy
git checkout v1.0.0  # Previous working version
git push origin HEAD:main

# 3. Approve when prompted in Actions

# 4. Verify deployment
curl https://dive-drop.app/api/health
```

### Emergency Hotfix Rollback

**For critical production issues**

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Fix the issue
# ... make changes ...

# 3. Commit and push
git commit -am "fix: critical production issue"
git push origin hotfix/critical-bug

# 4. Create PR and request emergency review
# Label: hotfix, critical, p0

# 5. Fast-track approval and merge to main
git checkout main
git merge --no-ff hotfix/critical-bug
git push origin main

# 6. Monitor deployment
gh run list --workflow=deploy-production.yml --limit 1

# 7. Communicate
# Slack: Alert team about hotfix
# GitHub: Create release notes
# Status: Update status page
```

## Incident Response

### Issue Detected

```bash
# 1. Alert team
# Slack: @channel Production issue detected
# GitHub: Create issue with "incident" label

# 2. Investigate
curl https://dive-drop.app/api/health  # Check health
gh run view <RUN_ID> --log  # Check deployment logs
# Check error tracking (Sentry)
# Check database status (Supabase)

# 3. Assess impact
# - Which features affected?
# - How many users impacted?
# - Is it still ongoing?
```

### Decision: Deploy Fix or Rollback?

```bash
# Fix is simple/quick (< 30 min):
# → Create hotfix branch and deploy

# Fix is complex (> 30 min):
# → Rollback to previous version
# → Deploy fix to staging
# → Test thoroughly
# → Deploy to production

# Severity is critical (complete outage):
# → Immediate rollback (use Vercel Dashboard for speed)
# → Then work on fix
```

### Post-Incident

```bash
# 1. Create postmortem issue
gh issue create \
  --title "Postmortem: [Incident Name]" \
  --label postmortem \
  --body "## Timeline\n...\n## Root Cause\n...\n## Action Items\n..."

# 2. Review logs
gh run list --limit 10 | grep -E "deploy|incident"

# 3. Update documentation
# Update DEPLOYMENT_RUNBOOK.md with lessons learned

# 4. Schedule postmortem meeting
# (If severity was high)
```

## Common Scenarios

### Scenario 1: Push to develop, wait for staging

```bash
git checkout develop
git pull origin develop
echo "# Changes" >> README.md
git commit -am "docs: update readme"
git push origin develop

# Wait ~2-5 minutes for staging deployment
gh run list --workflow=deploy-staging.yml --limit 1

# Test on staging
curl https://staging.dive-drop.vercel.app/en

# If OK, merge to main
git checkout main
git pull origin main
git merge develop
git push origin main

# Approve production deployment when prompted
```

### Scenario 2: Bug found in staging

```bash
# 1. Go back to develop
git checkout develop

# 2. Fix the bug
git checkout -b fix/bug-description
# ... fix code ...
git commit -am "fix: fix bug description"

# 3. Push and wait for staging
git push origin fix/bug-description
git checkout develop
git merge fix/bug-description
git push origin develop

# 4. Verify in staging
gh run list --workflow=deploy-staging.yml --limit 1

# 5. Once fixed, merge to main and deploy to production
git checkout main
git merge develop
git push origin main

# 6. Approve when prompted
```

### Scenario 3: Critical production bug

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-issue main

# 2. Fix immediately
# ... make changes ...
git commit -am "fix: critical issue"

# 3. Push hotfix
git push origin hotfix/critical-issue

# 4. Create urgent PR
# - Set "critical" label
# - Request fast-track review
# - Set to merge to main

# 5. Once approved, merge
git checkout main
git merge hotfix/critical-issue
git push origin main

# 6. Monitor deployment closely
gh run list --workflow=deploy-production.yml --limit 1
gh run view <RUN_ID> --log
curl https://dive-drop.app/api/health

# 7. Once deployed and verified
git checkout develop
git merge hotfix/critical-issue  # Ensure develop has fix too
git push origin develop
```

### Scenario 4: Performance issue detected

```bash
# 1. Check monitoring data
gh run view <MONITORING_RUN_ID> --log

# 2. Identify affected endpoint
# Check Lighthouse report or Vercel Analytics

# 3. Create performance improvement PR
git checkout -b perf/improve-endpoint-name
# ... optimize code ...
git push origin perf/improve-endpoint-name

# 4. Deploy to staging and measure
gh run list --workflow=deploy-staging.yml --limit 1

# 5. Once improved, merge to main
git checkout main
git merge perf/improve-endpoint-name
git push origin main

# 6. Monitor in production
gh run list --workflow=monitoring-alerts.yml --limit 1
```

## Regular Maintenance

### Weekly

```bash
# Check for security updates
npm audit

# Review error logs
# (If Sentry configured)

# Check deployment history
gh run list --workflow=deploy-production.yml --limit 10

# Verify staging is working
curl https://staging.dive-drop.vercel.app/api/health
```

### Monthly

```bash
# Rotate secrets
gh secret set ANTHROPIC_API_KEY -b "new-key"

# Review monitoring data
# - Error rates
# - Performance metrics
# - Uptime

# Update dependencies
npm outdated
npm update

# Check security advisories
npm audit

# Review CI/CD logs
gh run list --limit 50 | grep -E "error|failed|warning"
```

### Quarterly

```bash
# Full security audit
npm audit --production

# Review and update runbooks
# Update DEPLOYMENT_RUNBOOK.md

# Test rollback procedures
# Practice rollback on staging

# Review and rotate all secrets
# Vercel tokens
# API keys
# Database credentials

# Capacity planning
# Review metrics and plan for growth
```

## Useful Commands Reference

```bash
# Workflow Management
gh workflow list
gh workflow run deploy-production.yml
gh run list --workflow=ci-build-test.yml --limit 5

# Deployment Status
gh run view <RUN_ID> --log
gh api repos/owner/repo/deployments

# Secrets (safe - doesn't show values)
gh secret list

# Git Operations
git log --oneline main | head -20
git tag -l | sort -V
git push origin v1.0.0

# Testing
npm run build
npm run test
npm run test:coverage

# Local Vercel
vercel --version
vercel deploy
vercel rollback
```

## Contact & Escalation

### Deployment Issues

1. Check GitHub Actions logs: https://github.com/yourusername/dive-drop/actions
2. Check Vercel Dashboard: https://vercel.com/dashboard
3. Ask in team Slack #dev-ops channel
4. Create GitHub issue with "deployment" label

### Performance Issues

1. Check Lighthouse report (attached to workflow)
2. Check Vercel Analytics
3. Monitor Core Web Vitals
4. Create GitHub issue with "performance" label

### Security Issues

1. Check security scan results
2. Run `npm audit` locally
3. Create GitHub issue with "security" label
4. Notify security team immediately if critical

## Appendix: File Structure

```
DIVE DROP/
├── .github/workflows/
│   ├── ci-build-test.yml
│   ├── security-scanning.yml
│   ├── deploy-staging.yml
│   ├── deploy-production.yml
│   └── monitoring-alerts.yml
├── scripts/
│   └── setup-cicd.sh
├── CICD_DEPLOYMENT_GUIDE.md       (Complete guide)
├── GITHUB_SECRETS_SETUP.md        (Secrets setup)
├── DEPLOYMENT_RUNBOOK.md          (This file)
└── ...
```

---

**Last Updated**: $(date)
**Maintained by**: [Your Name]
**Questions?** Create GitHub issue or ask in #dev-ops
