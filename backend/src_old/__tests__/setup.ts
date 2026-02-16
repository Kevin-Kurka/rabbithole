/**
 * Test Setup Configuration
 *
 * This file is executed before all tests to configure the test environment.
 * It ensures that tests use a separate test database and proper configuration.
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load test-specific environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Validate test database configuration
if (process.env.DATABASE_URL?.includes('production')) {
  throw new Error(
    'CRITICAL: Test database URL contains "production" - this is dangerous! ' +
    'Tests must use a separate test database.'
  );
}

// Set test database URL if TEST_DATABASE_URL is provided
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Log safe database connection info (mask password)
if (process.env.DATABASE_URL) {
  const safeUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@');
  console.log('Test database:', safeUrl);
} else {
  console.warn('WARNING: No DATABASE_URL configured for tests. Using mock database.');
}

// Set default timeout for tests
jest.setTimeout(10000);

// Global test utilities
global.mockQueryResult = (rows: any[] = [], command = 'SELECT', rowCount?: number) => ({
  rows,
  command,
  rowCount: rowCount ?? rows.length,
  oid: 0,
  fields: [],
});

// Declare global types
declare global {
  function mockQueryResult(
    rows?: any[],
    command?: string,
    rowCount?: number
  ): {
    rows: any[];
    command: string;
    rowCount: number;
    oid: number;
    fields: any[];
  };
}

export {};
