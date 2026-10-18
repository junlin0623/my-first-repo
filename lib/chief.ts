import { asc, desc, eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { db } from './db';
import { drafts, ideas, messages, topics } from './schema';
import { errorText, getAgent, jsonOnly, now } from './agent';
import { addMessage, createDraft, pickTopic } from './drafts';
import { extractUrl, findUrls, type Extracted } from './extract';
import { analyzeIntoIdeas } from './scout';

export const CHIEF = 'chief';
type Step = { agent: string; task: string };

const plan = z.object({
  reply: z.string().describe('对我说的话，简短'),
  actions: z
    .array(
      z.object({
        type: z.enum(['pick', 'park', 'idea', 'write']).describe('pick=开写某条选题，park=选题放进灵感池，idea=记一条灵感，write=不在选题单上的新题直接开写'),
        topicNo: z.number().optional().describe('pick/park 用：今日选题单的编号'),
        text: z.string().optional().describe('idea 用：想法；write 用：题目'),
        angle: z.string().optional().describe('pick/write 用：我指定的角度'),
      }),
    )
    .describe('只在我明确要求时才加动作；只是问问题就留空'),
});

// What the chief can see when deciding.
export function situation() {
  const latest = db.select({ date: topics.date }).from(topics).orderBy(desc(topics.date)).limit(1).get()?.date;
  const list = latest ? db.select().from(topics).where(eq(topics.date, latest)).orderBy(asc(topics.no)).all() : [];
  const all = db.select().from(drafts).all();
  const kind = { hot: '热点', week: '本周内', green: '常青' } as const;
  return {
    date: latest,
    topics: list,
    text: [
      `今日选题单（${latest ?? '还没有'}）：`,
      ...list.map((t) => `${t.no}. [${kind[t.kind]}] ${t.title}（${t.status === 'picked' ? '已开写' : t.status === 'parked' ? '已放灵感池' : '待定'}）`),
      `待审稿：${all.filter((d) => d.status === 'draft').map((d) => `${d.code} ${d.title}`).join('；') || '无'}`,
      `常青库存（已定稿未发布）：${all.filter((d) => d.status === 'final' && d.evergreen).length} 条，低于 4 条要补`,
      `灵感池：${db.select().from(ideas).where(eq(ideas.status, 'pool')).all().length} 条`,
    ].join('\n'),
  };
}

export async function chiefSay(text: string, file?: Extracted) {
  addMessage(CHIEF, 'user', [file && `[文件] ${file.name}`, text].filter(Boolean).join('\n'));
  try {
    const chief = getAgent(CHIEF);
    const steps: Step[] = [];

    // Files and links are read and judged by the scout before the chief answers.
    if (file) {
      const found = await analyzeIntoIdeas(file, 5);
      steps.push({ agent: '选题官', task: `读完「${file.name}」，记进灵感池 ${found.length} 条：${found.map((i) => i.text).join('；')}` });
    }
    for (const url of findUrls(text)) {
      const found = await analyzeIntoIdeas(await extractUrl(url), 3);
      steps.push({ agent: '选题官', task: `读了链接，记进灵感池 ${found.length} 条：${found.map((i) => i.text).join('；')}` });
    }

    const history = db.select().from(messages).where(eq(messages.thread, CHIEF)).orderBy(desc(messages.id)).limit(12).all().reverse();
    const s = situation();
    const { output } = await generateText({
      model: chief.model,
      instructions: `${chief.instructions}\n\n现在的情况：\n${s.text}${jsonOnly(plan)}`,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      output: Output.object({ schema: plan }),
    });

    for (const a of output.actions) {
      const t = s.topics.find((x) => x.no === a.topicNo);
      if (a.type === 'pick' && t) {
        pickTopic(t.id, a.angle);
        steps.push({ agent: '写手', task: `开写《${t.title}》${a.angle ? `，角度：${a.angle}` : ''}` }, { agent: '核查员', task: '写完逐条核对数字和引语' });
      } else if (a.type === 'park' && t) {
        db.update(topics).set({ status: 'parked' }).where(eq(topics.id, t.id)).run();
        db.insert(ideas).values({ text: t.title, source: `选题单 ${t.date}`, note: t.angle, createdAt: now() }).run();
        steps.push({ agent: '选题官', task: `《${t.title}》放进灵感池` });
      } else if (a.type === 'idea' && a.text) {
        db.insert(ideas).values({ text: a.text, source: '主编对话', createdAt: now() }).run();
        steps.push({ agent: '选题官', task: `记进灵感池：${a.text}` });
      } else if (a.type === 'write' && a.text) {
        createDraft({ title: a.text, angle: a.angle });
        steps.push({ agent: '写手', task: `开写《${a.text}》` }, { agent: '核查员', task: '写完逐条核对' });
      }
    }
    addMessage(CHIEF, 'assistant', output.reply, chief.name, steps);
  } catch (e) {
    addMessage(CHIEF, 'assistant', `出错了：${errorText(e)}`, '主编');
  }
}
