# DIVE DROP CI/CD - Quick Start (30 Minutes)

## What You're Getting

- ✅ 5 production-ready GitHub Actions workflows
- ✅ 6 comprehensive documentation files (5000+ lines)
- ✅ 2 helper automation scripts
- ✅ Complete deployment & monitoring infrastructure
- ✅ Security scanning & alerting
- ✅ Rollback & incident procedures

## Step-by-Step Setup

### Step 1: Read (5 minutes)
```
Open these files in order:
1. CI_CD_README.md (entry point)
2. CICD_SETUP_SUMMARY.md (quick overview)
```

### Step 2: Gather Credentials (10 minutes)

Get these from their respective dashboards:
- **VERCEL_TOKEN** → https://vercel.com/account/tokens
- **VERCEL_ORG_ID** → https://vercel.com/account/settings
- **VERCEL_PROJECT_ID** → Vercel dashboard
- **NEXT_PUBLIC_SUPABASE_URL** → Supabase dashboard
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** → Supabase API keys
- **SUPABASE_SERVICE_ROLE_KEY** → Supabase API keys (secret)
- **ANTHROPIC_API_KEY** → https://console.anthropic.com
- **STAGING_APP_URL** → Your staging URL
- **PRODUCTION_APP_URL** → Your production URL

### Step 3: Configure Secrets (10 minutes)

Option A: Automated (Recommended)
```bash
chmod +x scripts/setup-cicd.sh
./scripts/setup-cicd.sh
```

Option B: Manual
```bash
# Set each secret
gh secret set VERCEL_TOKEN -b "your-token"
gh secret set VERCEL_ORG_ID -b "your-org-id"
# ... repeat for all secrets

# Verify
gh secret list
```

### Step 4: Create GitHub Environments (5 minutes)

1. Go to: GitHub → Settings → Environments
2. Create **staging** environment (no approval needed)
3. Create **production** environment
   - Add required reviewers (2+ people)
   - Set deployment branch to main

## Verify Everything Works

```bash
# Check secrets
gh secret list

# Check workflows
gh workflow list

# View workflow files
ls -la .github/workflows/

# Run health check
./scripts/health-check.sh
```

## Test Your Setup

### Test 1: CI Pipeline
```bash
git checkout -b test/ci
echo "# Test" >> README.md
git commit -am "test: ci pipeline"
git push origin test/ci
# Watch: GitHub Actions tab
```

### Test 2: Staging Deployment
```bash
git checkout develop
git merge test/ci
git push origin develop
# Wait 2-5 minutes
curl https://staging.dive-drop.vercel.app/en
```

### Test 3: Production Deployment
```bash
git checkout main
git merge develop
git push origin main
# Approve in GitHub Actions when prompted
curl https://dive-drop.app/en
```

## Next Actions

- [ ] Read CI_CD_README.md
- [ ] Run scripts/setup-cicd.sh
- [ ] Verify secrets: `gh secret list`
- [ ] Create GitHub Environments
- [ ] Test staging deployment
- [ ] Test production deployment
- [ ] Train team on procedures
- [ ] Document for your organization

## Common Commands

```bash
# View deployment status
gh run list --workflow=deploy-production.yml --limit 5

# Check specific run
gh run view <RUN_ID> --log

# Health check
./scripts/health-check.sh

# List secrets (safe - doesn't show values)
gh secret list

# View workflow files
ls -la .github/workflows/
```

## Documentation Guide

| Need | Read This |
|------|-----------|
| Quick overview | CICD_SETUP_SUMMARY.md |
| Setup secrets | GITHUB_SECRETS_SETUP.md |
| How workflows work | CICD_DEPLOYMENT_GUIDE.md |
| Daily operations | DEPLOYMENT_RUNBOOK.md |
| Technology details | CICD_TECH_STACK.md |
| Complete reference | CI_CD_README.md |

## Estimated Timeline

- Setup & config: 2-3 hours
- Team training: 2-4 hours
- Testing & validation: 2-3 hours
- **Total: 6-10 hours spread over 1-2 weeks**

## Support

- Docs: See files listed above
- Health check: `./scripts/health-check.sh`
- Logs: GitHub Actions tab
- Help: #dev-ops Slack channel

## Summary

You now have production-ready CI/CD with:
- Automated testing on every PR
- Security scanning (SAST, dependencies, secrets)
- Staged deployments (staging automatic, production approval)
- Hourly health monitoring
- Complete rollback procedures
- Comprehensive documentation

**Next step:** Open CI_CD_README.md and follow the setup guide!
