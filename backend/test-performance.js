/**
 * Performance Load Test
 *
 * Tests the backend API with 100 concurrent users
 * Measures response times, throughput, and error rates
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60'); // seconds

// Test results
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let totalResponseTime = 0;
let minResponseTime = Infinity;
let maxResponseTime = 0;
const responseTimes = [];

/**
 * GraphQL query to test
 */
const QUERIES = [
  {
    name: 'Get Graphs List',
    query: `
      query {
        graphs {
          id
          name
          description
        }
      }
    `,
    weight: 0.4 // 40% of requests
  },
  {
    name: 'Get Single Graph',
    query: `
      query {
        graph(id: "test-graph-id") {
          id
          name
          nodes {
            id
            props
          }
          edges {
            id
            source_node_id
            target_node_id
          }
        }
      }
    `,
    weight: 0.3 // 30% of requests
  },
  {
    name: 'Get Leaderboard',
    query: `
      query {
        leaderboard(limit: 10) {
          user_id
          username
          total_points
          rank
        }
      }
    `,
    weight: 0.2 // 20% of requests
  },
  {
    name: 'Get User Profile',
    query: `
      query {
        user(id: "test-user-id") {
          id
          username
          total_points
          achievements_count
        }
      }
    `,
    weight: 0.1 // 10% of requests
  }
];

/**
 * Select a random query based on weights
 */
function selectQuery() {
  const random = Math.random();
  let cumulative = 0;

  for (const query of QUERIES) {
    cumulative += query.weight;
    if (random <= cumulative) {
      return query;
    }
  }

  return QUERIES[0];
}

/**
 * Make a GraphQL request
 */
function makeRequest() {
  return new Promise((resolve, reject) => {
    const query = selectQuery();
    const postData = JSON.stringify({ query: query.query });

    const startTime = Date.now();

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        totalRequests++;
        totalResponseTime += responseTime;
        responseTimes.push(responseTime);

        if (responseTime < minResponseTime) minResponseTime = responseTime;
        if (responseTime > maxResponseTime) maxResponseTime = responseTime;

        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (!json.errors) {
              successfulRequests++;
            } else {
              failedRequests++;
              console.error(`GraphQL Error in ${query.name}:`, json.errors);
            }
          } catch (error) {
            failedRequests++;
            console.error(`Parse Error in ${query.name}:`, error.message);
          }
        } else {
          failedRequests++;
          console.error(`HTTP Error ${res.statusCode} in ${query.name}`);
        }

        resolve({
          queryName: query.name,
          responseTime,
          success: res.statusCode === 200
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      totalRequests++;
      failedRequests++;
      responseTimes.push(responseTime);

      console.error('Request Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Simulate a user session
 */
async function simulateUser(userId, duration) {
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);

  while (Date.now() < endTime) {
    try {
      await makeRequest();

      // Random think time between 100ms and 1s
      const thinkTime = Math.floor(Math.random() * 900) + 100;
      await new Promise(resolve => setTimeout(resolve, thinkTime));
    } catch (error) {
      // Continue even if request fails
    }
  }
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Print results
 */
function printResults() {
  console.log('\n========================================');
  console.log('PERFORMANCE TEST RESULTS');
  console.log('========================================\n');

  console.log(`Test Duration: ${TEST_DURATION}s`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`\nRequest Statistics:`);
  console.log(`  Total Requests:      ${totalRequests}`);
  console.log(`  Successful:          ${successfulRequests} (${((successfulRequests/totalRequests)*100).toFixed(2)}%)`);
  console.log(`  Failed:              ${failedRequests} (${((failedRequests/totalRequests)*100).toFixed(2)}%)`);
  console.log(`  Throughput:          ${(totalRequests/TEST_DURATION).toFixed(2)} req/s`);

  if (responseTimes.length > 0) {
    const avgResponseTime = totalResponseTime / totalRequests;

    console.log(`\nResponse Times (ms):`);
    console.log(`  Min:                 ${minResponseTime}ms`);
    console.log(`  Max:                 ${maxResponseTime}ms`);
    console.log(`  Average:             ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Median (P50):        ${percentile(responseTimes, 50)}ms`);
    console.log(`  P95:                 ${percentile(responseTimes, 95)}ms`);
    console.log(`  P99:                 ${percentile(responseTimes, 99)}ms`);
  }

  console.log('\n========================================');

  // Performance targets
  console.log('\nPERFORMANCE TARGETS:');
  const avgResponseTime = totalResponseTime / totalRequests;
  const p95ResponseTime = percentile(responseTimes, 95);
  const errorRate = (failedRequests / totalRequests) * 100;

  console.log(`  Average Response Time: ${avgResponseTime < 100 ? '✓' : '✗'} ${avgResponseTime.toFixed(2)}ms (target: <100ms)`);
  console.log(`  P95 Response Time:     ${p95ResponseTime < 200 ? '✓' : '✗'} ${p95ResponseTime}ms (target: <200ms)`);
  console.log(`  Error Rate:            ${errorRate < 1 ? '✓' : '✗'} ${errorRate.toFixed(2)}% (target: <1%)`);
  console.log(`  Throughput:            ${(totalRequests/TEST_DURATION) > 100 ? '✓' : '✗'} ${(totalRequests/TEST_DURATION).toFixed(2)} req/s (target: >100 req/s)`);

  console.log('\n========================================\n');
}

/**
 * Main test function
 */
async function runLoadTest() {
  console.log('Starting Performance Load Test...');
  console.log(`Target: ${API_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Duration: ${TEST_DURATION} seconds`);
  console.log('');

  // Check if server is running
  try {
    await makeRequest();
    console.log('Server is responding. Starting load test...\n');
  } catch (error) {
    console.error('ERROR: Cannot connect to server at', API_URL);
    console.error('Please ensure the backend server is running.');
    process.exit(1);
  }

  const startTime = Date.now();

  // Launch concurrent users
  const users = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    users.push(simulateUser(i, TEST_DURATION));
  }

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const progress = Math.floor((elapsed / TEST_DURATION) * 100);
    process.stdout.write(`\rProgress: ${progress}% | Requests: ${totalRequests} | Success: ${successfulRequests} | Failed: ${failedRequests}`);
  }, 1000);

  // Wait for all users to complete
  await Promise.allSettled(users);

  clearInterval(progressInterval);
  process.stdout.write('\r');

  // Print results
  printResults();
}

// Run the test
if (require.main === module) {
  runLoadTest()
    .then(() => {
      process.exit(successfulRequests >= totalRequests * 0.99 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runLoadTest };
