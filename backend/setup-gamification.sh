#!/bin/bash
#
# Gamification System Setup Script
#
# This script sets up the gamification system by:
# 1. Running the database migration
# 2. Seeding achievement definitions
# 3. Verifying the installation
#

set -e

echo "🎮 Gamification System Setup"
echo "=============================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        echo "📝 Loading DATABASE_URL from .env file..."
        export $(grep DATABASE_URL .env | xargs)
    else
        echo "❌ DATABASE_URL not set and .env file not found"
        echo "   Please set DATABASE_URL environment variable or create .env file"
        exit 1
    fi
fi

echo "✅ Database URL: ${DATABASE_URL//:*@/:****@}"
echo ""

# Step 1: Run migration
echo "📦 Step 1: Running database migration..."
psql "$DATABASE_URL" -f migrations/007_gamification_system.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""

# Step 2: Seed achievements
echo "🌱 Step 2: Seeding achievement definitions..."
npm run seed:achievements

if [ $? -eq 0 ]; then
    echo "✅ Achievements seeded successfully"
else
    echo "❌ Seeding failed"
    exit 1
fi

echo ""

# Step 3: Verify installation
echo "🔍 Step 3: Verifying installation..."

# Count achievements
ACHIEVEMENT_COUNT=$(psql "$DATABASE_URL" -t -c 'SELECT COUNT(*) FROM public."Achievements";' | xargs)
echo "   - Achievements in database: $ACHIEVEMENT_COUNT"

if [ "$ACHIEVEMENT_COUNT" -eq 10 ]; then
    echo "   ✅ All 10 achievements loaded"
else
    echo "   ⚠️  Expected 10 achievements, found $ACHIEVEMENT_COUNT"
fi

# Check if tables exist
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Achievements', 'UserAchievements', 'UserReputation');")
echo "   - Gamification tables created: $TABLES/3"

if [ "$TABLES" -eq 3 ]; then
    echo "   ✅ All tables created"
else
    echo "   ⚠️  Some tables missing"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the server: npm start"
echo "  2. Run tests: node test-gamification.js"
echo "  3. See GAMIFICATION_SYSTEM.md for usage examples"
echo ""
