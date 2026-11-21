import crypto from 'node:crypto';
import type { DbInstance } from './sqliteDriver';
import { logger } from '../env';

export const DEFAULT_RTDB_URL = 'https://livingtech-brand-agency-default-rtdb.firebaseio.com';
const RTDB_ROOT_NODE = 'livingtech_app';

// All 47 schema tables in foreign-key-safe restoration order
export const RTDB_SYNC_TABLES = [
  'roles',
  'permissions',
  'users',
  'sessions',
  'auth_tokens',
  'organisations',
  'workspaces',
  'workspace_members',
  'brand_profiles',
  'social_platforms',
  'social_accounts',
  'social_account_tokens',
  'subscription_plans',
  'subscriptions',
  'system_settings',
  'content_campaigns',
  'content_posts',
  'content_variants',
  'media_library',
  'content_assets',
  'publishing_schedules',
  'publishing_jobs',
  'publishing_logs',
  'analytics_snapshots',
  'engagement_items',
  'notifications',
  'ai_usage',
  'support_tickets',
  'audit_logs',
  'ai_content_suggestions',
  'oauth_states',
  'oauth_connection_logs',
  'platform_permissions',
  'platform_capabilities',
  'platform_sync_logs',
  'platform_webhook_events',
  'ai_brand_analyses',
  'ai_content_strategies',
  'generated_content',
  'generated_images',
  'content_calendar',
  'publishing_queue',
  'publishing_attempts',
  'content_approvals',
  'engagement_messages',
  'ai_reply_suggestions',
  'ai_generation_usage',
] as const;

export type RtdbFetchFn = (url: string, init?: RequestInit) => Promise<Response>;
export type RtdbAuthMode = 'service_account' | 'database_secret' | 'id_token' | 'open';

let customFetchTransport: RtdbFetchFn | null = null;

export function setRtdbFetchTransportForTest(fn: RtdbFetchFn | null) {
  customFetchTransport = fn;
  resetRtdbSyncStateForTest();
}

export interface RtdbStatusSnapshot {
  enabled: boolean;
  databaseURL: string;
  authMode: RtdbAuthMode;
  connected: boolean;
  readyForWrites: boolean;
  hydrated: boolean;
  lastHydratedAt: string | null;
  lastPersistedAt: string | null;
  lastError: string | null;
}

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const syncState = {
  hydrated: false,
  connected: false,
  lastHydratedAt: null as string | null,
  lastPersistedAt: null as string | null,
  lastError: null as string | null,
  lastAttemptMs: 0,
  lastFreshnessCheckMs: 0,
  lastKnownRemoteUpdatedAt: null as string | null,
  inflightHydration: null as Promise<boolean> | null,
  // Snapshot of the last state successfully read from / written to RTDB per table -> rtdbKey -> JSON string
  lastSyncedSnapshot: new Map<string, Map<string, string>>(),
  // Cached Google OAuth2 access token when FIREBASE_SERVICE_ACCOUNT_JSON is provided
  cachedServiceAccessToken: null as string | null,
  cachedServiceAccessTokenExpiresAtMs: 0,
};

const RETRY_BACKOFF_MS = 15_000;
const REQUEST_TIMEOUT_MS = 3_500;

function getFreshnessCheckIntervalMs(): number {
  if (customFetchTransport) return 0;
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined
    ? 1_500
    : 10_000;
}

export function resetRtdbSyncStateForTest() {
  syncState.hydrated = false;
  syncState.connected = false;
  syncState.lastHydratedAt = null;
  syncState.lastPersistedAt = null;
  syncState.lastError = null;
  syncState.lastAttemptMs = 0;
  syncState.lastFreshnessCheckMs = 0;
  syncState.lastKnownRemoteUpdatedAt = null;
  syncState.inflightHydration = null;
  syncState.lastSyncedSnapshot = new Map();
  syncState.cachedServiceAccessToken = null;
  syncState.cachedServiceAccessTokenExpiresAtMs = 0;
}

export function getRtdbDatabaseUrl(): string {
  const configured = process.env.FIREBASE_DATABASE_URL?.trim();
  return (configured || DEFAULT_RTDB_URL).replace(/\/+$/, '');
}

export function isRtdbSyncEnabled(): boolean {
  if (customFetchTransport) return true;
  if (process.env.DISABLE_RTDB_SYNC === 'true') return false;
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(getRtdbDatabaseUrl());
}

