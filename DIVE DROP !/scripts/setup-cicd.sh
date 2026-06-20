#!/bin/bash
# Setup CI/CD and GitHub Secrets for DIVE DROP
# This script helps configure GitHub Actions and Vercel integration
# Supports dry-run mode for testing without making changes

set -e

echo "================================"
echo "DIVE DROP CI/CD Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
SKIP_SECRETS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      echo -e "${YELLOW}🏃 DRY-RUN MODE ENABLED${NC}"
      shift
      ;;
    --skip-secrets)
      SKIP_SECRETS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Get repository info
REPO_OWNER=$(git remote get-url origin | sed -E 's/.*[:/]([^/]+)\/.*/\1/')
REPO_NAME=$(git remote get-url origin | sed -E 's/.*\/([^/]+)\.git.*/\1/')

echo -e "${BLUE}Repository Information${NC}"
echo "Owner: $REPO_OWNER"
echo "Repository: $REPO_NAME"
echo ""

# Check GitHub authentication
echo -e "${BLUE}Verifying GitHub authentication...${NC}"
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
else
    echo -e "${YELLOW}⚠ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi
echo ""

# Validate existing workflows
echo -e "${BLUE}Validating GitHub Actions workflows...${NC}"
echo ""

workflows=(
  ".github/workflows/ci-build-test.yml"
  ".github/workflows/security-scanning.yml"
  ".github/workflows/deploy-staging.yml"
  ".github/workflows/deploy-production.yml"
  ".github/workflows/monitoring-alerts.yml"
)

for workflow in "${workflows[@]}"; do
  if [ -f "$workflow" ]; then
    echo -e "${GREEN}✓ Found $workflow${NC}"
  else
    echo -e "${YELLOW}⚠ Missing $workflow${NC}"
  fi
done
echo ""

# Secrets setup
if [ "$SKIP_SECRETS" = false ]; then
  echo -e "${BLUE}Setting up GitHub Secrets${NC}"
  echo ""

  declare -A secrets_info=(
      ["VERCEL_TOKEN"]="Vercel API token (https://vercel.com/account/tokens)"
      ["VERCEL_ORG_ID"]="Vercel Organization/Team ID"
      ["VERCEL_PROJECT_ID"]="Vercel Project ID"
      ["NEXT_PUBLIC_SUPABASE_URL"]="Supabase Project URL"
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="Supabase Anon Key"
      ["SUPABASE_SERVICE_ROLE_KEY"]="Supabase Service Role Key (KEEP SECRET!)"
      ["ANTHROPIC_API_KEY"]="Anthropic API Key"
      ["STAGING_APP_URL"]="Staging deployment URL"
      ["PRODUCTION_APP_URL"]="Production deployment URL"
  )

  echo "Required secrets to set up:"
  for secret in "${!secrets_info[@]}"; do
      echo "  - $secret: ${secrets_info[$secret]}"
  done
  echo ""

  if [ "$DRY_RUN" = false ]; then
    read -p "Do you want to set up secrets now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}Enter secret values (leave blank to skip)${NC}"
        echo ""

        for secret in "${!secrets_info[@]}"; do
            read -sp "$secret [${secrets_info[$secret]}]: " value
            echo
            if [ ! -z "$value" ]; then
                if [ "$DRY_RUN" = false ]; then
                  gh secret set "$secret" --body "$value" -R "$REPO_OWNER/$REPO_NAME"
                  echo -e "${GREEN}✓ Set $secret${NC}"
                else
                  echo -e "${YELLOW}[DRY-RUN] Would set $secret${NC}"
                fi
            fi
        done
        echo ""
    fi
  else
    echo -e "${YELLOW}[DRY-RUN] Skipping secret configuration${NC}"
    echo ""
  fi
fi

# Verify secrets
echo -e "${BLUE}Verifying secrets...${NC}"
if [ "$DRY_RUN" = false ]; then
  SECRETS=$(gh secret list -R "$REPO_OWNER/$REPO_NAME")
  SECRET_COUNT=$(echo "$SECRETS" | wc -l)
  echo "Found $SECRET_COUNT secrets:"
  echo "$SECRETS"
else
  echo -e "${YELLOW}[DRY-RUN] Would verify secrets${NC}"
fi
echo ""

# Create GitHub Environments
echo -e "${BLUE}GitHub Environments${NC}"
echo ""
echo "It's recommended to set up two environments:"
echo "1. staging - for develop branch deployments"
echo "2. production - for main branch deployments (with approvals)"
echo ""

if [ "$DRY_RUN" = false ]; then
  read -p "Do you want to configure GitHub Environments? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo -e "${YELLOW}⚠ GitHub Environments setup requires web interface${NC}"
      echo "Steps:"
      echo "1. Go to: https://github.com/$REPO_OWNER/$REPO_NAME/settings/environments"
      echo "2. Click 'New environment'"
      echo "3. Create 'staging' environment"
      echo "   - No approval required"
      echo "4. Create 'production' environment"
      echo "   - Add 2+ required reviewers"
      echo "   - Set deployment branch to 'main'"
      echo ""
      read -p "Press enter when environments are configured..."
  fi
