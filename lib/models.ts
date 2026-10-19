import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { connections } from './schema';
import { decrypt } from './crypto';

type Connection = typeof connections.$inferSelect;

// The whole model layer: a connection + model id -> an AI SDK model.
export function languageModel(conn: Connection, modelId: string) {
  const apiKey = decrypt(conn.apiKeyEnc);
  if (conn.kind === 'anthropic') {
    return createAnthropic({ apiKey, baseURL: conn.baseUrl || undefined })(modelId);
  }
  if (!conn.baseUrl) throw new Error(`连接「${conn.name}」没有填接口地址`);
  return createOpenAICompatible({ name: conn.name, baseURL: conn.baseUrl, apiKey })(modelId);
}

export function getConnection(id: number | null) {
  if (id == null) return undefined;
  return db.select().from(connections).where(eq(connections.id, id)).get();
}
