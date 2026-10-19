import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { DEFAULT_AGENTS } from './defaults';
import { RECOMMENDED_PROMPTS, SKILL_CATALOG } from './skills-catalog';
import { encrypt } from './crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(path.join(DATA_DIR, 'workbench.db'));
sqlite.pragma('journal_mode = WAL');

// Small schema, created in place. When we move to Postgres this becomes a migration.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    base_url TEXT,
    api_key_enc TEXT NOT NULL,
    key_hint TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    prompt TEXT NOT NULL,
    connection_id INTEGER,
    model TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS brand (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    verdict TEXT,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pool',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    no INTEGER NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    what TEXT NOT NULL DEFAULT '',
    why TEXT NOT NULL DEFAULT '',
    angle TEXT NOT NULL DEFAULT '',
    platforms TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'candidate',
    draft_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    angle TEXT NOT NULL DEFAULT '',
    evergreen INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    mp TEXT NOT NULL DEFAULT '',
    xhs TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '',
    check_report TEXT NOT NULL DEFAULT '',
    job TEXT,
    job_error TEXT NOT NULL DEFAULT '',
    pending_field TEXT,
    pending_content TEXT NOT NULL DEFAULT '',
    published_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread TEXT NOT NULL,
    role TEXT NOT NULL,
    who TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    steps TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    platform TEXT NOT NULL,
    label TEXT NOT NULL,
    evergreen INTEGER NOT NULL,
    draft_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS agent_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    catalog_id TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Columns added after a table first shipped.
for (const sql of [
  `ALTER TABLE drafts ADD COLUMN spec TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE drafts ADD COLUMN mp_html TEXT NOT NULL DEFAULT ''`,
]) {
  try {
    sqlite.exec(sql);
  } catch {
    // already there
  }
}

// A background job that hasn't touched its draft for 15 minutes died (timeout or restart).
// Swept on read rather than at boot: Next evaluates this module in several bundles.
export function sweepStaleJobs() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  sqlite.prepare(`UPDATE drafts SET job = NULL, job_error = '任务超时或服务重启中断了，请重试' WHERE job IS NOT NULL AND updated_at < ?`).run(cutoff);
}

// Seed built-in agents that don't exist yet (keeps user edits).
const insertAgent = sqlite.prepare(
  'INSERT OR IGNORE INTO agents (id, name, summary, prompt, sort) VALUES (?, ?, ?, ?, ?)',
);
DEFAULT_AGENTS.forEach((a, i) => insertAgent.run(a.id, a.name, a.summary, RECOMMENDED_PROMPTS[a.id] ?? a.prompt, i));

// Optional local brand seed (gitignored), so private content never lands in the repo.
const brandSeed = path.join(DATA_DIR, 'brand.local.json');
const brandCount = sqlite.prepare('SELECT COUNT(*) AS n FROM brand').get() as { n: number };
if (brandCount.n === 0 && fs.existsSync(brandSeed)) {
  const values = JSON.parse(fs.readFileSync(brandSeed, 'utf8')) as Record<string, string>;
  const insertBrand = sqlite.prepare('INSERT INTO brand (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(values)) insertBrand.run(k, v);
}

// First run of a fresh install: give every agent its recommended skills (once; removals stick).
const skillsSeeded = sqlite.prepare("SELECT 1 FROM kv WHERE key = 'seeded:skills'").get();
if (!skillsSeeded) {
  const count = sqlite.prepare('SELECT COUNT(*) AS n FROM agent_skills').get() as { n: number };
  if (count.n === 0) {
    const insertSkill = sqlite.prepare('INSERT INTO agent_skills (agent_id, name, source, catalog_id, content) VALUES (?, ?, ?, ?, ?)');
    for (const c of SKILL_CATALOG) insertSkill.run(c.agent, c.name, c.source.url, c.id, c.content);
  }
  sqlite.prepare("INSERT INTO kv (key, value) VALUES ('seeded:skills', '1')").run();
}

// Beta package: data/beta.seed.json carries one shared model connection. It is stored
// encrypted, given to every agent that has none, and the plain-text file is deleted.
const betaSeed = path.join(DATA_DIR, 'beta.seed.json');
if (fs.existsSync(betaSeed)) {
  const seed = JSON.parse(fs.readFileSync(betaSeed, 'utf8')) as { name: string; kind: string; baseUrl: string; apiKey: string; model: string };
  const res = sqlite
    .prepare('INSERT INTO connections (name, kind, base_url, api_key_enc, key_hint) VALUES (?, ?, ?, ?, ?)')
    .run(seed.name, seed.kind, seed.baseUrl || null, encrypt(seed.apiKey), seed.apiKey.slice(-4));
  sqlite.prepare('UPDATE agents SET connection_id = ?, model = ? WHERE connection_id IS NULL').run(res.lastInsertRowid, seed.model);
  fs.rmSync(betaSeed);
}

export const db = drizzle(sqlite, { schema });

export function getKv(key: string, fallback = '') {
  return (sqlite.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? fallback;
}

export function setKv(key: string, value: string) {
  sqlite.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
