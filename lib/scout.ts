import { desc, eq, sql } from 'drizzle-orm';
import { generateText, Output, type UserContent } from 'ai';
import { z } from 'zod';
import { db } from './db';
import { drafts, ideas, topics } from './schema';
import { getAgent, jsonOnly, now, today } from './agent';
import type { Extracted } from './extract';

const ideaSchema = z.object({
  title: z.string().describe('一句话的选题想法'),
  verdict: z.enum(['worth', 'merge', 'no']).describe('worth=值得做，merge=并到已有稿或选题，no=不建议'),
  why: z.string().describe('一句话理由；merge 时写并到哪一篇'),
});

function doneTitles() {
  return db.select({ code: drafts.code, title: drafts.title }).from(drafts).all().map((d) => `${d.code} ${d.title}`).join('\n');
}

// Read a file, link or note and split it into ideas for the pool, each with a verdict.
export async function analyzeIntoIdeas(input: Extracted, max = 5) {
  const scout = getAgent('scout');
  const ask = `从下面的资料里拆出最多 ${max} 条可以做成内容的选题想法，逐条判断值不值得做。\n已经做过的稿件（用来查重）：\n${doneTitles() || '（还没有）'}\n\n资料「${input.name}」：\n${input.text}${jsonOnly(ideaSchema, { array: true })}`;
  const content: UserContent = input.image
    ? [{ type: 'text', text: ask }, { type: 'file', mediaType: input.image.mediaType, data: input.image.data }]
    : ask;
  const { output } = await generateText({
    model: scout.model,
    instructions: scout.instructions,
    messages: [{ role: 'user', content }],
    output: Output.array({ element: ideaSchema, maxItems: max }),
  });
  const createdAt = now();
  return output.map((i) =>
    db.insert(ideas).values({ text: i.title, verdict: i.verdict, note: i.why, source: input.name, createdAt }).returning().get(),
  );
}

const topicSchema = z.object({
  kind: z.enum(['hot', 'week', 'green']).describe('hot=今天就该发，week=本周内，green=常青'),
  title: z.string(),
  what: z.string().describe('一句话说清是什么'),
  why: z.string().describe('为什么值得做'),
  angle: z.string().describe('建议角度'),
  platforms: z.string().describe('如：公众号 + 小红书'),
  sources: z.string().describe('一手来源，每行一个链接；没有就写「待补」'),
});

// 选题官 turns the idea pool into today's topic list.
export async function generateTopics() {
  const pool = db.select().from(ideas).where(eq(ideas.status, 'pool')).orderBy(desc(ideas.id)).limit(30).all();
  if (pool.length === 0) throw new Error('灵感池是空的，先投喂几条想法或导入资料');
  const scout = getAgent('scout');
  const { output } = await generateText({
    model: scout.model,
    instructions: scout.instructions,
    prompt: `从灵感池里挑出值得做的，整理成今天的选题单（5–8 条）。不要编造来源；来源不清楚就写「待补」。\n已经做过的稿件：\n${doneTitles() || '（还没有）'}\n\n灵感池：\n${pool.map((i) => `- ${i.text}（${i.source}；${i.note}）`).join('\n')}${jsonOnly(topicSchema, { array: true })}`,
    output: Output.array({ element: topicSchema, maxItems: 8 }),
  });
  const date = today();
  const start = db.select({ n: sql<number>`coalesce(max(no), 0)` }).from(topics).where(eq(topics.date, date)).get()?.n ?? 0;
  output.forEach((t, i) => db.insert(topics).values({ ...t, date, no: start + i + 1 }).run());
  // Everything the scout looked at has been considered; it leaves the pool.
  pool.forEach((i) => db.update(ideas).set({ status: 'used' }).where(eq(ideas.id, i.id)).run());
  return output.length;
}