function stripWrappingQuotes(val: string): string {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function tryParseServiceAccountJson(raw: string | undefined): ServiceAccountCreds | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (!trimmed.startsWith('{') && /^[A-Za-z0-9+/=_-]{80,}$/.test(trimmed)) {
    try {
      candidates.push(Buffer.from(trimmed, 'base64').toString('utf8').trim());
    } catch {
      // Not base64
    }
  }
  for (const candidate of candidates) {
    if (!candidate.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(candidate) as Partial<ServiceAccountCreds>;
      if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, '\n'),
          token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
        };
      }
    } catch {
      // Not a service account JSON
    }
  }
  return null;
}

function parseServiceAccountFromEnv(): ServiceAccountCreds | null {
  return (
    tryParseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    tryParseServiceAccountJson(process.env.FIREBASE_DATABASE_SECRET) ||
    tryParseServiceAccountJson(process.env.FIREBASE_RTDB_AUTH)
  );
}

function getDatabaseSecretFromEnv(): string | null {
  const raw = process.env.FIREBASE_DATABASE_SECRET?.trim() || process.env.FIREBASE_RTDB_AUTH?.trim();
  if (!raw) return null;
  if (tryParseServiceAccountJson(raw)) return null;
  const cleaned = stripWrappingQuotes(raw);
  return cleaned.length > 0 ? cleaned : null;
}

export function detectRtdbAuthMode(idToken?: string): RtdbAuthMode {
  if (parseServiceAccountFromEnv()) return 'service_account';
  if (getDatabaseSecretFromEnv()) return 'database_secret';
  if (idToken?.trim()) return 'id_token';
  return 'open';
}

