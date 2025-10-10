#!/bin/bash

################################################################################
# Veracity System Installation Script
################################################################################
# This script installs and tests the Veracity Score System
# Usage: ./install_veracity_system.sh [options]
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rabbithole_db}"
DB_USER="${DB_USER:-user}"
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}"
    echo "================================================================================"
    echo "  $1"
    echo "================================================================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 [options]

Options:
    -h, --help              Show this help message
    -H, --host HOST         Database host (default: localhost)
    -p, --port PORT         Database port (default: 5432)
    -d, --database DB       Database name (default: rabbithole_db)
    -u, --user USER         Database user (default: user)
    -t, --skip-tests        Skip running test suite
    -b, --skip-backup       Skip database backup
    -n, --dry-run           Show what would be done without doing it

Examples:
    # Install with defaults
    $0

    # Install on remote database
    $0 --host db.example.com --database prod_db --user admin

    # Install without tests
    $0 --skip-tests

    # Dry run to see what would happen
    $0 --dry-run

Environment Variables:
    DB_HOST                 Database host
    DB_PORT                 Database port
    DB_NAME                 Database name
    DB_USER                 Database user
    PGPASSWORD              Database password (use this instead of -W)

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -H|--host)
                DB_HOST="$2"
                shift 2
                ;;
            -p|--port)
                DB_PORT="$2"
                shift 2
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            -u|--user)
                DB_USER="$2"
                shift 2
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -b|--skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        print_error "psql is not installed. Please install PostgreSQL client."
        exit 1
    fi
    print_success "psql found: $(psql --version)"

    # Check if migration file exists
    if [[ ! -f "$SCRIPT_DIR/003_veracity_system.sql" ]]; then
        print_error "Migration file not found: 003_veracity_system.sql"
        exit 1
    fi
    print_success "Migration file found"

    # Check if test file exists (if tests not skipped)
    if [[ "$SKIP_TESTS" == false ]] && [[ ! -f "$SCRIPT_DIR/003_veracity_system_test.sql" ]]; then
        print_warning "Test file not found: 003_veracity_system_test.sql (tests will be skipped)"
        SKIP_TESTS=true
    elif [[ "$SKIP_TESTS" == false ]]; then
        print_success "Test file found"
    fi

    echo ""
}

# Test database connection
test_connection() {
    print_header "Testing Database Connection"

    print_info "Connecting to: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        print_info "Make sure:"
        print_info "  1. Database is running"
        print_info "  2. Credentials are correct"
        print_info "  3. PGPASSWORD environment variable is set"
        exit 1
    fi

    echo ""
}

# Backup database
backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        print_warning "Skipping database backup (--skip-backup flag)"
        return
    fi

    print_header "Creating Database Backup"

    BACKUP_FILE="$SCRIPT_DIR/backup_before_veracity_$(date +%Y%m%d_%H%M%S).sql"

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would create backup: $BACKUP_FILE"
    else
        print_info "Creating backup: $BACKUP_FILE"
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"; then
            print_success "Backup created successfully"
            print_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
        else
            print_error "Backup failed"
            read -p "Continue without backup? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    echo ""
}

# Check existing objects
check_existing() {
    print_header "Checking for Existing Objects"

    # Check if tables already exist
    EXISTING_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name IN ('Sources', 'Evidence', 'VeracityScores');" | tr -d ' ')

    if [[ "$EXISTING_TABLES" -gt 0 ]]; then
        print_warning "Some veracity system tables already exist ($EXISTING_TABLES tables)"
        if [[ "$DRY_RUN" == false ]]; then
            read -p "Continue and potentially overwrite? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        print_success "No existing veracity system tables found"
    fi

    echo ""
}

# Apply migration
apply_migration() {
    print_header "Applying Migration"

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would execute: $SCRIPT_DIR/003_veracity_system.sql"
    else
        print_info "Executing migration..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$SCRIPT_DIR/003_veracity_system.sql" > /tmp/migration_output.log 2>&1; then
            print_success "Migration applied successfully"
        else
            print_error "Migration failed"
            print_info "Check log: /tmp/migration_output.log"
            cat /tmp/migration_output.log
            exit 1
        fi
    fi

    echo ""
}

