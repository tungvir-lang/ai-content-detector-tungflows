import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * SQLite persistence layer, shared by every module.
 *
 * Tables:
 *   oauth_tokens  — access/refresh tokens per API surface + shop.
 *   ad_reports    — daily metric snapshots per ad object, for the dashboard.
 *   budget_rules  — declarative automation rules for the ads engine.
 *   affiliate_plans — snapshot of affiliate collaboration plans per product.
 *   scheduled_posts — the content scheduler queue.
 *   run_log       — audit trail of every automation decision + action.
 */

export type Db = Database.Database;

let singleton: Db | null = null;

export function openDb(path: string): Db {
  if (singleton) return singleton;
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  singleton = db;
  return db;
}

function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      surface        TEXT NOT NULL,
      account_id     TEXT NOT NULL,
      access_token   TEXT NOT NULL,
      refresh_token  TEXT,
      expires_at     INTEGER NOT NULL,
      refresh_expires_at INTEGER,
      updated_at     INTEGER NOT NULL,
      PRIMARY KEY (surface, account_id)
    );

    CREATE TABLE IF NOT EXISTS ad_reports (
      stat_date      TEXT NOT NULL,
      advertiser_id  TEXT NOT NULL,
      object_type    TEXT NOT NULL,
      object_id      TEXT NOT NULL,
      object_name    TEXT,
      spend          REAL NOT NULL DEFAULT 0,
      impressions    INTEGER NOT NULL DEFAULT 0,
      clicks         INTEGER NOT NULL DEFAULT 0,
      conversions    REAL NOT NULL DEFAULT 0,
      revenue        REAL NOT NULL DEFAULT 0,
      synced_at      INTEGER NOT NULL,
      PRIMARY KEY (stat_date, object_type, object_id)
    );

    CREATE TABLE IF NOT EXISTS budget_rules (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      enabled        INTEGER NOT NULL DEFAULT 1,
      object_type    TEXT NOT NULL,
      object_id      TEXT,
      metric         TEXT NOT NULL,
      comparator     TEXT NOT NULL,
      threshold      REAL NOT NULL,
      lookback_days  INTEGER NOT NULL DEFAULT 3,
      action         TEXT NOT NULL,
      action_value   REAL NOT NULL,
      max_budget     REAL,
      min_budget     REAL,
      created_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS affiliate_plans (
      product_id     TEXT NOT NULL,
      plan_type      TEXT NOT NULL,
      product_name   TEXT,
      commission_rate REAL NOT NULL,
      status         TEXT NOT NULL,
      updated_at     INTEGER NOT NULL,
      PRIMARY KEY (product_id, plan_type)
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      caption        TEXT NOT NULL,
      video_url      TEXT,
      product_ids    TEXT,
      scheduled_at   INTEGER NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      publish_id     TEXT,
      error          TEXT,
      created_at     INTEGER NOT NULL,
      posted_at      INTEGER
    );

    CREATE TABLE IF NOT EXISTS run_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      ts             INTEGER NOT NULL,
      module         TEXT NOT NULL,
      action         TEXT NOT NULL,
      target         TEXT,
      dry_run        INTEGER NOT NULL,
      detail         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ad_reports_advertiser ON ad_reports (advertiser_id, stat_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_posts (status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_run_log_ts ON run_log (ts);
  `);
}

export interface RunLogEntry {
  module: string;
  action: string;
  target?: string;
  dryRun: boolean;
  detail?: Record<string, unknown>;
}

export function recordRun(db: Db, entry: RunLogEntry): void {
  db.prepare(
    `INSERT INTO run_log (ts, module, action, target, dry_run, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    Date.now(),
    entry.module,
    entry.action,
    entry.target ?? null,
    entry.dryRun ? 1 : 0,
    entry.detail ? JSON.stringify(entry.detail) : null,
  );
}
