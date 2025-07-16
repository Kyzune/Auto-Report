import Database from 'better-sqlite3';
import * as path from 'path';

const db = new Database(path.resolve(__dirname, 'test-results.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    row INTEGER,
    case_name TEXT,
    param TEXT,
    status TEXT,
    error TEXT,
    duration TEXT,
    screenshot TEXT,
    video TEXT,
    module TEXT,
    environment TEXT,
    app TEXT,
    timestamp TEXT
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS reports_summary (
    run_id INTEGER PRIMARY KEY,
    passed INTEGER,
    failed INTEGER,
    skipped INTEGER,
    total INTEGER,
    environment TEXT,
    app TEXT,
    executedAt TEXT,
    executionTime TEXT
  );
`);

export function getNextRunId(): number {
  const row = db.prepare(`SELECT MAX(run_id) as last FROM reports`).get() as any;
  return (row && row.last !== null ? row.last : 0) + 1;
}

export function insertCaseReport({
  run_id,
  row,
  case_name,
  param,
  status,
  error,
  duration,
  screenshot,
  video,
  module,
  environment,
  app,
  timestamp
}: {
  run_id: number;
  row: number;
  case_name: string;
  param: any;
  status: string;
  error: string;
  duration: string;
  screenshot?: string;
  video?: string;
  module: string;
  environment: string;
  app: string;
  timestamp: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO reports (run_id, row, case_name, param, status, error, duration, screenshot, video, module, environment, app, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(run_id, row, case_name, param ? JSON.stringify(param) : null, status, error, duration, screenshot || null, video || null, module, environment, app, timestamp);
}

export function insertSummaryReport({
  run_id,
  passed,
  failed,
  skipped,
  total,
  environment,
  app,
  executedAt,
  executionTime
}: {
  run_id: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  environment: string;
  app: string;
  executedAt: string;
  executionTime: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO reports_summary
    (run_id, passed, failed, skipped, total, environment, app, executedAt, executionTime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(run_id, passed, failed, skipped, total, environment, app, executedAt, executionTime);
}