else
  echo -e "${YELLOW}[DRY-RUN] Would guide through environment setup${NC}"
fi
echo ""

# Test workflows
echo -e "${BLUE}Testing Workflows${NC}"
echo ""

read -p "Do you want to validate the CI/CD workflows? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Workflow Summary:${NC}"
    echo ""
    echo "1. **CI Build & Test (ci-build-test.yml)**"
    echo "   - Triggers: push to main/develop, pull_request"
    echo "   - Runs: lint, type-check, build, unit tests, E2E tests"
    echo "   - Supports: --dry-run flag"
    echo ""
    echo "2. **Security Scanning (security-scanning.yml)**"
    echo "   - Triggers: push, pull_request, daily schedule"
    echo "   - Runs: npm audit, Semgrep, CodeQL, TruffleHog"
    echo "   - Supports: --dry-run flag"
    echo ""
    echo "3. **Deploy to Staging (deploy-staging.yml)**"
    echo "   - Triggers: push to develop, manual workflow_dispatch"
    echo "   - Runs: build, health checks, smoke tests"
    echo "   - Supports: --dry-run flag for validation"
    echo ""
    echo "4. **Deploy to Production (deploy-production.yml)**"
    echo "   - Triggers: push to main, tags, manual workflow_dispatch"
    echo "   - Runs: comprehensive tests, build, deployment"
    echo "   - Requires: manual approval in production environment"
    echo "   - Supports: --dry-run flag, --skip_tests option"
    echo ""
    echo "5. **Monitoring & Alerts (monitoring-alerts.yml)**"
    echo "   - Triggers: hourly schedule, manual dispatch"
    echo "   - Runs: uptime checks, performance audit, API monitoring"
    echo "   - Supports: --dry-run flag"
    echo ""

    echo -e "${YELLOW}To test workflows:${NC}"
    echo "1. Make a test commit: git commit --allow-empty -m 'test: CI workflow'"
    echo "2. Push: git push origin $(git rev-parse --abbrev-ref HEAD)"
    echo "3. Check Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    echo ""

    echo -e "${YELLOW}To test with dry-run:${NC}"
    echo "1. Go to: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    echo "2. Select a workflow"
    echo "3. Click 'Run workflow'"
    echo "4. Enable dry-run checkbox"
    echo "5. Click 'Run workflow'"
    echo ""
fi

# Vercel integration
echo -e "${BLUE}Vercel Integration${NC}"
echo ""

if command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI detected${NC}"
    if [ "$DRY_RUN" = false ]; then
      read -p "Run 'vercel link' to connect to your Vercel project? (y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
          vercel link
      fi
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Vercel CLI not installed${NC}"
    echo "Install from: https://vercel.com/docs/cli"
fi
echo ""

# Final summary
echo -e "${GREEN}Setup Summary${NC}"
echo ""
echo "Repository: $REPO_OWNER/$REPO_NAME"
if [ "$DRY_RUN" = false ]; then
  SECRETS=$(gh secret list -R "$REPO_OWNER/$REPO_NAME" 2>/dev/null || echo "")
  SECRET_COUNT=$(echo "$SECRETS" | wc -l)
  echo "Secrets configured: $SECRET_COUNT"
else
  echo "Mode: DRY-RUN (no changes made)"
fi
echo ""
echo "Next steps:"
echo "1. ✅ Configure GitHub Secrets"
echo "2. ✅ Set up GitHub Environments (staging & production)"
echo "3. ✅ Add team members as required reviewers"
echo "4. ✅ Test staging deployment (push to develop)"
echo "5. ✅ Test production deployment (push to main with approval)"
echo "6. ✅ Configure monitoring and alerts"
echo ""

# Documentation
echo -e "${BLUE}Generated Documentation${NC}"
echo ""

# Create CICD_DEPLOYMENT_GUIDE.md if it doesn't exist
if [ ! -f "CICD_DEPLOYMENT_GUIDE.md" ]; then
  cat > CICD_DEPLOYMENT_GUIDE.md << 'GUIDE'
# CI/CD Deployment Guide

## Overview

This project uses GitHub Actions for automated CI/CD pipelines with the following workflows:

### 1. CI Build & Test (`ci-build-test.yml`)
- **Triggers**: Push to main/develop, pull requests, manual dispatch
- **Jobs**: Setup, Lint, Type-check, Build, Unit Tests, E2E Tests, Summary
- **Dry-run support**: Yes (`--dry-run` input)

### 2. Security Scanning (`security-scanning.yml`)
- **Triggers**: Push, pull requests, daily schedule (2 AM UTC)
- **Jobs**: Dependency check, Semgrep SAST, CodeQL, TruffleHog, Security headers
- **Reports**: npm audit, SBOM, security summary

