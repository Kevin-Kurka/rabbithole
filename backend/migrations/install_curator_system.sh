#!/bin/bash

# ============================================================================
# Curator System Installation Script
# ============================================================================
# This script installs the Curator Roles & Permissions system (Phase 3)
# for Project Rabbit Hole.
#
# Usage: ./install_curator_system.sh
#
# Requirements:
# - PostgreSQL 12+ with uuid-ossp extension
# - Existing Project Rabbit Hole database
# - Migrations 001-005 already applied
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rabbithole}"
DB_USER="${DB_USER:-postgres}"
MIGRATION_FILE="006_curator_system.sql"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Curator System Installation - Project Rabbit Hole         ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi
    print_success "PostgreSQL client found"

    # Check if migration file exists
    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Migration file not found: $MIGRATION_FILE"
        print_info "Please run this script from the migrations directory"
        exit 1
    fi
    print_success "Migration file found"

    # Check database connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        print_error "Cannot connect to database"
        print_info "Host: $DB_HOST:$DB_PORT"
        print_info "Database: $DB_NAME"
        print_info "User: $DB_USER"
        exit 1
    fi
    print_success "Database connection verified"
}

check_existing_installation() {
    print_info "Checking for existing installation..."

    # Check if CuratorRoles table exists
    TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CuratorRoles');")

    if [ "$TABLE_EXISTS" = "t" ]; then
        print_warning "Curator system tables already exist"
        echo ""
        read -p "Do you want to reinstall (this will drop existing tables)? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled"
            exit 0
        fi
        return 1
    else
        print_success "No existing installation found"
        return 0
    fi
}

backup_database() {
    print_info "Creating database backup..."

    BACKUP_FILE="backup_before_curator_system_$(date +%Y%m%d_%H%M%S).sql"

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        print_success "Backup created: $BACKUP_FILE"
    else
        print_warning "Backup failed, but continuing..."
    fi
}

run_migration() {
    print_info "Running migration..."
    echo ""

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
        echo ""
        print_success "Migration completed successfully"
        return 0
    else
        echo ""
        print_error "Migration failed"
        return 1
    fi
}

verify_installation() {
    print_info "Verifying installation..."

    # Check tables
    print_info "Checking tables..."
    TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%urator%';")

    if [ "$TABLES" -ge 8 ]; then
        print_success "All tables created ($TABLES tables)"
    else
        print_error "Missing tables (found $TABLES, expected 8+)"
        return 1
    fi

    # Check functions
    print_info "Checking functions..."
    FUNCTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname LIKE '%curator%';")

    if [ "$FUNCTIONS" -ge 3 ]; then
        print_success "All functions created ($FUNCTIONS functions)"
    else
        print_error "Missing functions (found $FUNCTIONS, expected 3+)"
        return 1
    fi

    # Check seeded roles
    print_info "Checking seeded data..."
    ROLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM public.\"CuratorRoles\";")

    if [ "$ROLES" -eq 5 ]; then
        print_success "All curator roles seeded (5 roles)"
    else
        print_error "Missing roles (found $ROLES, expected 5)"
        return 1
    fi

    # Check permissions
    PERMISSIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM public.\"RolePermissions\";")

    if [ "$PERMISSIONS" -ge 15 ]; then
        print_success "Role permissions configured ($PERMISSIONS permissions)"
    else
        print_error "Missing permissions (found $PERMISSIONS, expected 15+)"
        return 1
    fi

    # Check views
    VIEWS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%urator%';")

    if [ "$VIEWS" -eq 3 ]; then
        print_success "All views created (3 views)"
    else
        print_error "Missing views (found $VIEWS, expected 3)"
        return 1
    fi

    return 0
}

display_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Installation Complete!                                      ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo "  • 8 tables created"
    echo "  • 3 helper functions added"
    echo "  • 5 curator roles seeded"
    echo "  • 15+ role permissions configured"
    echo "  • 3 convenience views created"
    echo ""
    echo -e "${BLUE}Curator Roles:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT role_name as \"Role\", display_name as \"Display Name\", tier as \"Tier\", min_reputation_required as \"Min Rep\" FROM public.\"CuratorRoles\" ORDER BY tier, role_name;"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Update your Apollo Server to include new resolvers"
    echo "  2. Review the documentation:"
    echo "     - 006_CURATOR_SYSTEM_GUIDE.md (implementation guide)"
    echo "     - 006_API_EXAMPLES.md (GraphQL examples)"
    echo "     - 006_README.md (complete overview)"
    echo "  3. Test the system with sample queries"
    echo "  4. Configure curator role assignments"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "  • Backup created: ${BACKUP_FILE}"
    echo "  • Review security settings before production use"
    echo "  • Set up monitoring for curator actions"
    echo ""
}

test_installation() {
    print_info "Running basic tests..."

    # Test permission check function
    print_info "Testing permission check function..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT public.check_curator_permission(
            '00000000-0000-0000-0000-000000000000'::uuid,
            'level_0_content',
            'node',
            'read'
        ) as has_permission;" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        print_success "Permission check function working"
    else
        print_warning "Permission check function test failed"
    fi

    # Test queries
    print_info "Testing sample queries..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM public.\"ActiveCuratorsView\";" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        print_success "Sample queries working"
    else
        print_warning "Sample query test failed"
    fi
}

# ============================================================================
# Main Installation Process
# ============================================================================

main() {
    print_header

    # Step 1: Prerequisites
    check_prerequisites
    echo ""

    # Step 2: Check existing installation
    check_existing_installation
    REINSTALL=$?
    echo ""

    # Step 3: Backup
    backup_database
    echo ""

    # Step 4: Run migration
    if ! run_migration; then
        print_error "Installation failed during migration"
        print_info "Check the error messages above"
        exit 1
    fi
    echo ""

    # Step 5: Verify
    if ! verify_installation; then
        print_error "Installation verification failed"
        print_info "Some components may not have been installed correctly"
        exit 1
    fi
    echo ""

    # Step 6: Test
    test_installation
    echo ""

    # Step 7: Display summary
    display_summary
}

# ============================================================================
# Script Entry Point
# ============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
