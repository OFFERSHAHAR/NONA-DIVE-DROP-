#!/bin/bash
# Health check script for DIVE DROP production and staging environments

set -e

PROD_URL="${PROD_URL:-https://dive-drop.app}"
STAGING_URL="${STAGING_URL:-https://staging.dive-drop.vercel.app}"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Checking $name... "

    # Check HTTP code
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" -m $TIMEOUT "$url" 2>/dev/null || echo "ERROR\n000")
    local end_time=$(date +%s%N)

    local http_code=$(echo "$response" | tail -n1)
    local duration=$(echo "scale=3; ($end_time - $start_time) / 1000000" | bc)ms

    if [ "$http_code" = "$expected_code" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ] || [ "$http_code" = "401" ]; then
        pass "$name ($http_code, ${duration})"
        return 0
    else
        fail "$name (HTTP $http_code, expected $expected_code)"
        return 1
    fi
}

# Main health check
echo ""
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo -e "${BLUE}   DIVE DROP Health Check Report${NC}"
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo ""
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo ""

# Production Checks
echo -e "${BLUE}Production Environment ($PROD_URL)${NC}"
echo "───────────────────────────────────────────"

check_endpoint "Production Health" "$PROD_URL/api/health" 200
check_endpoint "Production Homepage (EN)" "$PROD_URL/en" 200
check_endpoint "Production Homepage (HE)" "$PROD_URL/he" 200
check_endpoint "Production Login" "$PROD_URL/en/auth/login" 200

echo ""

# Staging Checks
echo -e "${BLUE}Staging Environment ($STAGING_URL)${NC}"
echo "───────────────────────────────────────────"

check_endpoint "Staging Health" "$STAGING_URL/api/health" 200
check_endpoint "Staging Homepage (EN)" "$STAGING_URL/en" 200
check_endpoint "Staging Homepage (HE)" "$STAGING_URL/he" 200
check_endpoint "Staging Login" "$STAGING_URL/en/auth/login" 200

echo ""

# DNS Resolution Check
echo -e "${BLUE}DNS & Connectivity${NC}"
echo "───────────────────────────────────────────"

# Production DNS
if dig dive-drop.app +short &>/dev/null; then
    pass "Production DNS resolution"
else
    fail "Production DNS resolution"
fi

# Staging DNS
if dig staging.dive-drop.vercel.app +short &>/dev/null; then
    pass "Staging DNS resolution"
else
    warn "Staging DNS resolution (may not be configured)"
fi

echo ""

# SSL Certificate Check
echo -e "${BLUE}SSL Certificates${NC}"
echo "───────────────────────────────────────────"

# Check production certificate
if echo | openssl s_client -servername dive-drop.app -connect dive-drop.app:443 2>/dev/null | grep -q "subject="; then
    pass "Production SSL certificate valid"
else
    fail "Production SSL certificate invalid"
fi

# Check staging certificate
if echo | openssl s_client -servername staging.dive-drop.vercel.app -connect staging.dive-drop.vercel.app:443 2>/dev/null | grep -q "subject="; then
    pass "Staging SSL certificate valid"
else
    warn "Staging SSL certificate issue"
fi

echo ""

# Performance Check
echo -e "${BLUE}Performance Metrics${NC}"
echo "───────────────────────────────────────────"

echo "Checking page load times..."
echo ""

# Production page load
prod_load=$(curl -s -w "%{time_total}" -o /dev/null -m $TIMEOUT "$PROD_URL/en" 2>/dev/null || echo "ERROR")
if [ "$prod_load" != "ERROR" ]; then
    prod_load_ms=$(echo "$prod_load * 1000" | bc)
    if (( $(echo "$prod_load < 3" | bc -l) )); then
        pass "Production page load: ${prod_load}s"
    elif (( $(echo "$prod_load < 5" | bc -l) )); then
        warn "Production page load: ${prod_load}s (slower than ideal)"
    else
        fail "Production page load: ${prod_load}s (too slow)"
    fi
else
    fail "Production page load: could not measure"
fi

# Staging page load
staging_load=$(curl -s -w "%{time_total}" -o /dev/null -m $TIMEOUT "$STAGING_URL/en" 2>/dev/null || echo "ERROR")
if [ "$staging_load" != "ERROR" ]; then
    if (( $(echo "$staging_load < 3" | bc -l) )); then
        pass "Staging page load: ${staging_load}s"
    else
        warn "Staging page load: ${staging_load}s"
    fi
else
    fail "Staging page load: could not measure"
fi

echo ""

# Database Connectivity (if available)
echo -e "${BLUE}Database Status${NC}"
echo "───────────────────────────────────────────"

# Note: This requires Supabase credentials
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ ! -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "Checking Supabase connectivity..."
    db_response=$(curl -s -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/health" -m $TIMEOUT 2>/dev/null || echo "ERROR")

    if [ "$db_response" != "ERROR" ]; then
        pass "Supabase API responding"
    else
        warn "Supabase API not responding"
    fi
else
    echo "⊘ Supabase credentials not configured, skipping database check"
fi

echo ""

# Summary
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo -e "${BLUE}   Health Check Summary${NC}"
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo ""

echo "Passed:  ${GREEN}$PASSED${NC}"
echo "Failed:  ${RED}$FAILED${NC}"
echo "Warnings: ${YELLOW}$WARNINGS${NC}"

echo ""

# Overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    exit 0
elif [ $FAILED -lt 3 ]; then
    echo -e "${YELLOW}⚠ Some issues detected, review above${NC}"
    exit 0
else
    echo -e "${RED}✗ Critical issues detected${NC}"
    exit 1
fi
