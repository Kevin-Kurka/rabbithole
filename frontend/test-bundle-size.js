/**
 * Bundle Size Test Script
 *
 * Checks that bundle sizes are within acceptable limits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle size limits (in bytes)
const LIMITS = {
  main: 300 * 1024, // 300KB
  react: 150 * 1024, // 150KB
  graphql: 100 * 1024, // 100KB
  total: 1 * 1024 * 1024, // 1MB
};

const BUILD_DIR = path.join(__dirname, '.next');
const STATIC_DIR = path.join(BUILD_DIR, 'static/chunks');

/**
 * Get file size
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Get gzipped size
 */
function getGzippedSize(filePath) {
  try {
    const gzipSize = execSync(`gzip -c ${filePath} | wc -c`, { encoding: 'utf8' });
    return parseInt(gzipSize.trim());
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Analyze chunk
 */
function analyzeChunk(filePath, limit) {
  const rawSize = getFileSize(filePath);
  const gzipSize = getGzippedSize(filePath);
  const name = path.basename(filePath);

  const passed = limit ? gzipSize <= limit : true;
  const percentage = limit ? Math.round((gzipSize / limit) * 100) : 0;

  return {
    name,
    rawSize,
    gzipSize,
    limit,
    passed,
    percentage,
  };
}

/**
 * Find chunks
 */
function findChunks() {
  const chunks = {
    main: null,
    react: null,
    graphql: null,
    visualization: null,
    other: [],
  };

  if (!fs.existsSync(STATIC_DIR)) {
    throw new Error('Build directory not found. Run "npm run build" first.');
  }

  const files = fs.readdirSync(STATIC_DIR);

  for (const file of files) {
    const filePath = path.join(STATIC_DIR, file);

    if (!file.endsWith('.js') || file.includes('.map')) continue;

    if (file.includes('main-')) {
      chunks.main = filePath;
    } else if (file.includes('react-')) {
      chunks.react = filePath;
    } else if (file.includes('graphql-')) {
      chunks.graphql = filePath;
    } else if (file.includes('visualization-')) {
      chunks.visualization = filePath;
    } else {
      chunks.other.push(filePath);
    }
  }

  return chunks;
}

/**
 * Analyze all chunks
 */
function analyzeAllChunks(chunks) {
  const results = [];
  let totalRaw = 0;
  let totalGzip = 0;
  let allPassed = true;

  // Main chunk
  if (chunks.main) {
    const result = analyzeChunk(chunks.main, LIMITS.main);
    results.push(result);
    totalRaw += result.rawSize;
    totalGzip += result.gzipSize;
    if (!result.passed) allPassed = false;
  }

  // React chunk
  if (chunks.react) {
    const result = analyzeChunk(chunks.react, LIMITS.react);
    results.push(result);
    totalRaw += result.rawSize;
    totalGzip += result.gzipSize;
    if (!result.passed) allPassed = false;
  }

  // GraphQL chunk
  if (chunks.graphql) {
    const result = analyzeChunk(chunks.graphql, LIMITS.graphql);
    results.push(result);
    totalRaw += result.rawSize;
    totalGzip += result.gzipSize;
    if (!result.passed) allPassed = false;
  }

  // Visualization chunk (no limit, just informational)
  if (chunks.visualization) {
    const result = analyzeChunk(chunks.visualization, null);
    results.push(result);
    totalRaw += result.rawSize;
    totalGzip += result.gzipSize;
  }

  // Other chunks
  for (const chunk of chunks.other) {
    const result = analyzeChunk(chunk, null);
    results.push(result);
    totalRaw += result.rawSize;
    totalGzip += result.gzipSize;
  }

  // Check total size
  const totalPassed = totalGzip <= LIMITS.total;
  if (!totalPassed) allPassed = false;

  return {
    results,
    totalRaw,
    totalGzip,
    allPassed,
    totalPassed,
  };
}

/**
 * Display results
 */
function displayResults(analysis) {
  console.log('\n========================================');
  console.log('BUNDLE SIZE ANALYSIS');
  console.log('========================================\n');

  console.log('Individual Chunks:');
  console.log('----------------------------------------\n');

  for (const result of analysis.results) {
    const status = result.passed || !result.limit ? '✓' : '✗';
    const limitText = result.limit ? ` / ${formatBytes(result.limit)}` : '';
    const percentageText = result.percentage ? ` (${result.percentage}%)` : '';

    console.log(`${status} ${result.name}`);
    console.log(`  Raw:    ${formatBytes(result.rawSize)}`);
    console.log(`  Gzip:   ${formatBytes(result.gzipSize)}${limitText}${percentageText}`);
    console.log();
  }

  console.log('----------------------------------------');
  console.log('Total Bundle Size:\n');
  console.log(`  Raw:    ${formatBytes(analysis.totalRaw)}`);
  console.log(`  Gzip:   ${formatBytes(analysis.totalGzip)} / ${formatBytes(LIMITS.total)}`);

  const totalPercentage = Math.round((analysis.totalGzip / LIMITS.total) * 100);
  const totalStatus = analysis.totalPassed ? '✓' : '✗';

  console.log(`  ${totalStatus} Total: ${totalPercentage}% of limit\n`);

  console.log('========================================');

  // Recommendations
  if (!analysis.allPassed) {
    console.log('\nRECOMMENDATIONS:');
    console.log('----------------------------------------\n');

    for (const result of analysis.results) {
      if (result.limit && !result.passed) {
        const excess = result.gzipSize - result.limit;
        console.log(`• ${result.name} is ${formatBytes(excess)} over limit`);
        console.log('  Consider:');
        console.log('  - Code splitting');
        console.log('  - Tree shaking');
        console.log('  - Remove unused dependencies');
        console.log('  - Dynamic imports\n');
      }
    }

    if (!analysis.totalPassed) {
      const excess = analysis.totalGzip - LIMITS.total;
      console.log(`• Total bundle is ${formatBytes(excess)} over limit`);
      console.log('  Consider:');
      console.log('  - Aggressive code splitting');
      console.log('  - Lazy loading routes');
      console.log('  - Analyze with ANALYZE=true npm run build');
      console.log();
    }

    console.log('========================================');
  } else {
    console.log('\n✓ All bundle size checks passed!\n');
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Checking bundle sizes...\n');

  try {
    // Find chunks
    const chunks = findChunks();

    // Analyze chunks
    const analysis = analyzeAllChunks(chunks);

    // Display results
    displayResults(analysis);

    // Exit with appropriate code
    process.exit(analysis.allPassed ? 0 : 1);
  } catch (error) {
    console.error('Bundle size check failed:', error.message);
    console.error('\nPlease run "npm run build" first to generate bundles.');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { analyzeChunk, findChunks, analyzeAllChunks };
