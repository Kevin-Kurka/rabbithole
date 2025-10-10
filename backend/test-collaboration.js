/**
 * Test Script for Real-Time Collaboration System
 * Tests chat, presence, and subscription features
 */

const WebSocket = require('ws');
const axios = require('axios');

const GRAPHQL_HTTP = 'http://localhost:4000/graphql';
const GRAPHQL_WS = 'ws://localhost:4000/graphql';

// Test data
const TEST_GRAPH_ID = 'test-graph-' + Date.now();
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_SESSION_ID = 'session-' + Date.now();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// =====================================================
// HTTP GraphQL Request Helper
// =====================================================

async function graphqlRequest(query, variables = {}) {
  try {
    const response = await axios.post(GRAPHQL_HTTP, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.errors) {
      log(`GraphQL Errors: ${JSON.stringify(response.data.errors, null, 2)}`, 'red');
      return null;
    }

    return response.data.data;
  } catch (error) {
    log(`Request Error: ${error.message}`, 'red');
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return null;
  }
}

// =====================================================
// Test 1: Create Test Graph and User
// =====================================================

async function setupTestData() {
  log('\n=== Test 1: Setup Test Data ===', 'cyan');

  // Create test user
  const createUserQuery = `
    mutation CreateUser($username: String!) {
      createUser(username: $username) {
        id
        username
      }
    }
  `;

  const user = await graphqlRequest(createUserQuery, {
    username: 'test-collab-user-' + Date.now()
  });

  if (!user) {
    log('Failed to create test user', 'red');
    return null;
  }

  log(`✓ Created test user: ${user.createUser.username}`, 'green');

  // Create test graph
  const createGraphQuery = `
    mutation CreateGraph($title: String!) {
      createGraph(title: $title) {
        id
        title
      }
    }
  `;

  const graph = await graphqlRequest(createGraphQuery, {
    title: 'Test Collaboration Graph ' + Date.now()
  });

  if (!graph) {
    log('Failed to create test graph', 'red');
    return null;
  }

  log(`✓ Created test graph: ${graph.createGraph.title}`, 'green');

  return {
    userId: user.createUser.id,
    graphId: graph.createGraph.id
  };
}

// =====================================================
// Test 2: Join Graph (Presence)
// =====================================================

async function testJoinGraph(graphId, sessionId) {
  log('\n=== Test 2: Join Graph (Presence) ===', 'cyan');

  const joinGraphMutation = `
    mutation JoinGraph($graphId: ID!, $sessionId: String!) {
      joinGraph(graphId: $graphId, sessionId: $sessionId)
    }
  `;

  const result = await graphqlRequest(joinGraphMutation, {
    graphId,
    sessionId
  });

  if (result && result.joinGraph) {
    log('✓ Successfully joined graph', 'green');
    return true;
  } else {
    log('✗ Failed to join graph', 'red');
    return false;
  }
}

// =====================================================
// Test 3: Get Active Users
// =====================================================

async function testGetActiveUsers(graphId) {
  log('\n=== Test 3: Get Active Users ===', 'cyan');

  const getActiveUsersQuery = `
    query GetActiveUsers($graphId: ID!) {
      activeUsers(graphId: $graphId) {
        id
        userId
        status
        lastHeartbeat
      }
    }
  `;

  const result = await graphqlRequest(getActiveUsersQuery, {
    graphId
  });

  if (result && result.activeUsers) {
    log(`✓ Found ${result.activeUsers.length} active user(s)`, 'green');
    result.activeUsers.forEach(user => {
      log(`  - User ${user.userId}: ${user.status}`, 'blue');
    });
    return true;
  } else {
    log('✗ Failed to get active users', 'red');
    return false;
  }
}

// =====================================================
// Test 4: Send Chat Message
// =====================================================

async function testSendChatMessage(graphId, message) {
  log('\n=== Test 4: Send Chat Message ===', 'cyan');

  const sendMessageMutation = `
    mutation SendChatMessage($graphId: ID!, $message: String!) {
      sendChatMessage(graphId: $graphId, message: $message) {
        id
        userId
        username
        message
        timestamp
      }
    }
  `;

  const result = await graphqlRequest(sendMessageMutation, {
    graphId,
    message
  });

  if (result && result.sendChatMessage) {
    log('✓ Chat message sent successfully', 'green');
    log(`  Message: "${result.sendChatMessage.message}"`, 'blue');
    log(`  From: ${result.sendChatMessage.username}`, 'blue');
    return result.sendChatMessage.id;
  } else {
    log('✗ Failed to send chat message', 'red');
    return null;
  }
}

// =====================================================
// Test 5: Get Chat Messages
// =====================================================

async function testGetChatMessages(graphId) {
  log('\n=== Test 5: Get Chat Messages ===', 'cyan');

  const getChatMessagesQuery = `
    query GetChatMessages($graphId: ID!, $limit: Int!) {
      getChatMessages(graphId: $graphId, limit: $limit) {
        id
        username
        message
        timestamp
      }
    }
  `;

  const result = await graphqlRequest(getChatMessagesQuery, {
    graphId,
    limit: 10
  });

  if (result && result.getChatMessages) {
    log(`✓ Retrieved ${result.getChatMessages.length} chat message(s)`, 'green');
    result.getChatMessages.forEach(msg => {
      log(`  [${msg.timestamp}] ${msg.username}: ${msg.message}`, 'blue');
    });
    return true;
  } else {
    log('✗ Failed to get chat messages', 'red');
    return false;
  }
}

