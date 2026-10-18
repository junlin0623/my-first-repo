import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { agents } from './schema';
import { getConnection, languageModel } from './models';
import { agentInstructions } from './prompt';

// Everything needed to call one agent: its model and full instructions.
export function getAgent(id: string) {
  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) throw new Error(`没有这个 agent：${id}`);
  if (!agent.enabled) throw new Error(`「${agent.name}」已停用，去 Agent 页打开`);
  const conn = getConnection(agent.connectionId);
  if (!conn || !agent.model) throw new Error(`先去 Agent 页给「${agent.name}」选连接和模型`);
  return {
    name: agent.name,
    model: languageModel(conn, agent.model),
    instructions: agentInstructions(agent.name, agent.prompt, agent.id),
  };
}

export const now = () => new Date().toISOString();
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }); // YYYY-MM-DD

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// OpenAI-compatible APIs (DeepSeek etc.) get only "reply in JSON", not the schema itself,
// so every structured call also spells the shape out in the prompt.
export function jsonOnly(schema: z.ZodType, { array = false } = {}) {
  const shape = z.toJSONSchema(array ? z.object({ elements: z.array(schema) }) : schema);
  return `\n\n只输出一个 JSON 对象，不要别的文字。它必须符合这个 JSON Schema：\n${JSON.stringify(shape)}`;
}