# Verify installation
verify_installation() {
    print_header "Verifying Installation"

    # Check tables
    print_info "Checking tables..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name IN ('Sources', 'SourceCredibility', 'Evidence',
                           'VeracityScores', 'VeracityScoreHistory',
                           'EvidenceVotes', 'ConsensusSnapshots');" | tr -d ' ')

    if [[ "$TABLE_COUNT" -eq 7 ]]; then
        print_success "All 7 tables created"
    else
        print_error "Expected 7 tables, found $TABLE_COUNT"
    fi

    # Check functions
    print_info "Checking functions..."
    FUNCTION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.routines
         WHERE routine_schema = 'public'
         AND routine_name IN ('calculate_veracity_score', 'calculate_evidence_weight',
                             'calculate_consensus_score', 'calculate_challenge_impact',
                             'refresh_veracity_score', 'update_source_credibility');" | tr -d ' ')

    if [[ "$FUNCTION_COUNT" -ge 6 ]]; then
        print_success "All functions created ($FUNCTION_COUNT found)"
    else
        print_error "Expected at least 6 functions, found $FUNCTION_COUNT"
    fi

    # Check triggers
    print_info "Checking triggers..."
    TRIGGER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.triggers
         WHERE trigger_schema = 'public'
         AND event_object_table IN ('Evidence', 'Challenges', 'Sources',
                                    'SourceCredibility', 'VeracityScores', 'EvidenceVotes');" | tr -d ' ')

    if [[ "$TRIGGER_COUNT" -ge 6 ]]; then
        print_success "All triggers created ($TRIGGER_COUNT found)"
    else
        print_warning "Expected at least 6 triggers, found $TRIGGER_COUNT"
    fi

    # Check indexes
    print_info "Checking indexes..."
    INDEX_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM pg_indexes
         WHERE schemaname = 'public'
         AND tablename IN ('Sources', 'Evidence', 'VeracityScores',
                          'VeracityScoreHistory', 'EvidenceVotes', 'ConsensusSnapshots')
         AND indexname LIKE 'idx_%';" | tr -d ' ')

    if [[ "$INDEX_COUNT" -ge 20 ]]; then
        print_success "All indexes created ($INDEX_COUNT found)"
    else
        print_warning "Expected at least 20 indexes, found $INDEX_COUNT"
    fi

    # Check views
    print_info "Checking views..."
    VIEW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.views
         WHERE table_schema = 'public'
         AND table_name IN ('VeracityScoresSummary', 'EvidenceSummary');" | tr -d ' ')

    if [[ "$VIEW_COUNT" -eq 2 ]]; then
        print_success "All 2 views created"
    else
        print_error "Expected 2 views, found $VIEW_COUNT"
    fi

    echo ""
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests (--skip-tests flag)"
        return
    fi

    print_header "Running Test Suite"

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would execute: $SCRIPT_DIR/003_veracity_system_test.sql"
    else
        print_info "Running tests..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$SCRIPT_DIR/003_veracity_system_test.sql" > /tmp/test_output.log 2>&1; then

            # Count passed and failed tests
            PASSED=$(grep -c "✓" /tmp/test_output.log || true)
            FAILED=$(grep -c "✗" /tmp/test_output.log || true)

            echo ""
            if [[ "$FAILED" -eq 0 ]]; then
                print_success "All tests passed ($PASSED tests)"
            else
                print_warning "$PASSED tests passed, $FAILED tests failed"
            fi

            # Show test output
            echo ""
            cat /tmp/test_output.log
        else
            print_error "Test suite failed to run"
            cat /tmp/test_output.log
        fi
    fi

    echo ""
}

# Print summary
print_summary() {
    print_header "Installation Summary"

    echo "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo "Installed Components:"
    echo "  • 7 Tables"
    echo "  • 7 Functions"
    echo "  • 6+ Triggers"
    echo "  • 20+ Indexes"
    echo "  • 2 Views"
    echo ""
    echo "Documentation:"
    echo "  • Quick Start:       $SCRIPT_DIR/QUICKSTART_VERACITY.md"
    echo "  • Full Guide:        $SCRIPT_DIR/003_veracity_system_guide.md"
    echo "  • ER Diagram:        $SCRIPT_DIR/003_veracity_system_diagram.txt"
    echo "  • Deliverables:      $SCRIPT_DIR/DELIVERABLES_SUMMARY.md"
    echo ""

    if [[ ! "$SKIP_BACKUP" == true ]] && [[ ! "$DRY_RUN" == true ]]; then
        echo "Backup:"
        echo "  • Location: $BACKUP_FILE"
        echo ""
    fi

    echo "Next Steps:"
    echo "  1. Review the quick start guide"
    echo "  2. Integrate with your GraphQL resolvers"
    echo "  3. Set up monitoring for key metrics"
    echo "  4. Configure maintenance tasks"
    echo ""

    print_success "Installation complete!"
}

################################################################################
# Main
################################################################################

main() {
    # Parse arguments
    parse_args "$@"

    # Show banner
    print_header "Veracity Score System Installation"
    echo "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    echo ""

    # Run installation steps
    check_prerequisites
    test_connection

    if [[ "$DRY_RUN" == false ]]; then
        backup_database
    fi

    check_existing
    apply_migration

    if [[ "$DRY_RUN" == false ]]; then
        verify_installation
        run_tests
    fi

    print_summary
}

# Run main
main "$@"
