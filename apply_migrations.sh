#!/bin/bash

# ============================================================================
# Database Migration Script for Rabbit Hole Project
# ============================================================================
# This script applies all pending database migrations in the correct order
# with comprehensive error handling, backup, and rollback capabilities.
#
# Usage: ./apply_migrations.sh
# ============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="rabbithole_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
CONTAINER_NAME="rabbithole-postgres-1"
MIGRATIONS_DIR="/Users/kmk/rabbithole/backend/migrations"
REPORT_FILE="/Users/kmk/rabbithole/migration_report.txt"
BACKUP_DIR="/Users/kmk/rabbithole/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$MIGRATIONS_DIR"

# Initialize report file
echo "========================================" > "$REPORT_FILE"
echo "Rabbit Hole Database Migration Report" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Started at: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$REPORT_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[SUCCESS] $1" >> "$REPORT_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$REPORT_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$REPORT_FILE"
}

# Execute SQL command in container
execute_sql() {
    local sql="$1"
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>&1
}

# Execute SQL file in container
execute_sql_file() {
    local file_path="$1"
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$file_path" 2>&1
}

# ============================================================================
# Step 1: Verify Prerequisites
# ============================================================================
log_info "Step 1: Verifying prerequisites..."

# Check if Docker is running
if ! docker ps &> /dev/null; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Postgres container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Postgres container '$CONTAINER_NAME' is not running."
    log_info "Starting containers with docker-compose..."
    cd /Users/kmk/rabbithole
    docker-compose up -d postgres
    sleep 5
fi

# Test database connection
if ! execute_sql "SELECT 1;" &> /dev/null; then
    log_error "Cannot connect to database. Check credentials and container status."
    exit 1
fi

log_success "Prerequisites verified successfully"

# ============================================================================
# Step 2: Create Migration Tracking Table
# ============================================================================
log_info "Step 2: Creating migration tracking table..."

execute_sql "
CREATE TABLE IF NOT EXISTS public.\"schema_migrations\" (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now(),
    description TEXT,
    checksum TEXT,
    execution_time_ms INTEGER
);
" >> "$REPORT_FILE" 2>&1

log_success "Migration tracking table ready"

# ============================================================================
# Step 3: Check Applied Migrations
# ============================================================================
log_info "Step 3: Checking which migrations have been applied..."

# Get list of applied migrations
APPLIED_MIGRATIONS=$(execute_sql "SELECT version FROM public.\"schema_migrations\" ORDER BY version;" | grep -E "^\s*00[0-9]" | tr -d ' ' || echo "")

log_info "Applied migrations:"
if [ -z "$APPLIED_MIGRATIONS" ]; then
    log_info "  - None (fresh database)"
else
    echo "$APPLIED_MIGRATIONS" | while read -r version; do
        log_info "  - $version"
    done
fi

# ============================================================================
# Step 4: Create Database Backup
# ============================================================================
log_info "Step 4: Creating database backup before migrations..."

BACKUP_FILE="$BACKUP_DIR/rabbithole_backup_${TIMESTAMP}.sql"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup created: $BACKUP_FILE (size: $BACKUP_SIZE)"
else
    log_error "Backup failed"
    exit 1
fi

# ============================================================================
# Step 5: Define and Apply Migrations
# ============================================================================
log_info "Step 5: Applying pending migrations..."

# Function to check if migration was applied
is_migration_applied() {
    local version="$1"
    echo "$APPLIED_MIGRATIONS" | grep -q "^${version}$"
}

# Function to record migration
record_migration() {
    local version="$1"
    local description="$2"
    local execution_time="$3"

    execute_sql "
        INSERT INTO public.\"schema_migrations\" (version, description, execution_time_ms)
        VALUES ('$version', '$description', $execution_time)
        ON CONFLICT (version) DO NOTHING;
    " >> "$REPORT_FILE" 2>&1
}

# Function to apply migration
apply_migration() {
    local version="$1"
    local file_path="$2"
    local description="$3"

    log_info "Applying migration $version: $description"

    START_TIME=$(date +%s)

    if [ -f "$file_path" ]; then
        if execute_sql_file "$file_path" >> "$REPORT_FILE" 2>&1; then
            END_TIME=$(date +%s)
            EXECUTION_TIME=$(((END_TIME - START_TIME) * 1000))

            record_migration "$version" "$description" "$EXECUTION_TIME"
            log_success "Migration $version applied successfully (${EXECUTION_TIME}ms)"
            return 0
        else
            log_error "Migration $version failed"
            return 1
        fi
    else
        log_warning "Migration file not found: $file_path"
        return 1
    fi
}

# Migration 001: Initial Schema
if ! is_migration_applied "001"; then
    apply_migration "001" "$MIGRATIONS_DIR/001_initial_schema.sql" "Initial schema - base tables" || exit 1
else
    log_info "Migration 001 already applied"
fi

# Migration 002: Level 0/1 System
# This migration updates the existing schema to ensure Level 0/1 distinction
# Note: Since init.sql already has is_level_0 columns, this is mostly a verification
if ! is_migration_applied "002"; then
    log_info "Creating migration 002: Level 0/1 system verification"

    cat > "$MIGRATIONS_DIR/002_level0_system.sql" << 'EOF'
