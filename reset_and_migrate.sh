#!/bin/bash

# ============================================================================
# Database Reset and Migration Script
# ============================================================================
# This script drops and recreates the database, then applies all migrations
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

CONTAINER_NAME="rabbithole-postgres-1"
DB_NAME="rabbithole_db"
DB_USER="postgres"

log_warning "This will DROP and RECREATE the database!"
log_info "Press Ctrl+C to cancel, or wait 5 seconds..."
sleep 5

log_info "Dropping existing database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1

log_info "Creating fresh database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1

log_success "Database reset complete"

log_info "Applying migrations..."
cd /Users/kmk/rabbithole
./apply_migrations.sh

log_success "All done!"
