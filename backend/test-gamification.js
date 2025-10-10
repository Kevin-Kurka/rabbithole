#!/usr/bin/env node
/**
 * Gamification System Test Script
 *
 * Tests all gamification features including:
 * - Achievement queries
 * - User stats
 * - Leaderboard
 * - Point awarding
 * - Achievement checking
 */

const axios = require('axios');

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';

// Color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function query(queryString, variables = {}) {
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: queryString,
      variables,
    });

    if (response.data.errors) {
      logError('GraphQL Error:');
      console.error(JSON.stringify(response.data.errors, null, 2));
      return null;
    }

    return response.data.data;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return null;
  }
}

// Test: Get all achievements
async function testGetAllAchievements() {
  logSection('Test: Get All Achievements');

  const result = await query(`
    query {
      allAchievements {
        id
        key
        name
        description
        icon
        category
        points
        criteria
      }
    }
  `);

  if (result && result.allAchievements) {
    logSuccess(`Found ${result.allAchievements.length} achievements`);

    // Group by category
    const byCategory = result.allAchievements.reduce((acc, ach) => {
      if (!acc[ach.category]) acc[ach.category] = [];
      acc[ach.category].push(ach);
      return acc;
    }, {});

    Object.entries(byCategory).forEach(([category, achievements]) => {
      logInfo(`\n${category.toUpperCase()}: ${achievements.length} achievements`);
      achievements.forEach(ach => {
        console.log(`  ${ach.icon} ${ach.name} - ${ach.points} points`);
        console.log(`     ${ach.description}`);
      });
    });

    return true;
  }

  logError('Failed to fetch achievements');
  return false;
}

// Test: Get user's achievements
async function testGetMyAchievements() {
  logSection('Test: Get My Achievements');

  const result = await query(`
    query {
      myAchievements {
        id
        earnedAt
        progress
        achievement {
          key
          name
          icon
          points
          category
        }
      }
    }
  `);

  if (result && result.myAchievements) {
    if (result.myAchievements.length === 0) {
      logInfo('No achievements earned yet');
    } else {
      logSuccess(`You have earned ${result.myAchievements.length} achievements`);
      result.myAchievements.forEach(ua => {
        console.log(`  ${ua.achievement.icon} ${ua.achievement.name} (${ua.achievement.points} points)`);
        console.log(`     Earned: ${new Date(ua.earnedAt).toLocaleString()}`);
      });
    }
    return true;
  }

  logError('Failed to fetch user achievements');
  return false;
}

// Test: Get user stats
async function testGetUserStats(userId = null) {
  logSection('Test: Get User Stats');

  const result = await query(`
    query UserStats($userId: String) {
      userStats(userId: $userId) {
        totalPoints
        level
        categoryBreakdown
        achievements {
          achievement {
            name
            icon
            points
          }
        }
      }
    }
  `, { userId });

  if (result && result.userStats) {
    logSuccess('User Stats:');
    console.log(`  Total Points: ${result.userStats.totalPoints}`);
    console.log(`  Level: ${result.userStats.level}`);
    console.log(`\n  Category Breakdown:`);
    Object.entries(result.userStats.categoryBreakdown).forEach(([cat, points]) => {
      console.log(`    ${cat}: ${points} points`);
    });
    console.log(`\n  Achievements Earned: ${result.userStats.achievements.length}`);
    return true;
  }

  logError('Failed to fetch user stats');
  return false;
}

// Test: Get leaderboard
async function testGetLeaderboard(category = null, limit = 10) {
  logSection(`Test: Get Leaderboard${category ? ` (${category})` : ''}`);

  const result = await query(`
    query Leaderboard($category: String, $limit: Int) {
      leaderboard(category: $category, limit: $limit) {
        rank
        user {
          username
          email
        }
        totalPoints
        level
        evidencePoints
        methodologyPoints
        consensusPoints
        collaborationPoints
      }
    }
  `, { category, limit });

  if (result && result.leaderboard) {
    logSuccess(`Leaderboard (Top ${result.leaderboard.length}):`);

    console.log(`\n  ${'#'.padEnd(5)}${'Username'.padEnd(20)}${'Level'.padEnd(8)}${'Points'.padEnd(10)}${'E'.padEnd(6)}${'M'.padEnd(6)}${'C'.padEnd(6)}${'Co'.padEnd(6)}`);
    console.log('  ' + '-'.repeat(70));

    result.leaderboard.forEach(entry => {
      const rank = `#${entry.rank}`.padEnd(5);
      const username = entry.user.username.substring(0, 18).padEnd(20);
      const level = `L${entry.level}`.padEnd(8);
      const points = entry.totalPoints.toString().padEnd(10);
      const e = entry.evidencePoints.toString().padEnd(6);
      const m = entry.methodologyPoints.toString().padEnd(6);
      const c = entry.consensusPoints.toString().padEnd(6);
      const co = entry.collaborationPoints.toString().padEnd(6);

      console.log(`  ${rank}${username}${level}${points}${e}${m}${c}${co}`);
    });

    return true;
  }

  logError('Failed to fetch leaderboard');
  return false;
}

