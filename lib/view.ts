import { asc, eq } from 'drizzle-orm';
import { db } from './db';
import { messages } from './schema';

const time = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function thread(name: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.thread, name))
    .orderBy(asc(messages.id))
    .all()
    .map((m) => ({ id: m.id, role: m.role, who: m.who, content: m.content, steps: JSON.parse(m.steps), time: time(m.createdAt) }));
}

export const JOB_LABEL = { writing: '写手在写', checking: '核查员在查', revising: '写手在改', rendering: '美编在出图' } as const;
export const STATUS_LABEL = { draft: '草稿 · 待审', final: '已定稿', published: '已发布' } as const;
