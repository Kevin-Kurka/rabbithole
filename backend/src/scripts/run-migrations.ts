import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  path: string;
  content: string;
  checksum: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  executed_at: Date;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor(databaseUrl?: string) {
    this.pool = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL,
    });
    this.migrationsDir = path.join(__dirname, '../../migrations');
  }

  /**
   * Calculate SHA-256 checksum of file content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Ensure migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    const migrationTableScript = path.join(this.migrationsDir, '000_schema_migrations.sql');

    if (fs.existsSync(migrationTableScript)) {
      const sql = fs.readFileSync(migrationTableScript, 'utf-8');
      await this.pool.query(sql);
      console.log('✓ Migrations table initialized');
    } else {
      // Create table inline if file doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public."SchemaMigrations" (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          checksum VARCHAR(64),
          success BOOLEAN NOT NULL DEFAULT TRUE,
          error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON public."SchemaMigrations"(version);
      `);
      console.log('✓ Migrations table created');
    }
  }

  /**
   * Get list of applied migrations from database
   */
  private async getAppliedMigrations(): Promise<AppliedMigration[]> {
    const result = await this.pool.query<AppliedMigration>(`
      SELECT version, name, checksum, executed_at
      FROM public."SchemaMigrations"
      WHERE success = true
      ORDER BY version ASC
    `);
    return result.rows;
  }

  /**
   * Get all migration files from migrations directory
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== '000_schema_migrations.sql')
      .sort();

    return files.map(filename => {
      const fullPath = path.join(this.migrationsDir, filename);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const match = filename.match(/^(\d+)_(.+)\.sql$/);

      if (!match) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }

      const [, version, name] = match;

      return {
        version,
        name: name.replace(/_/g, ' '),
        filename,
        path: fullPath,
        content,
        checksum: this.calculateChecksum(content),
      };
    });
  }

  /**
   * Check if migration has been modified
   */
  private hasBeenModified(
    migration: MigrationFile,
    applied: AppliedMigration
  ): boolean {
    return migration.checksum !== applied.checksum;
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: MigrationFile): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`\nRunning migration ${migration.version}: ${migration.name}...`);

      // Execute migration in a transaction
      await this.pool.query('BEGIN');

      try {
        await this.pool.query(migration.content);

        const executionTime = Date.now() - startTime;

        // Record successful migration
        await this.pool.query(`
          INSERT INTO public."SchemaMigrations" (version, name, checksum, execution_time_ms, success)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (version) DO UPDATE
          SET checksum = EXCLUDED.checksum,
              execution_time_ms = EXCLUDED.execution_time_ms,
              executed_at = CURRENT_TIMESTAMP,
              success = true,
              error_message = NULL
        `, [migration.version, migration.name, migration.checksum, executionTime]);

        await this.pool.query('COMMIT');

        console.log(`✓ Migration ${migration.version} completed in ${executionTime}ms`);
      } catch (error) {
        await this.pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failed migration
      try {
        await this.pool.query(`
          INSERT INTO public."SchemaMigrations" (version, name, checksum, execution_time_ms, success, error_message)
          VALUES ($1, $2, $3, $4, false, $5)
          ON CONFLICT (version) DO UPDATE
          SET error_message = EXCLUDED.error_message,
              executed_at = CURRENT_TIMESTAMP,
              success = false
        `, [migration.version, migration.name, migration.checksum, executionTime, errorMessage]);
      } catch (recordError) {
        console.error('Failed to record migration error:', recordError);
      }

      console.error(`✗ Migration ${migration.version} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...\n');

      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get applied and pending migrations
      const applied = await this.getAppliedMigrations();
      const allMigrations = await this.getMigrationFiles();

      console.log(`\nFound ${allMigrations.length} migration files`);
      console.log(`${applied.length} migrations already applied\n`);

      // Check for modified migrations
      const modified = allMigrations.filter(migration => {
        const appliedMigration = applied.find(a => a.version === migration.version);
        return appliedMigration && this.hasBeenModified(migration, appliedMigration);
      });

      if (modified.length > 0) {
        console.warn('\n⚠️  Warning: The following migrations have been modified:');
        modified.forEach(m => {
          console.warn(`  - ${m.version}: ${m.name}`);
        });
        console.warn('\nThis may indicate an inconsistent database state.\n');
      }

      // Get pending migrations
      const appliedVersions = new Set(applied.map(a => a.version));
      const pending = allMigrations.filter(m => !appliedVersions.has(m.version));

      if (pending.length === 0) {
        console.log('✓ All migrations are up to date!\n');
        return;
      }

      console.log(`Running ${pending.length} pending migrations...\n`);

      // Execute pending migrations in order
      for (const migration of pending) {
        await this.executeMigration(migration);
      }

      console.log('\n✓ All migrations completed successfully!\n');
    } catch (error) {
      console.error('\n✗ Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Show migration status
   */
  async showStatus(): Promise<void> {
    try {
      await this.ensureMigrationsTable();

      const applied = await this.getAppliedMigrations();
      const allMigrations = await this.getMigrationFiles();
      const appliedVersions = new Set(applied.map(a => a.version));

      console.log('\n📊 Migration Status\n');
      console.log('═'.repeat(80));

      allMigrations.forEach(migration => {
        const isApplied = appliedVersions.has(migration.version);
        const appliedMigration = applied.find(a => a.version === migration.version);
        const isModified = appliedMigration && this.hasBeenModified(migration, appliedMigration);

        const status = isApplied
          ? (isModified ? '⚠️  Applied (Modified)' : '✓ Applied')
          : '○ Pending';

        console.log(`${status.padEnd(20)} ${migration.version} ${migration.name}`);

        if (appliedMigration) {
          console.log(`${''.padEnd(20)} Executed: ${appliedMigration.executed_at.toISOString()}`);
        }
      });

      console.log('═'.repeat(80));
      console.log(`\nTotal: ${allMigrations.length} | Applied: ${applied.length} | Pending: ${allMigrations.length - applied.length}\n`);
    } catch (error) {
      console.error('Error showing migration status:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const runner = new MigrationRunner();

  try {
    if (command === 'status') {
      await runner.showStatus();
    } else if (command === 'run') {
      await runner.runMigrations();
    } else {
      console.error(`Unknown command: ${command}`);
      console.log('\nUsage: npm run migrate [command]');
      console.log('\nCommands:');
      console.log('  run     - Run pending migrations (default)');
      console.log('  status  - Show migration status');
      process.exit(1);
    }
  } catch (error) {
    console.error('\nMigration process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MigrationRunner };
