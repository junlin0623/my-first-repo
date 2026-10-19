import { eq } from 'drizzle-orm';
import { db } from './db';
import { agentSkills } from './schema';
import { SKILL_CATALOG } from './skills-catalog';

const LIMIT = 20000; // characters; a skill is part of every request the agent makes

// github.com/<o>/<r>/blob/<branch>/<path> -> raw.githubusercontent.com/<o>/<r>/<branch>/<path>
// A repo or folder link gets SKILL.md appended.
export function rawUrl(url: string) {
  const u = url.trim().replace(/\/$/, '');
  const gh = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:blob|tree)\/([^/]+)(\/.*)?)?$/);
  if (!gh) return u;
  const [, owner, repo, branch = 'main', rest = ''] = gh;
  const file = rest.endsWith('.md') ? rest : `${rest}/SKILL.md`;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}${file}`;
}

// Fetch a SKILL.md, drop its YAML header, take the name from it.
export async function fetchSkill(url: string) {
  const res = await fetch(rawUrl(url), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`读不到这个链接（HTTP ${res.status}）。用 GitHub 上 SKILL.md 文件的地址试试`);
  const text = await res.text();
  const front = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const name = front?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? url.split('/').filter(Boolean).slice(-2, -1)[0] ?? '导入的 skill';
  const body = (front ? text.slice(front[0].length) : text).trim();
  if (!body) throw new Error('这个文件是空的');
  return { name, content: body.length > LIMIT ? `${body.slice(0, LIMIT)}\n\n（原文太长，只保留了前 ${LIMIT} 字）` : body };
}

export function addSkill(agentId: string, s: { name: string; content: string; source?: string; catalogId?: string }) {
  db.insert(agentSkills).values({ agentId, name: s.name, content: s.content, source: s.source ?? '', catalogId: s.catalogId ?? '' }).run();
}

export async function addFromCatalog(agentId: string, catalogId: string, full: boolean) {
  const c = SKILL_CATALOG.find((x) => x.id === catalogId);
  if (!c) throw new Error('没有这个推荐 skill');
  const content = full && c.raw ? (await fetchSkill(c.raw)).content : c.content;
  addSkill(agentId, { name: full ? `${c.name}（完整原文）` : c.name, content, source: c.source.url, catalogId: c.id });
}

export function skillsOf(agentId: string) {
  return db.select().from(agentSkills).where(eq(agentSkills.agentId, agentId)).all();
}