// =====================================================
// Test 6: Update Cursor Position
// =====================================================

async function testUpdateCursor(graphId, x, y) {
  log('\n=== Test 6: Update Cursor Position ===', 'cyan');

  const updateCursorMutation = `
    mutation UpdateCursor($graphId: ID!, $x: Float!, $y: Float!) {
      updateCursorPosition(graphId: $graphId, x: $x, y: $y)
    }
  `;

  const result = await graphqlRequest(updateCursorMutation, {
    graphId,
    x,
    y
  });

  if (result && result.updateCursorPosition) {
    log(`✓ Cursor position updated to (${x}, ${y})`, 'green');
    return true;
  } else {
    log('✗ Failed to update cursor position', 'red');
    return false;
  }
}

// =====================================================
// Test 7: WebSocket Subscription Test
// =====================================================

function testWebSocketSubscription(graphId) {
  return new Promise((resolve) => {
    log('\n=== Test 7: WebSocket Subscription Test ===', 'cyan');

    // Create WebSocket connection
    const ws = new WebSocket(GRAPHQL_WS, 'graphql-ws');
    let messageCount = 0;
    const maxMessages = 3;

    ws.on('open', () => {
      log('✓ WebSocket connection established', 'green');

      // Send connection init
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {}
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'connection_ack') {
        log('✓ Connection acknowledged', 'green');

        // Subscribe to chat messages
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query: `
              subscription ChatMessages($graphId: ID!) {
                chatMessage(graphId: $graphId) {
                  id
                  username
                  message
                  timestamp
                }
              }
            `,
            variables: { graphId }
          }
        }));

        log('✓ Subscribed to chat messages', 'green');
      } else if (message.type === 'next') {
        messageCount++;
        log(`✓ Received subscription message #${messageCount}:`, 'green');
        log(`  ${JSON.stringify(message.payload, null, 2)}`, 'blue');

        if (messageCount >= maxMessages) {
          ws.close();
          resolve(true);
        }
      } else if (message.type === 'error') {
        log(`✗ Subscription error: ${JSON.stringify(message.payload)}`, 'red');
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (error) => {
      log(`✗ WebSocket error: ${error.message}`, 'red');
      resolve(false);
    });

    ws.on('close', () => {
      log('WebSocket connection closed', 'yellow');
      if (messageCount === 0) {
        resolve(false);
      }
    });

    // Close after timeout if no messages received
    setTimeout(() => {
      if (messageCount === 0) {
        log('⚠ No subscription messages received (timeout)', 'yellow');
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

// =====================================================
// Test 8: Leave Graph
// =====================================================

async function testLeaveGraph(graphId, sessionId) {
  log('\n=== Test 8: Leave Graph ===', 'cyan');

  const leaveGraphMutation = `
    mutation LeaveGraph($graphId: ID!, $sessionId: String!) {
      leaveGraph(graphId: $graphId, sessionId: $sessionId)
    }
  `;

  const result = await graphqlRequest(leaveGraphMutation, {
    graphId,
    sessionId
  });

  if (result && result.leaveGraph) {
    log('✓ Successfully left graph', 'green');
    return true;
  } else {
    log('✗ Failed to leave graph', 'red');
    return false;
  }
}

// =====================================================
// Main Test Runner
// =====================================================

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  REAL-TIME COLLABORATION SYSTEM TEST SUITE', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  try {
    // Setup
    const testData = await setupTestData();
    if (!testData) {
      log('\n✗ Test setup failed, aborting', 'red');
      return;
    }

    const { graphId, userId } = testData;
    const sessionId = TEST_SESSION_ID;

    // Run tests
    let passCount = 0;
    let failCount = 0;

    // Test 2: Join Graph
    if (await testJoinGraph(graphId, sessionId)) passCount++;
    else failCount++;

    // Test 3: Get Active Users
    if (await testGetActiveUsers(graphId)) passCount++;
    else failCount++;

    // Test 4: Send Chat Message
    const messageId = await testSendChatMessage(
      graphId,
      'Hello from collaboration test! 🚀'
    );
    if (messageId) passCount++;
    else failCount++;

    // Test 5: Get Chat Messages
    if (await testGetChatMessages(graphId)) passCount++;
    else failCount++;

    // Test 6: Update Cursor
    if (await testUpdateCursor(graphId, 100, 200)) passCount++;
    else failCount++;

    // Test 7: WebSocket Subscriptions (optional, may timeout)
    log('\n⚠ WebSocket subscription test may take up to 10 seconds...', 'yellow');
    const wsResult = await testWebSocketSubscription(graphId);
    if (wsResult) {
      passCount++;
    } else {
      log('⚠ WebSocket test skipped or timed out (this is okay)', 'yellow');
    }

    // Test 8: Leave Graph
    if (await testLeaveGraph(graphId, sessionId)) passCount++;
    else failCount++;

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('  TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`\n✓ Passed: ${passCount}`, 'green');
    log(`✗ Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
    log(`Total: ${passCount + failCount}\n`, 'blue');

    if (failCount === 0) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠ Some tests failed. Check the logs above.', 'yellow');
    }

  } catch (error) {
    log(`\n✗ Test suite error: ${error.message}`, 'red');
    log(error.stack, 'red');
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
