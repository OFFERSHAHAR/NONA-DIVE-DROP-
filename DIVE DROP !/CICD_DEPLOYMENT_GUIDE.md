# CI/CD Deployment Guide

## Overview

This project uses GitHub Actions for automated CI/CD pipelines with comprehensive coverage for building, testing, security, deployments, and monitoring.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Events (push, PR, schedule, manual dispatch)            │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────────────┬──────────────┐
        │                                 │              │
    Pull Request                   Push to main/develop  Tag v*
        │                                 │              │
        ▼                                 ▼              ▼
   ┌─────────────┐              ┌──────────────────┐   │
   │ CI Pipeline │              │ Security Scan    │   │
   ├─────────────┤              ├──────────────────┤   │
   │ • Lint      │              │ • npm audit      │   │
   │ • Type-check│              │ • Semgrep SAST   │   │
   │ • Build     │              │ • CodeQL         │   │
   │ • Unit tests│              │ • TruffleHog     │   │
   │ • E2E tests │              │ • SBOM           │   │
   └─────────────┘              └──────────────────┘   │
        │                                 │              │
        └─────────────┬───────────────────┘              │
                      │                                  │
                      ▼                                  ▼
           ┌────────────────────┐        ┌─────────────────────┐
           │ Deploy to Staging  │        │ Deploy to Production│
           │ (develop branch)   │        │ (main/tag)          │
           ├────────────────────┤        ├─────────────────────┤
           │ • Build            │        │ • Pre-checks        │
           │ • Tests            │        │ • Full tests        │
           │ • Deploy to Vercel │        │ • Manual approval   │
           │ • Health checks    │        │ • Deploy to Vercel  │
           │ • Smoke tests      │        │ • Post-validation   │
           └────────────────────┘        │ • Release notes     │
                      │                  └─────────────────────┘
                      │                           │
                      └───────────────┬───────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ Hourly Monitoring        │
                         ├──────────────────────────┤
                         │ • Uptime checks          │
                         │ • Performance audit      │
                         │ • API monitoring         │
                         │ • Database health        │
                         │ • Error tracking         │
                         └──────────────────────────┘
```

## Dry-Run Testing

All deployment workflows support dry-run mode for validation:

### Via GitHub UI
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Check "dry-run" checkbox
5. Click "Run workflow"

### What Happens in Dry-Run
- ✅ Validates build configuration
- ✅ Runs all tests
- ❌ Does NOT deploy to Vercel
- ℹ️ Reports would-be deployment URL

## Required Secrets

### GitHub Settings

Set in **Settings > Secrets and variables > Actions**:

| Secret | Type | Description |
|--------|------|-------------|
| VERCEL_TOKEN | Repository | Vercel API token |
| VERCEL_ORG_ID | Repository | Vercel org/team ID |
| VERCEL_PROJECT_ID | Repository | Vercel project ID |
| NEXT_PUBLIC_SUPABASE_URL | Repository | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Repository | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Repository | Supabase service role |
| ANTHROPIC_API_KEY | Repository | Anthropic API key |
| STAGING_APP_URL | Environment | Staging deployment URL |
| PRODUCTION_APP_URL | Environment | Production deployment URL |

## Key Workflows

### 1. CI - Build & Test
- **Triggers**: Push to main/develop, pull requests
- **Jobs**: Lint, Type-check, Build, Unit Tests, E2E Tests
- **Dry-run**: Yes

### 2. Security Scanning
- **Triggers**: Push, pull requests, daily schedule (2 AM UTC)
- **Jobs**: npm audit, Semgrep, CodeQL, TruffleHog, SBOM
- **Dry-run**: Yes

### 3. Deploy to Staging
- **Triggers**: Push to develop, manual dispatch
- **Jobs**: Build, Health checks, Smoke tests
- **Dry-run**: Yes

### 4. Deploy to Production
- **Triggers**: Push to main, tags (v*), manual dispatch
- **Requires**: Manual approval via production environment
- **Dry-run**: Yes

### 5. Monitoring & Alerts
- **Triggers**: Hourly schedule, manual dispatch
- **Jobs**: Uptime, Performance, API, Database, Error tracking
- **Dry-run**: Yes

## Setup Instructions

### 1. Configure Secrets
```bash
cd scripts
chmod +x setup-cicd.sh
./setup-cicd.sh
# Follow prompts to set secrets
```

### 2. Test Workflows
```bash
# Test CI workflow
git commit --allow-empty -m "test: CI workflow"
git push origin develop

# Test staging deployment (dry-run)
gh workflow run deploy-staging.yml -f dry-run=true

# Test production deployment (dry-run)
gh workflow run deploy-production.yml -f dry-run=true
```

### 3. Configure Approval
1. Go to Settings > Environments
2. Create "production" environment
3. Add 2+ required reviewers
4. Set deployment branch to "main"

## Manual Approvals

### For Production Deployments

1. **Create Release**:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. **Approve Deployment**:
   - Actions tab shows pending approval
   - Click "Review deployments"
   - Reviewers approve via GitHub UI

3. **Deployment Proceeds**:
   - Vercel deployment starts
   - Post-deployment validation runs
   - Status notification sent

## Troubleshooting

### Build Fails
```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

### Tests Fail
```bash
npm run test
npx playwright install
npx playwright test
```

### Deployment Fails
- Check Vercel secrets
- Verify GitHub environment configuration
- Check production app is running
- Review workflow logs

## Best Practices

1. **Always use dry-run first** before actual deployment
2. **Use semantic versioning** for production releases (v1.0.0)
3. **Require code reviews** on main branch
4. **Monitor performance** via hourly checks
5. **Keep dependencies updated** (security scanning runs daily)

## Rollback Procedures

### Option 1: Via Vercel UI (Recommended)
1. vercel.com > DIVE DROP > Deployments
2. Find previous stable deployment
3. Click "..." > "Promote to Production"

### Option 2: Via GitHub Actions
1. Actions > Deploy to Production
2. Click "Run workflow"
3. Provide previous tag version
4. Approve deployment

### Option 3: Via Git Tag
```bash
git tag -f v1.0.1 abc123def456
git push origin v1.0.1 --force
# Triggers Deploy to Production
```

## Support & Documentation

- **GitHub Actions**: https://docs.github.com/en/actions
- **Vercel**: https://vercel.com/docs
- **Next.js**: https://nextjs.org/docs
- **Semgrep**: https://semgrep.dev/docs

For detailed information, see individual workflow files in `.github/workflows/`.
