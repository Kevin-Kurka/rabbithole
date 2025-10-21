#!/bin/bash
# ============================================================================
# Migration 013 Verification Script
# ============================================================================
# Description: Verifies all Migration 013 files are correct and ready
# Usage: ./verify_migration_013.sh
# ============================================================================

set -e

echo "========================================="
echo "Migration 013 Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0

# ============================================================================
# Test 1: Check migration file exists and is fixed version
# ============================================================================
echo "Test 1: Checking main migration file..."
if [ -f "backend/migrations/013_threaded_comments_notifications.sql" ]; then
    if grep -q "Version: 2.0 (Fixed)" "backend/migrations/013_threaded_comments_notifications.sql"; then
        echo -e "${GREEN}✓ PASS${NC}: Migration file is the fixed version"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}: Migration file is not the fixed version"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL${NC}: Migration file not found"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 2: Check rollback script exists
# ============================================================================
echo "Test 2: Checking rollback script..."
if [ -f "backend/migrations/013_threaded_comments_notifications_rollback.sql" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Rollback script exists"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Rollback script not found"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 3: Check test suite exists
# ============================================================================
echo "Test 3: Checking test suite..."
if [ -f "backend/migrations/013_test_suite.sql" ]; then
    TEST_COUNT=$(grep -c "test_count := test_count + 1" "backend/migrations/013_test_suite.sql" || echo 0)
    if [ "$TEST_COUNT" -ge 10 ]; then
        echo -e "${GREEN}✓ PASS${NC}: Test suite exists with $TEST_COUNT tests"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ WARN${NC}: Test suite has only $TEST_COUNT tests (expected 10+)"
        ((PASS++))
    fi
else
    echo -e "${RED}✗ FAIL${NC}: Test suite not found"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 4: Check README exists
# ============================================================================
echo "Test 4: Checking README..."
if [ -f "backend/migrations/013_README.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: README exists"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: README not found"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 5: Check migration is idempotent
# ============================================================================
echo "Test 5: Checking idempotency..."
if grep -q "IF NOT EXISTS" "backend/migrations/013_threaded_comments_notifications.sql"; then
    echo -e "${GREEN}✓ PASS${NC}: Migration uses IF NOT EXISTS"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Migration is not idempotent"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 6: Check no duplicate function definitions
# ============================================================================
echo "Test 6: Checking for duplicate function definitions..."
if grep -q "CREATE OR REPLACE FUNCTION update_updated_at_column" "backend/migrations/013_threaded_comments_notifications.sql"; then
    echo -e "${RED}✗ FAIL${NC}: Duplicate function definition found"
    ((FAIL++))
else
    echo -e "${GREEN}✓ PASS${NC}: No duplicate function definitions"
    ((PASS++))
fi
echo ""

# ============================================================================
# Test 7: Check for type constraints
# ============================================================================
echo "Test 7: Checking type constraints..."
if grep -q "CHECK (type IN" "backend/migrations/013_threaded_comments_notifications.sql"; then
    echo -e "${GREEN}✓ PASS${NC}: Type constraints exist"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Type constraints missing"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 8: Check for optimized indexes
# ============================================================================
echo "Test 8: Checking for optimized indexes..."
INDEX_COUNT=$(grep -c "CREATE INDEX" "backend/migrations/013_threaded_comments_notifications.sql" || echo 0)
if [ "$INDEX_COUNT" -ge 6 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Found $INDEX_COUNT indexes (expected 6+)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Found only $INDEX_COUNT indexes (expected 6+)"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 9: Check helper function exists
# ============================================================================
echo "Test 9: Checking helper function..."
if grep -q "get_comment_thread" "backend/migrations/013_threaded_comments_notifications.sql"; then
    echo -e "${GREEN}✓ PASS${NC}: Helper function exists"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Helper function missing"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Test 10: Check no leftover debug files
# ============================================================================
echo "Test 10: Checking for leftover files..."
LEFTOVER=$(find . -name "*MIGRATION_013_ANALYSIS*" -o -name "*013_threaded_comments_notifications_FIXED*" 2>/dev/null | wc -l)
if [ "$LEFTOVER" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: No leftover debug files"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Found $LEFTOVER leftover debug files"
    ((FAIL++))
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
TOTAL=$((PASS + FAIL))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASS/$TOTAL)*100}")

echo "========================================="
echo "Verification Results"
echo "========================================="
echo "Total Tests: $TOTAL"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Success Rate: $SUCCESS_RATE%"
echo "========================================="

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Migration 013 is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/013_threaded_comments_notifications.sql"
    echo "2. docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/013_test_suite.sql"
    echo "3. docker-compose restart api"
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please review the failures above before deploying."
    exit 1
fi
