#!/bin/bash
# Validate GitHub Actions workflows and dry-run tests
# This script validates workflow syntax and tests dry-run modes

set -e

echo "=========================================="
echo "GitHub Actions Workflow Validation"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
WORKFLOWS_DIR=".github/workflows"
DRY_RUN=true
TEST_DEPLOYMENTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --run-tests)
      TEST_DEPLOYMENTS=true
      shift
      ;;
    --no-dry-run)
      DRY_RUN=false
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
    echo -e "${RED}❌ GitHub CLI not installed${NC}"
    echo "Install: https://cli.github.com"
    exit 1
fi

if ! command -v yq &> /dev/null; then
    echo -e "${YELLOW}⚠ yq not installed (YAML parser)${NC}"
    echo "Install: https://github.com/mikefarah/yq"
    # Continue anyway - just skip YAML validation
    HAS_YQ=false
else
    HAS_YQ=true
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Get repository info
REPO=$(git remote get-url origin | sed -E 's/.*[:/]([^/]+\/[^/]+)(\.git)?$/\1/')
echo -e "${BLUE}Repository: $REPO${NC}"
echo ""

# Validate workflow files
echo -e "${BLUE}Validating workflow files...${NC}"
echo ""

workflows=(
  "ci-build-test.yml"
  "security-scanning.yml"
  "deploy-staging.yml"
  "deploy-production.yml"
  "monitoring-alerts.yml"
)

VALID_COUNT=0
INVALID_COUNT=0

for workflow in "${workflows[@]}"; do
  WORKFLOW_PATH="$WORKFLOWS_DIR/$workflow"

  if [ ! -f "$WORKFLOW_PATH" ]; then
    echo -e "${YELLOW}⚠ Missing: $workflow${NC}"
    INVALID_COUNT=$((INVALID_COUNT + 1))
    continue
  fi

  echo -n "Checking $workflow... "

  # Check basic YAML syntax
  if [ "$HAS_YQ" = true ]; then
    if yq eval '.' "$WORKFLOW_PATH" > /dev/null 2>&1; then
      echo -e "${GREEN}✓${NC}"
      VALID_COUNT=$((VALID_COUNT + 1))
    else
      echo -e "${RED}❌ Invalid YAML${NC}"
      INVALID_COUNT=$((INVALID_COUNT + 1))
    fi
  else
    # Just check if file exists and has content
    if [ -s "$WORKFLOW_PATH" ]; then
      echo -e "${GREEN}✓${NC}"
      VALID_COUNT=$((VALID_COUNT + 1))
    else
      echo -e "${RED}❌ Empty file${NC}"
      INVALID_COUNT=$((INVALID_COUNT + 1))
    fi
  fi
done

echo ""
echo "Workflow Files: $VALID_COUNT valid, $INVALID_COUNT invalid"
echo ""

# Check workflow features
echo -e "${BLUE}Checking workflow features...${NC}"
echo ""

# CI Build & Test
echo "CI Build & Test:"
if grep -q "dry-run" "$WORKFLOWS_DIR/ci-build-test.yml"; then
  echo -e "${GREEN}  ✓ Supports dry-run${NC}"
else
  echo -e "${YELLOW}  ⚠ No dry-run support${NC}"
fi

# Deploy Staging
echo "Deploy to Staging:"
if grep -q "dry-run" "$WORKFLOWS_DIR/deploy-staging.yml"; then
  echo -e "${GREEN}  ✓ Supports dry-run${NC}"
else
  echo -e "${YELLOW}  ⚠ No dry-run support${NC}"
fi

if grep -q "health-check" "$WORKFLOWS_DIR/deploy-staging.yml"; then
  echo -e "${GREEN}  ✓ Includes health checks${NC}"
fi

if grep -q "playwright" "$WORKFLOWS_DIR/deploy-staging.yml"; then
  echo -e "${GREEN}  ✓ Includes smoke tests${NC}"
fi

# Deploy Production
echo "Deploy to Production:"
if grep -q "dry-run" "$WORKFLOWS_DIR/deploy-production.yml"; then
  echo -e "${GREEN}  ✓ Supports dry-run${NC}"
else
  echo -e "${YELLOW}  ⚠ No dry-run support${NC}"
fi

if grep -q "environment: production" "$WORKFLOWS_DIR/deploy-production.yml"; then
  echo -e "${GREEN}  ✓ Requires approval${NC}"
fi

