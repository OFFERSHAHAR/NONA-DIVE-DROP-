# GitHub Actions CI/CD Setup Checklist

Complete this checklist to fully configure the CI/CD pipeline.

## Phase 1: Initial Setup

- [ ] All workflow files are present:
  - [ ] `.github/workflows/ci-build-test.yml`
  - [ ] `.github/workflows/security-scanning.yml`
  - [ ] `.github/workflows/deploy-staging.yml`
  - [ ] `.github/workflows/deploy-production.yml`
  - [ ] `.github/workflows/monitoring-alerts.yml`

- [ ] Setup scripts are executable:
  - [ ] `scripts/setup-cicd.sh`
  - [ ] `scripts/validate-workflows.sh`

- [ ] Documentation is complete:
  - [ ] `GITHUB_ACTIONS_README.md` (overview)
  - [ ] `CICD_DEPLOYMENT_GUIDE.md` (detailed guide)
  - [ ] `SETUP_CHECKLIST.md` (this file)

## Phase 2: Secrets Configuration

### 2a. Gather Required Information

- [ ] Vercel API Token: `https://vercel.com/account/tokens`
  - Store as: `VERCEL_TOKEN`

- [ ] Vercel Organization ID
  - Go to: `https://vercel.com/account/teams`
  - Store as: `VERCEL_ORG_ID`

- [ ] Vercel Project ID
  - Go to: Project Settings > Project ID
  - Store as: `VERCEL_PROJECT_ID`

- [ ] Supabase Project URL
  - Go to: Project Settings > API
  - Store as: `NEXT_PUBLIC_SUPABASE_URL`

- [ ] Supabase Anonymous Key
  - Go to: Project Settings > API > `anon` key
  - Store as: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] Supabase Service Role Key
  - Go to: Project Settings > API > `service_role` key
  - Store as: `SUPABASE_SERVICE_ROLE_KEY`

- [ ] Anthropic API Key
  - Go to: `https://console.anthropic.com`
  - Store as: `ANTHROPIC_API_KEY`

- [ ] Staging App URL
  - Example: `https://staging.dive-drop.app`
  - Store as: `STAGING_APP_URL`

- [ ] Production App URL
  - Example: `https://dive-drop.app`
  - Store as: `PRODUCTION_APP_URL`

### 2b. Set Secrets in GitHub

**Option 1: Automated Setup (Recommended)**
```bash
cd scripts
chmod +x setup-cicd.sh
./setup-cicd.sh
# Follow interactive prompts
```

**Option 2: Manual Setup**
1. Go to: GitHub Settings > Secrets and variables > Actions
2. Click "New repository secret" for each:
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - VERCEL_PROJECT_ID
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY
   - STAGING_APP_URL (see Phase 3 for environment-specific)
   - PRODUCTION_APP_URL (see Phase 3 for environment-specific)

**Option 3: GitHub CLI**
```bash
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
# ... etc for each secret
```

- [ ] All 9 secrets configured

## Phase 3: Environment Configuration

### 3a. Create Staging Environment

1. Go to: GitHub Settings > Environments
2. Click "New environment"
3. Name: `staging`
4. Configure:
   - [ ] No protection rules
   - [ ] Deployment branches: `develop` (recommended)

### 3b. Create Production Environment

1. Go to: GitHub Settings > Environments
2. Click "New environment"
3. Name: `production`
4. Configure:
   - [ ] Required reviewers: Add 2+ team members
   - [ ] Deployment branches: Select "main" only
   - [ ] Add environment secret:
     - [ ] PRODUCTION_APP_URL

### 3c. Staging Environment Secrets

1. Go to: Staging environment
2. Add secret: `STAGING_APP_URL`

- [ ] Staging environment created
- [ ] Production environment created with reviewers
- [ ] Environment secrets configured

## Phase 4: Validation

### 4a. Validate Workflows

```bash
chmod +x scripts/validate-workflows.sh
./scripts/validate-workflows.sh
```

- [ ] All workflows have valid YAML
- [ ] All required features present
- [ ] All secrets listed

### 4b. Test Dry-Run Workflows

```bash
# Test CI workflow
git commit --allow-empty -m "test: CI workflow"
git push origin develop

# Test staging deployment (dry-run)
gh workflow run deploy-staging.yml -f dry-run=true

# Test production deployment (dry-run)
gh workflow run deploy-production.yml -f dry-run=true

# Test monitoring (dry-run)
gh workflow run monitoring-alerts.yml -f dry-run=true
```

- [ ] CI workflow runs successfully
- [ ] Staging dry-run completes
- [ ] Production dry-run completes
- [ ] Monitoring dry-run completes
- [ ] All artifacts generated

## Phase 5: Real Deployment Tests

### 5a. Test Staging Deployment

```bash
# Make a small change on develop branch
git checkout develop
echo "# Test" >> README.md
git add README.md
git commit -m "test: staging deployment"
git push origin develop
```

Monitor:
1. Go to Actions tab
2. Watch "Deploy to Staging" workflow
3. Verify:
   - [ ] Build succeeds
   - [ ] Health checks pass
   - [ ] Smoke tests pass
   - [ ] Deployment URL works

### 5b. Test Production Deployment (with dry-run)

```bash
# Create test tag
git tag v0.0.1-test
git push origin v0.0.1-test
```

