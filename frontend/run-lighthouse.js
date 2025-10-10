/**
 * Lighthouse Performance Audit Script
 *
 * Runs Lighthouse audits and generates reports
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'lighthouse-reports');

// Performance thresholds
const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 85,
};

/**
 * Run Lighthouse audit
 */
async function runLighthouse(url, options = {}) {
  console.log(`Running Lighthouse audit for: ${url}`);

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  const lighthouseOptions = {
    logLevel: 'info',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    ...options,
  };

  try {
    const runnerResult = await lighthouse(url, lighthouseOptions);

    await chrome.kill();

    return runnerResult;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

/**
 * Save reports to disk
 */
function saveReports(runnerResult) {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save HTML report
  const htmlPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.html`);
  fs.writeFileSync(htmlPath, runnerResult.report[0]);
  console.log(`HTML report saved: ${htmlPath}`);

  // Save JSON report
  const jsonPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.json`);
  fs.writeFileSync(jsonPath, runnerResult.report[1]);
  console.log(`JSON report saved: ${jsonPath}`);

  return { htmlPath, jsonPath };
}

/**
 * Display scores
 */
function displayScores(lhr) {
  console.log('\n========================================');
  console.log('LIGHTHOUSE AUDIT RESULTS');
  console.log('========================================\n');

  const categories = lhr.categories;
  let allPassed = true;

  for (const [key, category] of Object.entries(categories)) {
    const score = Math.round(category.score * 100);
    const threshold = THRESHOLDS[key] || 0;
    const passed = score >= threshold;
    const status = passed ? '✓' : '✗';

    console.log(`${status} ${category.title}: ${score} (target: ${threshold})`);

    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\n========================================');

  return allPassed;
}

/**
 * Display detailed metrics
 */
function displayMetrics(lhr) {
  console.log('\nPERFORMANCE METRICS:');
  console.log('========================================\n');

  const audits = lhr.audits;

  const metrics = {
    'First Contentful Paint': audits['first-contentful-paint'],
    'Largest Contentful Paint': audits['largest-contentful-paint'],
    'Total Blocking Time': audits['total-blocking-time'],
    'Cumulative Layout Shift': audits['cumulative-layout-shift'],
    'Speed Index': audits['speed-index'],
    'Time to Interactive': audits['interactive'],
  };

  for (const [name, audit] of Object.entries(metrics)) {
    if (!audit) continue;

    const value = audit.displayValue || 'N/A';
    const score = audit.score !== null ? Math.round(audit.score * 100) : 'N/A';
    const scoreColor = typeof score === 'number' && score >= 90 ? '✓' : '⚠';

    console.log(`${scoreColor} ${name}: ${value} (score: ${score})`);
  }

  console.log('\n========================================');
}

/**
 * Display opportunities
 */
function displayOpportunities(lhr) {
  const opportunities = Object.values(lhr.audits).filter(
    (audit) => audit.score !== null && audit.score < 0.9 && audit.details?.type === 'opportunity'
  );

  if (opportunities.length === 0) {
    console.log('\nNo major optimization opportunities found!\n');
    return;
  }

  console.log('\nOPTIMIZATION OPPORTUNITIES:');
  console.log('========================================\n');

  opportunities
    .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
    .slice(0, 5)
    .forEach((audit) => {
      const savings = audit.details?.overallSavingsMs || 0;
      console.log(`• ${audit.title}`);
      console.log(`  Potential savings: ${Math.round(savings)}ms`);
      console.log(`  ${audit.description}\n`);
    });

  console.log('========================================');
}

/**
 * Display diagnostics
 */
function displayDiagnostics(lhr) {
  const diagnostics = Object.values(lhr.audits).filter(
    (audit) =>
      audit.score !== null &&
      audit.score < 0.9 &&
      audit.details?.type === 'table' &&
      !audit.details?.items?.length
  );

  if (diagnostics.length === 0) {
    return;
  }

  console.log('\nDIAGNOSTICS:');
  console.log('========================================\n');

  diagnostics.slice(0, 5).forEach((audit) => {
    console.log(`⚠ ${audit.title}`);
    console.log(`  ${audit.description}\n`);
  });

  console.log('========================================');
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting Lighthouse Performance Audit...');
  console.log(`Target URL: ${TARGET_URL}\n`);

  // Check if target is accessible
  try {
    const http = require('http');
    const url = new URL(TARGET_URL);

    await new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: url.hostname,
          port: url.port || 3000,
          path: url.pathname,
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Server returned status ${res.statusCode}`));
          }
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  } catch (error) {
    console.error('ERROR: Cannot connect to', TARGET_URL);
    console.error('Please ensure the application is running.');
    console.error('Start the dev server with: npm run dev');
    process.exit(1);
  }

  try {
    // Run audit
    const runnerResult = await runLighthouse(TARGET_URL);

    // Save reports
    const { htmlPath } = saveReports(runnerResult);

    // Display results
    const lhr = runnerResult.lhr;
    const allPassed = displayScores(lhr);
    displayMetrics(lhr);
    displayOpportunities(lhr);
    displayDiagnostics(lhr);

    console.log(`\nView full report: ${htmlPath}\n`);

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Lighthouse audit failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runLighthouse };
