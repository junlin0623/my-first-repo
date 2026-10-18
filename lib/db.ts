import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { DEFAULT_AGENTS } from './defaults';

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
`);

// Seed built-in agents that don't exist yet (keeps user edits).
const insertAgent = sqlite.prepare(
  'INSERT OR IGNORE INTO agents (id, name, summary, prompt, sort) VALUES (?, ?, ?, ?, ?)',
);
DEFAULT_AGENTS.forEach((a, i) => insertAgent.run(a.id, a.name, a.summary, a.prompt, i));

// Optional local brand seed (gitignored), so private content never lands in the repo.
const brandSeed = path.join(DATA_DIR, 'brand.local.json');
const brandCount = sqlite.prepare('SELECT COUNT(*) AS n FROM brand').get() as { n: number };
if (brandCount.n === 0 && fs.existsSync(brandSeed)) {
  const values = JSON.parse(fs.readFileSync(brandSeed, 'utf8')) as Record<string, string>;
  const insertBrand = sqlite.prepare('INSERT INTO brand (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(values)) insertBrand.run(k, v);
}

export const db = drizzle(sqlite, { schema });
