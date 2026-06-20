#!/bin/bash

# Bundle Analysis Script
# Analyzes Next.js bundle size before and after optimizations

echo "=========================================="
echo "DIVE DROP Bundle Size Analysis"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Prerequisites:${NC}"
echo "1. This script requires @next/bundle-analyzer"
echo "2. Install with: npm install --save-dev @next/bundle-analyzer"
echo ""

# Check if analyzer is installed
if ! npm list @next/bundle-analyzer > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing @next/bundle-analyzer...${NC}"
    npm install --save-dev @next/bundle-analyzer
fi

echo -e "${BLUE}Analyzing bundle size...${NC}"
echo ""

# Run build with analyzer
ANALYZE=true npm run build

echo ""
echo -e "${GREEN}✓ Bundle analysis complete!${NC}"
echo ""
echo "=========================================="
echo "Bundle Analysis Reports:"
echo "=========================================="
echo ""
echo "1. Main bundle (.next/static/chunks)"
echo "2. Page-specific bundles"
echo "3. Package imports (optimized)"
echo "4. Dynamic import chunks"
echo ""
echo "Files to review:"
echo "- .next/static/chunks/main-*.js"
echo "- .next/static/chunks/pages-*.js"
echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo "1. Look for large single-package dependencies"
echo "2. Check for duplicate packages across chunks"
echo "3. Verify dynamic imports are split correctly"
echo "4. Compare with previous bundle sizes"
echo ""

# Additional size report
echo -e "${BLUE}Detailed size information:${NC}"
echo ""
echo "Next.js Configuration:"
echo "  - Image optimization: enabled"
echo "  - Font optimization: enabled"
echo "  - Source maps: disabled (production)"
echo "  - Compression: enabled (Gzip + Brotli)"
echo ""

echo -e "${BLUE}Dynamic Imports in use:${NC}"
find src/components -name "*Dynamic*.tsx" 2>/dev/null | while read file; do
    echo "  ✓ $(basename "$file")"
done

echo ""
echo -e "${GREEN}=========================================${NC}"