Monitor:
1. Go to Actions tab
2. Watch "Deploy to Production" workflow
3. Verify:
   - [ ] Pre-deployment checks pass
   - [ ] Build succeeds
   - [ ] Tests pass
   - [ ] Approval workflow triggers
4. Approve deployment
5. Verify:
   - [ ] Production deployment succeeds
   - [ ] Health checks pass
   - [ ] Release notes created

- [ ] Staging deployment working
- [ ] Production deployment workflow working
- [ ] Manual approval process tested

## Phase 6: Security & Monitoring

### 6a. Verify Security Scanning

```bash
# Security scanning runs automatically on push
git push origin develop
```

1. Go to Actions tab
2. Find "Security Scanning & SAST" workflow
3. Verify:
   - [ ] npm audit completes
   - [ ] Semgrep runs
   - [ ] CodeQL runs
   - [ ] TruffleHog runs
   - [ ] Reports generated

- [ ] Security scanning working
- [ ] All security checks passing

### 6b. Verify Monitoring

```bash
gh workflow run monitoring-alerts.yml
```

1. Go to Actions tab
2. Watch "Monitoring & Alerts" workflow
3. Verify:
   - [ ] Uptime checks pass
   - [ ] Performance audit runs
   - [ ] API checks pass
   - [ ] Database health checked
   - [ ] Reports generated

- [ ] Monitoring workflow working
- [ ] All checks passing

## Phase 7: Documentation Review

- [ ] Read GITHUB_ACTIONS_README.md
- [ ] Read CICD_DEPLOYMENT_GUIDE.md
- [ ] Understand workflow architecture
- [ ] Review dry-run mode
- [ ] Review manual approval process
- [ ] Review rollback procedures

## Phase 8: Team Training

- [ ] Brief team on new CI/CD pipeline
- [ ] Show how to:
  - [ ] Check Actions tab
  - [ ] Review deployment logs
  - [ ] Approve production deployments
  - [ ] Rollback if needed
  - [ ] Monitor health

## Phase 9: Branch Protection Rules

1. Go to: Settings > Branches > Branch protection rules
2. For `main` branch:
   - [ ] Require pull request reviews (1+)
   - [ ] Require status checks to pass:
     - [ ] ci-build-test
     - [ ] security-scanning
   - [ ] Require branches to be up to date

3. For `develop` branch (optional):
   - [ ] Require pull request reviews
   - [ ] Require status checks

- [ ] Branch protection rules configured

## Phase 10: Final Verification

- [ ] Create a real PR to develop:
  - [ ] CI workflow runs
  - [ ] All checks pass
  - [ ] Can be merged

- [ ] Merge to develop:
  - [ ] Staging deployment triggers
  - [ ] Health checks pass
  - [ ] Deployment succeeds

- [ ] Create production release:
  - [ ] Tag with semantic version (v1.0.0)
  - [ ] Production workflow triggers
  - [ ] Approval request sent
  - [ ] Approve deployment
  - [ ] Production deploys successfully

- [ ] Verify monitoring:
  - [ ] Hourly health checks running
  - [ ] Lighthouse audit running
  - [ ] API monitoring working
  - [ ] Database health checked

## Phase 11: Documentation & Knowledge Transfer

- [ ] Document team workflows:
  - [ ] How to deploy to staging
  - [ ] How to deploy to production
  - [ ] How to rollback
  - [ ] How to monitor

- [ ] Create team guide with:
  - [ ] How to read workflow logs
  - [ ] How to debug failures
  - [ ] Contacts for on-call
  - [ ] Escalation procedures

- [ ] Post documentation in:
  - [ ] Wiki/confluence
  - [ ] Team Slack
  - [ ] GitHub README

## Completion Checklist

### All Phases Complete?
- [ ] Phase 1: Initial Setup
- [ ] Phase 2: Secrets Configuration
- [ ] Phase 3: Environment Configuration
- [ ] Phase 4: Validation
- [ ] Phase 5: Real Deployment Tests
- [ ] Phase 6: Security & Monitoring
- [ ] Phase 7: Documentation Review
- [ ] Phase 8: Team Training
- [ ] Phase 9: Branch Protection Rules
- [ ] Phase 10: Final Verification
- [ ] Phase 11: Documentation & Knowledge Transfer

### Ready for Production?
- [ ] All workflows tested and passing
- [ ] All secrets configured
- [ ] All environments set up
- [ ] Manual approval working
- [ ] Team trained
- [ ] Documentation complete
- [ ] Monitoring enabled
- [ ] Rollback procedures documented

## Next Steps After Setup

1. **Daily**: Monitor Actions tab
2. **Weekly**: Review security scan results
3. **Monthly**: Review performance metrics
4. **Quarterly**: Update dependencies
5. **As-needed**: Respond to health alerts

## Support Resources

- **GITHUB_ACTIONS_README.md**: Quick reference
- **CICD_DEPLOYMENT_GUIDE.md**: Complete guide
- **Workflow files**: Inline comments
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Vercel docs**: https://vercel.com/docs

## Questions?

If something doesn't work:
1. Check the relevant workflow logs
2. Review CICD_DEPLOYMENT_GUIDE.md troubleshooting section
3. Check GitHub Actions documentation
4. Create an issue with [CI] tag

---

**Last Updated**: 2026-06-20
**Version**: 1.0.0
