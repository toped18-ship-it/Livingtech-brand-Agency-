import { createRequire } from 'node:module';

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementLike {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): RunResult;
}

export interface DbInstance {
  prepare(sql: string): StatementLike;
  exec(sql: string): unknown;
  pragma(pragma: string): unknown;
  transaction<F extends (...args: unknown[]) => unknown>(fn: F): F;
  close(): void;
}

export type SqliteDriverName = 'better-sqlite3' | 'node:sqlite';

interface RawNodeSqliteStatement {
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}

interface RawNodeSqliteDb {
  prepare(sql: string): RawNodeSqliteStatement;
  exec(sql: string): void;
  close(): void;
}

function getRuntimeRequire(): NodeRequire {
  return createRequire(import.meta.url);
}

function normalizeParam(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function normalizeRow(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  return { ...(row as Record<string, unknown>) };
}

function createNodeSqliteAdapter(rawDb: RawNodeSqliteDb): DbInstance {
  let txDepth = 0;

  return {
    prepare(sql: string): StatementLike {
      const stmt = rawDb.prepare(sql);
      return {
        get(...params: unknown[]) {
          const normalized = params.map(normalizeParam);
          const row = stmt.get(...normalized);
          return row === undefined ? undefined : normalizeRow(row);
        },
        all(...params: unknown[]) {
          const normalized = params.map(normalizeParam);
          const rows = stmt.all(...normalized);
          return rows.map((row) => normalizeRow(row));
        },
        run(...params: unknown[]) {
          const normalized = params.map(normalizeParam);
          const res = stmt.run(...normalized);
          return {
            changes: Number(res.changes ?? 0),
            lastInsertRowid: res.lastInsertRowid ?? 0,
          };
        },
      };
    },

    exec(sql: string) {
      rawDb.exec(sql);
    },

    pragma(pragma: string) {
      rawDb.exec(`PRAGMA ${pragma}`);
    },

    transaction<F extends (...args: unknown[]) => unknown>(fn: F): F {
      const wrapped = (...args: unknown[]) => {
        const currentDepth = txDepth;
        const savepoint = `lt_sp_${currentDepth}`;
        if (currentDepth === 0) {
          rawDb.exec('BEGIN');
        } else {
          rawDb.exec(`SAVEPOINT ${savepoint}`);
        }
        txDepth += 1;
        try {
          const result = fn(...args);
          txDepth -= 1;
          if (currentDepth === 0) {
            rawDb.exec('COMMIT');
          } else {
            rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
          }
          return result;
        } catch (err) {
          txDepth = Math.max(0, txDepth - 1);
          try {
            if (currentDepth === 0) {
              rawDb.exec('ROLLBACK');
            } else {
              rawDb.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
              rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
            }
          } catch {
            // Ignore secondary rollback errors so the original error propagates cleanly
          }
          throw err;
        }
      };
      return wrapped as F;
    },

    close() {
      rawDb.close();
    },
  };
}

function tryOpenNodeSqlite(targetPath: string): DbInstance {
  const runtimeRequire = getRuntimeRequire();
  const mod = runtimeRequire('node:sqlite') as { DatabaseSync?: new (location: string) => RawNodeSqliteDb };
  if (!mod?.DatabaseSync) {
    throw new Error('node:sqlite DatabaseSync is unavailable in this Node.js runtime');
  }
  const rawDb = new mod.DatabaseSync(targetPath);
  return createNodeSqliteAdapter(rawDb);
}

function tryOpenBetterSqlite3(targetPath: string): DbInstance {
  const runtimeRequire = getRuntimeRequire();
  const BetterSqlite3 = runtimeRequire('better-sqlite3') as new (location: string) => DbInstance;
  return new BetterSqlite3(targetPath);
}

export function openSqliteDatabase(
  targetPath: string,
  options?: { forceDriver?: SqliteDriverName }
): { db: DbInstance; driver: SqliteDriverName } {
  if (options?.forceDriver === 'node:sqlite') {
    return { db: tryOpenNodeSqlite(targetPath), driver: 'node:sqlite' };
  }
  if (options?.forceDriver === 'better-sqlite3') {
    return { db: tryOpenBetterSqlite3(targetPath), driver: 'better-sqlite3' };
  }

  const isServerless =
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;

  // On Vercel / AWS Lambda, prefer Node's built-in node:sqlite (zero native .node binary risk)
  // and fall back to better-sqlite3 on older Node runtimes. Locally, prefer better-sqlite3 first.
  const order: SqliteDriverName[] = isServerless
    ? ['node:sqlite', 'better-sqlite3']
    : ['better-sqlite3', 'node:sqlite'];

  let lastError: unknown = null;
  for (const driver of order) {
    try {
      const db = driver === 'node:sqlite'
        ? tryOpenNodeSqlite(targetPath)
        : tryOpenBetterSqlite3(targetPath);
      return { db, driver };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Failed to initialize SQLite driver (${order.join(' -> ')}): ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
