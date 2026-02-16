/**
 * Worker Entry Point
 *
 * This module serves as the entry point for all background worker processes.
 * Currently, it starts the VectorizationWorker, but can be extended to manage
 * multiple worker types in the future.
 *
 * Usage:
 *   npm run worker:start (production)
 *   npm run worker:dev (development)
 */

import VectorizationWorker from './VectorizationWorker';

async function main() {
  console.log('========================================');
  console.log('  Rabbit Hole Background Workers');
  console.log('========================================\n');

  try {
    // Initialize and start the vectorization worker
    const vectorizationWorker = new VectorizationWorker();
    await vectorizationWorker.start();

    // Keep the process alive
    console.log('\nPress Ctrl+C to stop the worker\n');

  } catch (error: any) {
    console.error('Failed to start workers:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the workers
main();