export function getRtdbStatus(): RtdbStatusSnapshot {
  return {
    enabled: isRtdbSyncEnabled(),
    databaseURL: getRtdbDatabaseUrl(),
    authMode: detectRtdbAuthMode(),
    connected: syncState.connected,
    readyForWrites: syncState.connected && syncState.lastError === null,
    hydrated: syncState.hydrated,
    lastHydratedAt: syncState.lastHydratedAt,
    lastPersistedAt: syncState.lastPersistedAt,
    lastError: syncState.lastError,
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  const creds = parseServiceAccountFromEnv();
  if (!creds) return null;

  const nowMs = Date.now();
  if (syncState.cachedServiceAccessToken && nowMs < syncState.cachedServiceAccessTokenExpiresAtMs - 60_000) {
    return syncState.cachedServiceAccessToken;
  }

  try {
    const nowSec = Math.floor(nowMs / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimSet = base64UrlEncode(
      JSON.stringify({
        iss: creds.client_email,
        scope:
          'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
        aud: creds.token_uri || 'https://oauth2.googleapis.com/token',
        iat: nowSec,
        exp: nowSec + 3600,
      })
    );
    const unsigned = `${header}.${claimSet}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = base64UrlEncode(signer.sign(creds.private_key));
    const assertion = `${unsigned}.${signature}`;

    const resp = await doRtdbFetch(creds.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(assertion)}`,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      logger.warn('Firebase service account token exchange failed', {
        status: resp.status,
        detail: detail.slice(0, 140),
      });
      return null;
    }

    const tokenData = (await resp.json()) as { access_token?: string; expires_in?: number };
    if (!tokenData.access_token) return null;

    syncState.cachedServiceAccessToken = tokenData.access_token;
    syncState.cachedServiceAccessTokenExpiresAtMs = nowMs + (tokenData.expires_in ?? 3600) * 1000;
    return tokenData.access_token;
  } catch (err) {
    logger.warn('Firebase service account token signing failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function buildRtdbEndpoint(nodePath: string, authToken?: string): Promise<string> {
  const base = getRtdbDatabaseUrl();
  const cleanNode = nodePath.replace(/^\/+/, '');

  const serviceAccessToken = await getServiceAccountAccessToken();
  if (serviceAccessToken) {
    return `${base}/${cleanNode}.json?access_token=${encodeURIComponent(serviceAccessToken)}`;
  }

  const secret = getDatabaseSecretFromEnv() || authToken?.trim();
  const query = secret ? `?auth=${encodeURIComponent(secret)}` : '';
  return `${base}/${cleanNode}.json${query}`;
}

function sanitizeRtdbKey(raw: string): string {
  return raw.replace(/[.#$/[\]]/g, '_');
}

function getRowPrimaryKey(row: Record<string, unknown>, idx: number): string {
  const candidate = row.id ?? row.key ?? row.state ?? row.platform_key;
  if (candidate !== undefined && candidate !== null && String(candidate).length > 0) {
    return sanitizeRtdbKey(String(candidate));
  }
  return `row_${idx}`;
}

function getPrimaryKeyColumnName(table: string, validCols: Set<string>): string | null {
  if (validCols.has('id')) return 'id';
  if (table === 'system_settings' && validCols.has('key')) return 'key';
  if (table === 'oauth_states' && validCols.has('state')) return 'state';
  if (table === 'platform_capabilities' && validCols.has('platform_key')) return 'platform_key';
  return null;
}

function readLocalTablesForRtdb(db: DbInstance): {
  tables: Record<string, Record<string, Record<string, unknown>>>;
  serializedByTable: Map<string, Map<string, string>>;
  meta: {
    project: string;
    updatedAt: string;
    userCount: number;
    workspaceCount: number;
    postCount: number;
  };
} {
  const tables: Record<string, Record<string, Record<string, unknown>>> = {};
  const serializedByTable = new Map<string, Map<string, string>>();

  for (const table of RTDB_SYNC_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      const map: Record<string, Record<string, unknown>> = {};
      const tableSerialized = new Map<string, string>();
      rows.forEach((row, idx) => {
        const key = getRowPrimaryKey(row, idx);
        const cleanRow: Record<string, unknown> = {};
        for (const [col, val] of Object.entries(row)) {
          if (val !== undefined) {
            cleanRow[col] = val;
          }
        }
        map[key] = cleanRow;
        tableSerialized.set(key, JSON.stringify(cleanRow));
      });
      tables[table] = map;
      serializedByTable.set(table, tableSerialized);
    } catch {
      // Skip any table not present in older schema versions
    }
  }

  return {
    tables,
    serializedByTable,
    meta: {
      project: 'livingtech-brand-agency',
      updatedAt: new Date().toISOString(),
      userCount: Object.keys(tables.users || {}).length,
      workspaceCount: Object.keys(tables.workspaces || {}).length,
      postCount: Object.keys(tables.content_posts || {}).length,
    },
  };
}

function applyRtdbSnapshotToDb(
  db: DbInstance,
  tablesPayload: Record<string, Record<string, Record<string, unknown>> | Record<string, unknown>[]>
): { restoredRows: number; remoteSerialized: Map<string, Map<string, string>> } {
  let restoredRows = 0;
  const remoteSerialized = new Map<string, Map<string, string>>();

  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      for (const table of RTDB_SYNC_TABLES) {
        const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const validCols = new Set(tableInfo.map((c) => c.name));
        if (validCols.size === 0) continue;

        const rawTable = tablesPayload[table];
        const tableMap = new Map<string, string>();

        if (!rawTable || typeof rawTable !== 'object') {
          remoteSerialized.set(table, tableMap);
          continue;
        }

        const entries: [string, Record<string, unknown>][] = Array.isArray(rawTable)
          ? rawTable
              .map((r, idx): [string, Record<string, unknown>] | null =>
                r && typeof r === 'object' ? [getRowPrimaryKey(r, idx), r] : null
              )
              .filter((e): e is [string, Record<string, unknown>] => e !== null)
          : Object.entries(rawTable).filter(
              (entry): entry is [string, Record<string, unknown>] =>
                Boolean(entry[1] && typeof entry[1] === 'object')
            );

        // If a row existed in our previous synced snapshot and is now absent remotely, delete it locally
        const prevTableMap = syncState.lastSyncedSnapshot.get(table);
        const pkCol = getPrimaryKeyColumnName(table, validCols);
        const remoteKeys = new Set(entries.map(([k]) => k));
        if (prevTableMap && pkCol) {
          for (const [prevKey, prevJson] of prevTableMap.entries()) {
            if (!remoteKeys.has(prevKey)) {
              try {
                const parsedPrev = JSON.parse(prevJson) as Record<string, unknown>;
                const pkVal = parsedPrev[pkCol];
                if (pkVal !== undefined && pkVal !== null) {
                  db.prepare(`DELETE FROM ${table} WHERE ${pkCol} = ?`).run(pkVal);
                }
              } catch {
                // Ignore malformed cached key
              }
            }
          }
        }

        for (const [rtdbKey, row] of entries) {
          const cols = Object.keys(row).filter((col) => validCols.has(col));
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(', ');
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
          const values = cols.map((col) => (row[col] === undefined ? null : row[col]));
          db.prepare(sql).run(...values);
          restoredRows += 1;

          // Record exact stored row representation from SQLite so future diffs stay accurate
          if (pkCol && row[pkCol] !== undefined && row[pkCol] !== null) {
            const stored = db
              .prepare(`SELECT * FROM ${table} WHERE ${pkCol} = ?`)
              .get(row[pkCol]) as Record<string, unknown> | undefined;
            if (stored) {
              tableMap.set(rtdbKey, JSON.stringify(stored));
              continue;
            }
          }
          tableMap.set(rtdbKey, JSON.stringify(row));
        }

        remoteSerialized.set(table, tableMap);
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }

  return { restoredRows, remoteSerialized };
}

async function doRtdbFetch(url: string, init?: RequestInit): Promise<Response> {
  const transport = customFetchTransport ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await transport(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function persistDatabaseToRtdb(
  db: DbInstance,
  options?: { authToken?: string }
): Promise<boolean> {
  if (!isRtdbSyncEnabled()) return false;

  // Ensure we hydrate existing remote data first so a cold start can never overwrite another user's records
  if (!syncState.hydrated) {
    await hydrateDatabaseFromRtdb(db, { authToken: options?.authToken, force: true });
  }

  const snapshot = readLocalTablesForRtdb(db);
  const patchPayload: Record<string, unknown> = {};
  let changedKeys = 0;

  if (syncState.lastSyncedSnapshot.size === 0) {
    // First sync onto an empty RTDB or unhydrated fallback — write all rows via multi-path PATCH (never wipes sibling keys)
    for (const [table, rowsMap] of Object.entries(snapshot.tables)) {
      for (const [rtdbKey, rowObj] of Object.entries(rowsMap)) {
        patchPayload[`tables/${table}/${rtdbKey}`] = rowObj;
        changedKeys += 1;
      }
    }
  } else {
    // Compute exact multi-path diff against last synced snapshot so concurrent instances never clobber each other
    for (const table of RTDB_SYNC_TABLES) {
      const currentMap = snapshot.serializedByTable.get(table) ?? new Map<string, string>();
      const prevMap = syncState.lastSyncedSnapshot.get(table) ?? new Map<string, string>();
      const tableRows = snapshot.tables[table] ?? {};

      for (const [rtdbKey, serialized] of currentMap.entries()) {
        if (prevMap.get(rtdbKey) !== serialized) {
          patchPayload[`tables/${table}/${rtdbKey}`] = tableRows[rtdbKey];
          changedKeys += 1;
        }
      }

      // Propagate explicit deletions as null only for keys we previously knew existed remotely
      if (syncState.hydrated) {
        for (const prevKey of prevMap.keys()) {
          if (!currentMap.has(prevKey)) {
            patchPayload[`tables/${table}/${prevKey}`] = null;
            changedKeys += 1;
          }
        }
      }
    }
  }

  if (changedKeys === 0 && syncState.connected) {
    return true;
  }

  patchPayload['meta'] = snapshot.meta;

  const endpoint = await buildRtdbEndpoint(RTDB_ROOT_NODE, options?.authToken);

  try {
    const resp = await doRtdbFetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload),
    });

    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => '');
      const errorMsg = `Firebase RTDB PATCH failed (HTTP ${resp.status}): ${bodyText.slice(0, 180)}`;
      syncState.connected = false;
      syncState.lastError = errorMsg;
      syncState.lastAttemptMs = Date.now();
      logger.warn('Firebase RTDB persist skipped', { status: resp.status, detail: bodyText.slice(0, 140) });
      return false;
    }

    syncState.connected = true;
    syncState.hydrated = true;
    syncState.lastPersistedAt = snapshot.meta.updatedAt;
    syncState.lastKnownRemoteUpdatedAt = snapshot.meta.updatedAt;
    syncState.lastFreshnessCheckMs = Date.now();
    syncState.lastError = null;
    syncState.lastAttemptMs = Date.now();
    syncState.lastSyncedSnapshot = snapshot.serializedByTable;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    syncState.connected = false;
    syncState.lastError = `Firebase RTDB persist error: ${msg}`;
    syncState.lastAttemptMs = Date.now();
    logger.warn('Firebase RTDB persist error', { error: msg });
    return false;
  }
}

export async function hydrateDatabaseFromRtdb(
  db: DbInstance,
  options?: { authToken?: string; force?: boolean }
): Promise<boolean> {
  if (!isRtdbSyncEnabled()) return false;

  const now = Date.now();
  const freshnessInterval = getFreshnessCheckIntervalMs();

  if (!options?.force) {
    if (syncState.hydrated && syncState.connected) {
      // Recently checked — no network round-trip needed
      if (now - syncState.lastFreshnessCheckMs < freshnessInterval) {
        return true;
      }
      // Lightweight ~30-byte freshness check so warm serverless instances stay in sync across users
      try {
        const metaEndpoint = await buildRtdbEndpoint(`${RTDB_ROOT_NODE}/meta/updatedAt`, options?.authToken);
        const metaResp = await doRtdbFetch(metaEndpoint, { method: 'GET' });
        syncState.lastFreshnessCheckMs = Date.now();
        if (metaResp.ok) {
          const remoteUpdatedAt = (await metaResp.json()) as string | null;
          if (remoteUpdatedAt && remoteUpdatedAt === syncState.lastKnownRemoteUpdatedAt) {
            return true;
          }
        }
      } catch {
        // Proceed with cached local state on transient freshness check failure
        return true;
      }
    } else if (
      !options?.authToken &&
      syncState.lastAttemptMs > 0 &&
      now - syncState.lastAttemptMs < RETRY_BACKOFF_MS
    ) {
      return syncState.connected;
    }
  }

  if (syncState.inflightHydration) {
    return syncState.inflightHydration;
  }

  syncState.inflightHydration = (async () => {
    const endpoint = await buildRtdbEndpoint(RTDB_ROOT_NODE, options?.authToken);
    try {
      const resp = await doRtdbFetch(endpoint, { method: 'GET' });
      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        syncState.connected = false;
        syncState.lastError = `Firebase RTDB GET failed (HTTP ${resp.status}): ${bodyText.slice(0, 180)}`;
        syncState.lastAttemptMs = Date.now();
        return false;
      }

      const rootData = (await resp.json()) as {
        tables?: Record<string, Record<string, Record<string, unknown>> | Record<string, unknown>[]>;
        meta?: { updatedAt?: string };
      } | null;

      const tablesData = rootData?.tables;
      if (tablesData && typeof tablesData === 'object' && Object.keys(tablesData).length > 0) {
        const { restoredRows, remoteSerialized } = applyRtdbSnapshotToDb(db, tablesData);
        syncState.connected = true;
        syncState.hydrated = true;
        syncState.lastHydratedAt = new Date().toISOString();
        syncState.lastFreshnessCheckMs = Date.now();
        syncState.lastKnownRemoteUpdatedAt = rootData?.meta?.updatedAt ?? syncState.lastHydratedAt;
        syncState.lastSyncedSnapshot = remoteSerialized;
        syncState.lastError = null;
        syncState.lastAttemptMs = Date.now();
        logger.info('Hydrated application state from Firebase Realtime Database', { restoredRows });
        return true;
      }

      // Database is reachable and empty — mark hydrated and push initial clean seed to Firebase Realtime Database
      syncState.connected = true;
      syncState.hydrated = true;
      syncState.lastHydratedAt = new Date().toISOString();
      syncState.lastFreshnessCheckMs = Date.now();
      syncState.lastError = null;
      syncState.lastAttemptMs = Date.now();
      await persistDatabaseToRtdb(db, options);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncState.connected = false;
      syncState.lastError = `Firebase RTDB hydrate error: ${msg}`;
      syncState.lastAttemptMs = Date.now();
      return false;
    } finally {
      syncState.inflightHydration = null;
    }
  })();

  return syncState.inflightHydration;
}

export async function ensureRtdbHydrated(
  db: DbInstance,
  options?: { authToken?: string }
): Promise<boolean> {
  return hydrateDatabaseFromRtdb(db, options);
}
