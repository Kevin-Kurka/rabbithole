#!/bin/bash
# ============================================================================
# Installation Script for Migration 007: Egalitarian Process Validation System
# ============================================================================
# Description: Installs the egalitarian promotion system with all safeguards
# Author: Database Architecture Team
# Date: 2025-10-09
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  Migration 007: Egalitarian Process Validation System${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL found${NC}"
echo ""

# Parse connection info (mask password)
DB_INFO=$(echo "$DATABASE_URL" | sed 's/:\/\/.*@/:\/\/***@/')
echo -e "Connecting to: ${BLUE}$DB_INFO${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql command not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "${GREEN}✓ psql found${NC}"
echo ""

# Test database connection
echo "Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check for required tables from previous migrations
REQUIRED_TABLES=("Users" "Graphs" "Nodes" "Edges" "Methodologies" "Evidence" "Challenges")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q 1; then
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Missing required tables from previous migrations:${NC}"
    for table in "${MISSING_TABLES[@]}"; do
        echo "  - $table"
    done
    echo ""
    echo "Please run migrations 001-006 before installing migration 007"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisite tables found${NC}"
echo ""

# Check if migration 007 is already installed
echo "Checking if migration 007 is already installed..."
if psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PromotionEligibility'" | grep -q 1; then
    echo -e "${YELLOW}WARNING: Migration 007 appears to be already installed${NC}"
    echo ""
    read -p "Do you want to reinstall? This will DROP existing tables (y/N): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi

    echo "Dropping existing tables..."
    psql "$DATABASE_URL" > /dev/null 2>&1 <<EOF
DROP TABLE IF EXISTS public."PromotionReviewAudits" CASCADE;
DROP TABLE IF EXISTS public."UserReputationMetrics" CASCADE;
DROP TABLE IF EXISTS public."PromotionHistory" CASCADE;
DROP TABLE IF EXISTS public."PromotionEligibility" CASCADE;
DROP TABLE IF EXISTS public."ConsensusVotes" CASCADE;
DROP TABLE IF EXISTS public."MethodologyCompletionTracking" CASCADE;
DROP TABLE IF EXISTS public."MethodologyWorkflowSteps" CASCADE;
DROP VIEW IF EXISTS public."PublicPromotionTransparency" CASCADE;
EOF
    echo -e "${GREEN}✓ Existing tables dropped${NC}"
    echo ""
fi

# Install migration
echo -e "${BLUE}Installing migration 007...${NC}"
echo ""

if psql "$DATABASE_URL" -f "$SCRIPT_DIR/007_process_validation.sql" > /tmp/migration_007_output.log 2>&1; then
    echo -e "${GREEN}✓ Migration 007 installed successfully${NC}"
    echo ""
else
    echo -e "${RED}ERROR: Migration installation failed${NC}"
    echo "Check /tmp/migration_007_output.log for details"
    cat /tmp/migration_007_output.log
    exit 1
fi

# Verify installation
echo "Verifying installation..."

EXPECTED_TABLES=(
    "MethodologyWorkflowSteps"
    "MethodologyCompletionTracking"
    "ConsensusVotes"
    "PromotionEligibility"
    "PromotionHistory"
    "UserReputationMetrics"
    "PromotionReviewAudits"
)

MISSING=()
for table in "${EXPECTED_TABLES[@]}"; do
    if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q 1; then
        MISSING+=("$table")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Some tables were not created:${NC}"
    for table in "${MISSING[@]}"; do
        echo "  - $table"
    done
    exit 1
fi

echo -e "${GREEN}✓ All tables created${NC}"

# Verify functions
echo "Verifying functions..."

EXPECTED_FUNCTIONS=(
    "calculate_methodology_completion_score"
    "calculate_consensus_score"
    "calculate_evidence_quality_score"
    "calculate_challenge_resolution_score"
    "calculate_promotion_eligibility"
    "auto_promote_graph"
    "calculate_vote_weight"
    "update_user_reputation"
)

MISSING_FUNCTIONS=()
for func in "${EXPECTED_FUNCTIONS[@]}"; do
    if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = '$func'" | grep -q 1; then
        MISSING_FUNCTIONS+=("$func")
    fi
done

if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Some functions were not created:${NC}"
    for func in "${MISSING_FUNCTIONS[@]}"; do
        echo "  - $func"
    done
    exit 1
fi

echo -e "${GREEN}✓ All functions created${NC}"

# Verify triggers
echo "Verifying triggers..."

EXPECTED_TRIGGERS=(
    "trigger_check_eligibility_on_vote"
    "trigger_check_eligibility_on_completion"
    "trigger_check_eligibility_on_challenge_update"
    "trigger_promote_on_eligible"
)

MISSING_TRIGGERS=()
for trigger in "${EXPECTED_TRIGGERS[@]}"; do
    if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name = '$trigger'" | grep -q 1; then
        MISSING_TRIGGERS+=("$trigger")
    fi
done

if [ ${#MISSING_TRIGGERS[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Some triggers were not created:${NC}"
    for trigger in "${MISSING_TRIGGERS[@]}"; do
        echo "  - $trigger"
    done
    exit 1
fi

echo -e "${GREEN}✓ All triggers created${NC}"

# Verify view
echo "Verifying views..."

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'PublicPromotionTransparency'" | grep -q 1; then
    echo -e "${RED}ERROR: PublicPromotionTransparency view was not created${NC}"
    exit 1
fi

echo -e "${GREEN}✓ View created${NC}"
echo ""

# Installation summary
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}  INSTALLATION SUCCESSFUL${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo "Migration 007: Egalitarian Process Validation System is now installed"
echo ""
echo "Components installed:"
echo "  ✓ 7 tables"
echo "  ✓ 8 functions"
echo "  ✓ 4 triggers"
echo "  ✓ 1 view"
echo "  ✓ Extensive indexes"
echo ""
echo -e "${BLUE}EGALITARIAN PRINCIPLES ENFORCED:${NC}"
echo "  ✓ NO role-based hierarchies"
echo "  ✓ NO curator gatekeeping"
echo "  ✓ Transparent objective scoring"
echo "  ✓ Community consensus-driven"
echo "  ✓ Automatic promotion when criteria met"
echo "  ✓ Full public audit trail"
echo ""

# Ask about running tests
echo -e "${YELLOW}Would you like to run the test suite? (y/N):${NC} "
read -r RUN_TESTS

if [[ $RUN_TESTS =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Running test suite...${NC}"
    echo ""

    if psql "$DATABASE_URL" -f "$SCRIPT_DIR/007_process_validation_test.sql" 2>&1 | tee /tmp/migration_007_test_output.log; then
        echo ""
        echo -e "${GREEN}✓ All tests completed${NC}"
        echo "Note: Tests run in a transaction and are rolled back (no data committed)"
    else
        echo ""
        echo -e "${YELLOW}WARNING: Some tests may have failed${NC}"
        echo "Check /tmp/migration_007_test_output.log for details"
    fi
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review the documentation:"
echo "     - 007_EGALITARIAN_SYSTEM_GUIDE.md (complete guide)"
echo "     - 007_ARCHITECTURE_DIAGRAM.txt (visual architecture)"
echo "     - 007_DELIVERABLES_SUMMARY.md (quick reference)"
echo ""
echo "  2. Integrate with your application:"
echo "     - Add GraphQL mutations for voting"
echo "     - Add API endpoints for eligibility checking"
echo "     - Add UI for promotion transparency"
echo ""
echo "  3. Monitor the system:"
echo "     - Query PromotionEligibility for status"
echo "     - View PublicPromotionTransparency for public data"
echo "     - Check PromotionReviewAudits for audit trail"
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
