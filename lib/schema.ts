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

// 灵感池: things fed in by hand, by link or from an imported file.
export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  source: text('source').notNull().default(''), // link or file name
  verdict: text('verdict', { enum: ['worth', 'merge', 'no'] }),
  note: text('note').notNull().default(''), // the scout's one-line judgement
  status: text('status', { enum: ['pool', 'used', 'dropped'] }).notNull().default('pool'),
  createdAt: text('created_at').notNull(),
});

// 选题单 entries. One row per candidate; `date` groups them into a day's list.
export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  no: integer('no').notNull(),
  kind: text('kind', { enum: ['hot', 'week', 'green'] }).notNull(),
  title: text('title').notNull(),
  what: text('what').notNull().default(''),
  why: text('why').notNull().default(''),
  angle: text('angle').notNull().default(''),
  platforms: text('platforms').notNull().default(''),
  sources: text('sources').notNull().default(''), // markdown
  status: text('status', { enum: ['candidate', 'picked', 'parked'] }).notNull().default('candidate'),
  draftId: integer('draft_id'),
});

// A piece of content: 公众号 + 小红书 + 来源, moving draft -> final -> published.
export const drafts = sqliteTable('drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(), // No.001
  title: text('title').notNull(),
  angle: text('angle').notNull().default(''),
  evergreen: integer('evergreen', { mode: 'boolean' }).notNull().default(true),
  status: text('status', { enum: ['draft', 'final', 'published'] }).notNull().default('draft'),
  mp: text('mp').notNull().default(''), // 公众号 markdown
  xhs: text('xhs').notNull().default(''), // 小红书 markdown
  sources: text('sources').notNull().default(''),
  checkReport: text('check_report').notNull().default(''),
  job: text('job', { enum: ['writing', 'checking', 'revising'] }), // background work in progress
  jobError: text('job_error').notNull().default(''),
  pendingField: text('pending_field', { enum: ['mp', 'xhs', 'sources'] }), // AI revision awaiting accept
  pendingContent: text('pending_content').notNull().default(''),
  publishedUrl: text('published_url').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

// Conversations: thread 'chief' for 主编, 'draft:<id>' for a draft's review chat.
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  thread: text('thread').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  who: text('who').notNull().default(''), // which agent answered
  content: text('content').notNull(),
  steps: text('steps').notNull().default('[]'), // JSON: [{agent, task}]
  createdAt: text('created_at').notNull(),
});

// Brand settings, one row per field.
export const brand = sqliteTable('brand', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
