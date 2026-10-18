import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// A model connection: one provider endpoint + key. Agents pick one.
export const connections = sqliteTable('connections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['anthropic', 'openai'] }).notNull(), // openai = any OpenAI-compatible API
  baseUrl: text('base_url'), // null = provider default
  apiKeyEnc: text('api_key_enc').notNull(), // AES-256-GCM, see lib/crypto.ts
  keyHint: text('key_hint').notNull(), // last 4 chars, for display only
});

// An agent = role prompt + which connection/model it uses.
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(), // slug, e.g. 'writer'
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  prompt: text('prompt').notNull(),
  connectionId: integer('connection_id'),
  model: text('model').notNull().default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

// Brand settings, one row per field.
export const brand = sqliteTable('brand', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