### 3. Deploy to Staging (`deploy-staging.yml`)
- **Triggers**: Push to develop, manual dispatch
- **Requirements**: VERCEL_TOKEN, STAGING_APP_URL
- **Includes**: Health checks, smoke tests, deployment notification
- **Dry-run support**: Yes (`--dry-run` input)

### 4. Deploy to Production (`deploy-production.yml`)
- **Triggers**: Push to main, tags (v*), manual dispatch
- **Requirements**: Requires manual approval in production environment
- **Includes**: Pre-deployment checks, comprehensive tests, post-deployment validation
- **Dry-run support**: Yes (`--dry-run` input)
- **Options**: Skip tests (not recommended)

### 5. Monitoring & Alerts (`monitoring-alerts.yml`)
- **Triggers**: Hourly schedule, manual dispatch
- **Checks**: Uptime, performance (Lighthouse), API health, database connectivity
- **Dry-run support**: Yes (`--dry-run` input)

## Dry-Run Mode

All workflows support dry-run mode for validation without actual deployments:

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Check "dry-run" input
5. Click "Run workflow"

# Via GitHub CLI
gh workflow run <workflow-file> -f dry-run=true
```

## Manual Approvals

Production deployments require manual approval:

1. Set up "production" environment in GitHub settings
2. Add required reviewers
3. On PR/deployment: reviewers receive approval request
4. Reviewers approve via GitHub UI

## Required Secrets

Set these in GitHub Settings > Secrets & variables > Actions:

| Secret | Description |
|--------|-------------|
| VERCEL_TOKEN | Vercel API token |
| VERCEL_ORG_ID | Vercel Organization ID |
| VERCEL_PROJECT_ID | Vercel Project ID |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| ANTHROPIC_API_KEY | Anthropic API key |
| STAGING_APP_URL | Staging environment URL |
| PRODUCTION_APP_URL | Production environment URL |

## Testing Workflows

### Test CI Workflow
```bash
git commit --allow-empty -m "test: CI workflow"
git push origin develop
```

### Test Staging Deployment
```bash
git push origin develop
# Watch: Actions tab > Deploy to Staging
```

### Test Production Deployment
```bash
git commit --allow-empty -m "test: prod deployment"
git push origin main
# Approve deployment when prompted
```

### Dry-Run Test (No Actual Deployment)
1. Go to Actions > [Workflow Name]
2. Click "Run workflow"
3. Enable dry-run checkbox
4. Click "Run workflow"

## Monitoring

### Uptime Checks
- Production: https://[PRODUCTION_APP_URL]/api/health
- Staging: https://[STAGING_APP_URL]/api/health
- Schedule: Hourly

### Performance Monitoring
- Lighthouse audit: Performance, accessibility, best practices, SEO, PWA
- Core Web Vitals: FCP, LCP, CLS

### API Response Monitoring
- Endpoint response times
- HTTP status codes
- Critical endpoint validation

## Rollback Procedures

### Option 1: Vercel UI
1. Go to Vercel Dashboard > DIVE DROP
2. Deployments tab
3. Find previous stable deployment
4. Click "..." > "Promote to Production"

### Option 2: GitHub Actions
1. Actions > Deploy to Production
2. Find previous successful run
3. Click "Re-run all jobs"

### Option 3: Git Rollback
```bash
git checkout <previous-tag>
git push origin HEAD:main --force  # Use with caution
```

## Troubleshooting

### Build Fails
1. Check logs in Actions tab
2. Verify Node.js dependencies: `npm ci`
3. Check TypeScript: `npx tsc --noEmit`
4. Check lint: `npm run lint`

### Tests Fail
1. Run locally: `npm run test`
2. Run E2E locally: `npx playwright test`
3. Check environment variables

### Deployment Fails
1. Check Vercel secrets are set
2. Verify STAGING_APP_URL / PRODUCTION_APP_URL
3. Check Vercel project ID matches

### Health Checks Fail
1. Check application is running
2. Verify /api/health endpoint exists
3. Check network connectivity

## Best Practices

1. **Always use dry-run first** for new workflows
2. **Tag releases** for production deployments (v1.0.0)
3. **Review changes** before approval
4. **Check artifacts** after workflows complete
5. **Monitor performance** weekly
6. **Keep dependencies updated** (security scanning runs daily)

GUIDE

  echo -e "${GREEN}✓ Created CICD_DEPLOYMENT_GUIDE.md${NC}"
fi

echo "- CICD_DEPLOYMENT_GUIDE.md: Complete CI/CD guide"
echo ""

# Links
echo -e "${BLUE}Useful Links${NC}"
echo "GitHub Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "Workflows: https://github.com/$REPO_OWNER/$REPO_NAME/tree/main/.github/workflows"
echo "Vercel Dashboard: https://vercel.com/dashboard"
echo "GitHub Secrets: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo "GitHub Environments: https://github.com/$REPO_OWNER/$REPO_NAME/settings/environments"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🏃 DRY-RUN MODE: No actual changes were made${NC}"
else
  echo -e "${GREEN}✓ Setup complete!${NC}"
fi
echo ""
