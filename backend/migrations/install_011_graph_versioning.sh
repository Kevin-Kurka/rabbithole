#!/bin/bash

# Installation script for Graph Versioning and Forking System (Migration 011)
# Project Rabbit Hole - Graph Version Control

set -e  # Exit on error

echo "======================================"
echo "Graph Versioning System Installation"
echo "Migration 011: Graph Fork & Version History"
echo "======================================"
echo ""

# Configuration
DB_CONTAINER="rabbithole-postgres-1"
DB_USER="postgres"
DB_NAME="rabbithole_db"
MIGRATION_FILE="011_graph_versioning.sql"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Docker container is running
echo "Step 1: Checking database container..."
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "❌ Error: Database container '$DB_CONTAINER' is not running"
    echo "   Please start it with: docker-compose up -d postgres"
    exit 1
fi
echo "✅ Database container is running"
echo ""

# Check if migration file exists
echo "Step 2: Verifying migration file..."
if [ ! -f "$SCRIPT_DIR/$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $SCRIPT_DIR/$MIGRATION_FILE"
    exit 1
fi
echo "✅ Migration file found"
echo ""

# Backup current database
echo "Step 3: Creating database backup..."
BACKUP_FILE="/tmp/rabbithole_backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
    echo "⚠️  Warning: Could not create backup, but continuing..."
}
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  No backup created"
fi
echo ""

# Check if migration already applied
echo "Step 4: Checking if migration already applied..."
TABLE_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'GraphVersions');" | xargs)

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "⚠️  Warning: GraphVersions table already exists"
    read -p "   Do you want to continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
fi
echo ""

# Apply migration
echo "Step 5: Applying migration..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SCRIPT_DIR/$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
else
    echo "❌ Migration failed"
    echo "   Restore from backup: $BACKUP_FILE"
    exit 1
fi
echo ""

# Verify installation
echo "Step 6: Verifying installation..."

# Check table
TABLE_CHECK=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'GraphVersions';" | xargs)

# Check columns
PARENT_COLUMN=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Graphs' AND column_name = 'parent_graph_id';" | xargs)

# Check functions
FUNCTIONS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('create_graph_version_snapshot', 'get_graph_version_history', 'get_graph_forks', 'get_graph_ancestry');" | xargs)

# Check trigger
TRIGGER=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_graph_version_snapshot';" | xargs)

echo "Verification results:"
echo "  - GraphVersions table: $([ "$TABLE_CHECK" -eq 1 ] && echo '✅' || echo '❌')"
echo "  - parent_graph_id column: $([ "$PARENT_COLUMN" -eq 1 ] && echo '✅' || echo '❌')"
echo "  - Database functions: $([ "$FUNCTIONS" -eq 4 ] && echo "✅ ($FUNCTIONS/4)" || echo "⚠️  ($FUNCTIONS/4)")"
echo "  - Auto-snapshot trigger: $([ "$TRIGGER" -eq 1 ] && echo '✅' || echo '❌')"
echo ""

# Final status
if [ "$TABLE_CHECK" -eq 1 ] && [ "$PARENT_COLUMN" -eq 1 ] && [ "$FUNCTIONS" -eq 4 ] && [ "$TRIGGER" -eq 1 ]; then
    echo "======================================"
    echo "✅ Installation completed successfully!"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "  1. Rebuild backend: cd backend && npm run build"
    echo "  2. Restart API: docker-compose restart api"
    echo "  3. Test GraphQL playground: http://localhost:4000/graphql"
    echo ""
    echo "Sample GraphQL query to test:"
    echo "  query {"
    echo "    graphVersionHistory(graphId: \"YOUR_GRAPH_ID\") {"
    echo "      version_number"
    echo "      created_at"
    echo "    }"
    echo "  }"
    echo ""
    echo "See 011_IMPLEMENTATION_SUMMARY.md for full API documentation"
else
    echo "======================================"
    echo "⚠️  Installation completed with warnings"
    echo "======================================"
    echo ""
    echo "Some components may not have been installed correctly."
    echo "Check the verification results above."
fi

# Show table structure
echo ""
echo "GraphVersions table structure:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\d public.\"GraphVersions\""

echo ""
echo "Updated Graphs table structure (showing new columns):"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\d public.\"Graphs\"" | grep -E "(parent_graph_id|fork_metadata)"

echo ""
echo "Installation complete!"