// Test: Award points
async function testAwardPoints(userId, points, category) {
  logSection('Test: Award Points');

  logInfo(`Awarding ${points} ${category} points to user ${userId}`);

  const result = await query(`
    mutation AwardPoints($userId: String!, $points: Int!, $category: String!) {
      awardPoints(userId: $userId, points: $points, category: $category)
    }
  `, { userId, points, category });

  if (result && result.awardPoints) {
    logSuccess('Points awarded successfully!');
    return true;
  }

  logError('Failed to award points');
  return false;
}

// Test: Check achievements
async function testCheckAchievements() {
  logSection('Test: Check Achievements');

  const result = await query(`
    mutation {
      checkMyAchievements {
        id
        key
        name
        icon
        points
      }
    }
  `);

  if (result && result.checkMyAchievements) {
    if (result.checkMyAchievements.length === 0) {
      logInfo('No new achievements unlocked');
    } else {
      logSuccess(`🎉 Unlocked ${result.checkMyAchievements.length} new achievement(s)!`);
      result.checkMyAchievements.forEach(ach => {
        console.log(`  ${ach.icon} ${ach.name} (+${ach.points} points)`);
      });
    }
    return true;
  }

  logError('Failed to check achievements');
  return false;
}

// Test: Get achievement progress
async function testGetAchievementProgress(achievementKey, userId = null) {
  logSection(`Test: Get Achievement Progress (${achievementKey})`);

  const result = await query(`
    query AchievementProgress($achievementKey: String!, $userId: String) {
      achievementProgress(achievementKey: $achievementKey, userId: $userId)
    }
  `, { achievementKey, userId });

  if (result !== null && result.achievementProgress !== undefined) {
    const percentage = (result.achievementProgress * 100).toFixed(1);
    logSuccess(`Progress: ${percentage}%`);

    // Progress bar
    const barLength = 30;
    const filled = Math.round(result.achievementProgress * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`  [${bar}] ${percentage}%`);

    return true;
  }

  logError('Failed to fetch achievement progress');
  return false;
}

// Get first user ID for testing
async function getFirstUserId() {
  const result = await query(`
    query {
      userStats {
        totalPoints
      }
    }
  `);

  if (result) {
    return 'current-user'; // Using current user from context
  }

  return null;
}

// Main test runner
async function runTests() {
  log('\n🎮 GAMIFICATION SYSTEM TEST SUITE', 'cyan');
  log('Testing endpoint: ' + GRAPHQL_ENDPOINT, 'yellow');

  const results = {
    passed: 0,
    failed: 0,
  };

  const tests = [
    { name: 'Get All Achievements', fn: testGetAllAchievements },
    { name: 'Get My Achievements', fn: testGetMyAchievements },
    { name: 'Get User Stats', fn: testGetUserStats },
    { name: 'Get Leaderboard (All)', fn: () => testGetLeaderboard(null, 10) },
    { name: 'Get Leaderboard (Evidence)', fn: () => testGetLeaderboard('evidence', 5) },
    { name: 'Check Achievements', fn: testCheckAchievements },
    { name: 'Get Achievement Progress', fn: () => testGetAchievementProgress('evidence_expert') },
  ];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.failed++;
    }
  }

  // Summary
  logSection('Test Summary');
  log(`Total: ${tests.length}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  if (results.failed === 0) {
    log('\n✨ All tests passed!', 'green');
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed`, 'red');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  logError('Test suite failed:');
  console.error(error);
  process.exit(1);
});
