import fs from 'node:fs';
import path from 'node:path';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from './db';
import { drafts, ideas, topics } from './schema';

const KIND = { hot: '🔥', week: '⏳', green: '🌲' } as const;
const STATUS = { draft: '草稿', final: '定稿', published: '已发布' } as const;
const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);

// Write everything as plain Markdown into a folder (e.g. inside an Obsidian vault). Overwrites its own files.
export function exportMarkdown(root: string) {
  if (!root || !path.isAbsolute(root)) throw new Error('填一个完整的文件夹路径，比如 /Users/你/Obsidian/AI说人话');
  fs.mkdirSync(root, { recursive: true });
  const write = (rel: string, text: string) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  };

  const pool = db.select().from(ideas).where(eq(ideas.status, 'pool')).orderBy(desc(ideas.id)).all();
  write('灵感池.md', `# 灵感池\n\n${pool.map((i) => `- ${i.createdAt.slice(0, 10)} · ${i.source} · ${i.text}${i.note ? ` · ${i.note}` : ''}`).join('\n') || '（暂无）'}\n`);

  const all = db.select().from(drafts).orderBy(asc(drafts.id)).all();
  write('选题记录.md', `# 选题记录\n\n| 编号 | 标题 | 状态 | 链接 |\n|---|---|---|---|\n${all.map((d) => `| ${d.code} | ${d.title} | ${STATUS[d.status]} | ${d.publishedUrl} |`).join('\n')}\n`);
  for (const d of all) {
    const dir = `稿件/${d.code} ${safe(d.title)}`;
    write(`${dir}/公众号.md`, d.mp);
    write(`${dir}/小红书.md`, d.xhs);
    write(`${dir}/来源.md`, d.sources);
  }

  const ts = db.select().from(topics).orderBy(asc(topics.date), asc(topics.no)).all();
  for (const date of new Set(ts.map((t) => t.date))) {
    const list = ts.filter((t) => t.date === date);
    write(`选题单/${date}.md`, `# 选题单 · ${date}\n\n${list.map((t) => `## ${t.no}. ${t.title} ${KIND[t.kind]}\n- **发生了什么**：${t.what}\n- **为什么值得做**：${t.why}\n- **建议角度**：${t.angle}\n- **平台**：${t.platforms}\n- **来源**：${t.sources}`).join('\n\n')}\n`);
  }
  return { drafts: all.length, ideas: pool.length, lists: new Set(ts.map((t) => t.date)).size };
}