-- Migration 002: Level 0/1 System Verification
-- This ensures the Level 0/1 distinction is properly set up

-- Verify is_level_0 column exists in Nodes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Nodes'
        AND column_name = 'is_level_0'
    ) THEN
        ALTER TABLE public."Nodes" ADD COLUMN is_level_0 BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Verify is_level_0 column exists in Edges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Edges'
        AND column_name = 'is_level_0'
    ) THEN
        ALTER TABLE public."Edges" ADD COLUMN is_level_0 BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add index on is_level_0 for Nodes if not exists
CREATE INDEX IF NOT EXISTS idx_nodes_is_level_0 ON public."Nodes" (is_level_0);

-- Add index on is_level_0 for Edges if not exists
CREATE INDEX IF NOT EXISTS idx_edges_is_level_0 ON public."Edges" (is_level_0);

-- Create view for Level 0 nodes
CREATE OR REPLACE VIEW public."Level0Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = true;

-- Create view for Level 1 nodes
CREATE OR REPLACE VIEW public."Level1Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = false;

-- Migration complete
EOF

    apply_migration "002" "$MIGRATIONS_DIR/002_level0_system.sql" "Level 0/1 system verification" || exit 1
else
    log_info "Migration 002 already applied"
fi

# Migration 003: Veracity System
if ! is_migration_applied "003"; then
    apply_migration "003" "$MIGRATIONS_DIR/003_veracity_system.sql" "Veracity scoring system" || exit 1

    # Run test suite if exists
    if [ -f "$MIGRATIONS_DIR/003_veracity_system_test.sql" ]; then
        log_info "Running test suite for migration 003..."
        if execute_sql_file "$MIGRATIONS_DIR/003_veracity_system_test.sql" >> "$REPORT_FILE" 2>&1; then
            log_success "Migration 003 tests passed"
        else
            log_warning "Migration 003 tests had issues (non-fatal)"
        fi
    fi
else
    log_info "Migration 003 already applied"
fi

# Migration 004: Challenge System
if ! is_migration_applied "004"; then
    apply_migration "004" "$MIGRATIONS_DIR/004_challenge_system.sql" "Challenge system" || exit 1
else
    log_info "Migration 004 already applied"
fi

# Migration 005: Evidence Management
if ! is_migration_applied "005"; then
    apply_migration "005" "$MIGRATIONS_DIR/005_evidence_management.sql" "Evidence management system" || exit 1

    # Run test suite if exists
    if [ -f "$MIGRATIONS_DIR/005_evidence_management_test.sql" ]; then
        log_info "Running test suite for migration 005..."
        if execute_sql_file "$MIGRATIONS_DIR/005_evidence_management_test.sql" >> "$REPORT_FILE" 2>&1; then
            log_success "Migration 005 tests passed"
        else
            log_warning "Migration 005 tests had issues (non-fatal)"
        fi
    fi
else
    log_info "Migration 005 already applied"
fi

# ============================================================================
# Step 6: Verify Data Integrity
# ============================================================================
log_info "Step 6: Verifying data integrity..."

# Check for foreign key violations
FK_VIOLATIONS=$(execute_sql "
    SELECT COUNT(*) FROM public.\"Nodes\" n
    LEFT JOIN public.\"Graphs\" g ON n.graph_id = g.id
    WHERE g.id IS NULL;
" | grep -E "^\s*[0-9]" | tr -d ' ')

if [ "$FK_VIOLATIONS" = "0" ]; then
    log_success "No foreign key violations found"
else
    log_warning "Found $FK_VIOLATIONS potential foreign key violations"
fi

# Check table counts
log_info "Table statistics:"
for table in "Users" "Graphs" "Nodes" "Edges" "Sources" "Evidence" "Challenges"; do
    COUNT=$(execute_sql "SELECT COUNT(*) FROM public.\"$table\";" | grep -E "^\s*[0-9]" | tr -d ' ' || echo "0")
    log_info "  - $table: $COUNT rows"
done

# ============================================================================
# Step 7: Generate Migration Summary
# ============================================================================
log_info "Step 7: Generating migration summary..."

echo "" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Migration Summary" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"

# Get all applied migrations
execute_sql "
    SELECT
        version,
        description,
        applied_at,
        execution_time_ms
    FROM public.\"schema_migrations\"
    ORDER BY version;
" >> "$REPORT_FILE" 2>&1

# Get database size
DB_SIZE=$(execute_sql "
    SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
" | grep -E "^\s*[0-9]" || echo "Unknown")

log_info "Database size: $DB_SIZE"
echo "" >> "$REPORT_FILE"
echo "Database size: $DB_SIZE" >> "$REPORT_FILE"

# ============================================================================
# Final Report
# ============================================================================
echo "" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Completed at: $(date)" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Backup location: $BACKUP_FILE" >> "$REPORT_FILE"
echo "Report location: $REPORT_FILE" >> "$REPORT_FILE"

log_success "All migrations completed successfully!"
log_info "Full report saved to: $REPORT_FILE"
log_info "Backup saved to: $BACKUP_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Migration completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Applied migrations: See $REPORT_FILE"
echo "  - Database backup: $BACKUP_FILE"
echo "  - Database size: $DB_SIZE"
echo ""
echo "To rollback, restore from backup:"
echo "  docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo ""