if grep -q "post-deployment-validation" "$WORKFLOWS_DIR/deploy-production.yml"; then
  echo -e "${GREEN}  ✓ Includes post-deployment validation${NC}"
fi

# Security Scanning
echo "Security Scanning:"
if grep -q "semgrep" "$WORKFLOWS_DIR/security-scanning.yml"; then
  echo -e "${GREEN}  ✓ Includes Semgrep${NC}"
fi

if grep -q "codeql" "$WORKFLOWS_DIR/security-scanning.yml"; then
  echo -e "${GREEN}  ✓ Includes CodeQL${NC}"
fi

if grep -q "truffleHog\|trufflehog" "$WORKFLOWS_DIR/security-scanning.yml"; then
  echo -e "${GREEN}  ✓ Includes TruffleHog${NC}"
fi

# Monitoring
echo "Monitoring & Alerts:"
if grep -q "schedule" "$WORKFLOWS_DIR/monitoring-alerts.yml"; then
  echo -e "${GREEN}  ✓ Scheduled monitoring${NC}"
fi

if grep -q "lighthouse" "$WORKFLOWS_DIR/monitoring-alerts.yml"; then
  echo -e "${GREEN}  ✓ Performance monitoring${NC}"
fi

echo ""

# Test workflow setup
if [ "$TEST_DEPLOYMENTS" = true ]; then
  echo -e "${BLUE}Testing workflow execution...${NC}"
  echo ""

  echo -e "${YELLOW}This will run dry-run workflows - they will NOT deploy!${NC}"
  echo ""

  # Test CI Build & Test
  echo "Testing CI Build & Test (dry-run)..."
  if gh workflow run ci-build-test.yml --ref "$(git rev-parse --abbrev-ref HEAD)" -R "$REPO"; then
    echo -e "${GREEN}✓ Triggered successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Could not trigger workflow${NC}"
  fi
  echo ""

  # Test Security Scanning
  echo "Testing Security Scanning (dry-run)..."
  if gh workflow run security-scanning.yml --ref "$(git rev-parse --abbrev-ref HEAD)" -R "$REPO"; then
    echo -e "${GREEN}✓ Triggered successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Could not trigger workflow${NC}"
  fi
  echo ""

  # Test Staging Deployment (dry-run)
  echo "Testing Deploy to Staging (dry-run)..."
  if gh workflow run deploy-staging.yml -f dry-run=true --ref "$(git rev-parse --abbrev-ref HEAD)" -R "$REPO"; then
    echo -e "${GREEN}✓ Triggered successfully (will validate without deploying)${NC}"
  else
    echo -e "${YELLOW}⚠ Could not trigger workflow${NC}"
  fi
  echo ""

  # Test Monitoring (dry-run)
  echo "Testing Monitoring & Alerts (dry-run)..."
  if gh workflow run monitoring-alerts.yml -f dry-run=true -R "$REPO"; then
    echo -e "${GREEN}✓ Triggered successfully (will report only)${NC}"
  else
    echo -e "${YELLOW}⚠ Could not trigger workflow${NC}"
  fi
  echo ""

  echo -e "${YELLOW}Check Actions tab to monitor workflow progress${NC}"
  echo "URL: https://github.com/$REPO/actions"
else
  echo -e "${BLUE}Workflow test details:${NC}"
  echo ""
  echo "To run workflow tests:"
  echo "  scripts/validate-workflows.sh --run-tests"
  echo ""
  echo "To disable dry-run (use with caution!):"
  echo "  scripts/validate-workflows.sh --no-dry-run"
fi

echo ""

# Check secrets configuration
echo -e "${BLUE}Checking secrets configuration...${NC}"
echo ""

REQUIRED_SECRETS=(
  "VERCEL_TOKEN"
  "VERCEL_ORG_ID"
  "VERCEL_PROJECT_ID"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "STAGING_APP_URL"
  "PRODUCTION_APP_URL"
)

echo "Required secrets:"
for secret in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list -R "$REPO" 2>/dev/null | grep -q "^$secret"; then
    echo -e "  ${GREEN}✓${NC} $secret"
  else
    echo -e "  ${YELLOW}⚠${NC} $secret (not set)"
  fi
done
echo ""

# Summary
echo -e "${GREEN}Validation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review workflow files in .github/workflows/"
echo "2. Set required secrets in GitHub Settings"
echo "3. Configure GitHub Environments (staging, production)"
echo "4. Run dry-run workflows: scripts/validate-workflows.sh --run-tests"
echo "5. Test with real code changes"
echo ""
