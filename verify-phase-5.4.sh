#!/bin/bash

# Wave 5, Phase 5.4 Verification Script

echo "=========================================="
echo "Wave 5, Phase 5.4 Verification"
echo "=========================================="
echo ""

BACKEND_DIR="/Users/kmk/rabbithole/backend"
FRONTEND_DIR="/Users/kmk/rabbithole/frontend"
ROOT_DIR="/Users/kmk/rabbithole"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (NOT FOUND)"
        return 1
    fi
}

echo "Checking Backend Files..."
echo "------------------------------------------"
check_file "$BACKEND_DIR/migrations/009_performance_indexes.sql" "Database indexes migration"
check_file "$BACKEND_DIR/src/services/CacheService.ts" "Cache service"
check_file "$BACKEND_DIR/src/resolvers/GraphResolver.ts" "GraphResolver (modified)"
check_file "$BACKEND_DIR/test-performance.js" "Performance test script"

echo ""
echo "Checking Frontend Files..."
echo "------------------------------------------"
check_file "$FRONTEND_DIR/next.config.ts" "Next.js config (modified)"
check_file "$FRONTEND_DIR/src/components/ErrorBoundary.tsx" "Error boundary"
check_file "$FRONTEND_DIR/src/components/LoadingStates.tsx" "Loading states"
check_file "$FRONTEND_DIR/src/components/PerformanceMonitor.tsx" "Performance monitor"
check_file "$FRONTEND_DIR/src/utils/performanceMonitoring.ts" "Performance utilities"
check_file "$FRONTEND_DIR/src/app/layout.tsx" "Layout (modified)"
check_file "$FRONTEND_DIR/src/app/globals.css" "Global CSS (modified)"
check_file "$FRONTEND_DIR/run-lighthouse.js" "Lighthouse test script"
check_file "$FRONTEND_DIR/test-bundle-size.js" "Bundle size test script"

echo ""
echo "Checking Documentation..."
echo "------------------------------------------"
check_file "$ROOT_DIR/PERFORMANCE_OPTIMIZATIONS.md" "Performance optimizations guide"
check_file "$ROOT_DIR/DEPLOYMENT_CHECKLIST.md" "Deployment checklist"
check_file "$ROOT_DIR/MONITORING_GUIDE.md" "Monitoring guide"
check_file "$ROOT_DIR/WAVE5_PHASE5.4_SUMMARY.md" "Phase summary"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Run database migration: psql -U user -d dbname -f $BACKEND_DIR/migrations/009_performance_indexes.sql"
echo "2. Test backend performance: node $BACKEND_DIR/test-performance.js"
echo "3. Build frontend: cd $FRONTEND_DIR && npm run build"
echo "4. Test bundle sizes: node $FRONTEND_DIR/test-bundle-size.js"
echo "5. Run Lighthouse: node $FRONTEND_DIR/run-lighthouse.js"
echo ""
