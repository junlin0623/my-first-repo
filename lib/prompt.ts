import { db } from './db';
import { and, eq } from 'drizzle-orm';
import { agentSkills, brand } from './schema';
import { BRAND_FIELDS } from './defaults';

export function getBrand(): Record<string, string> {
  return Object.fromEntries(db.select().from(brand).all().map((r) => [r.key, r.value]));
}

export function enabledSkills(agentId: string) {
  return db.select().from(agentSkills).where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.enabled, true))).all();
}

// Brand settings go in front of every agent's own prompt; its enabled skills go after.
export function agentInstructions(agentName: string, agentPrompt: string, agentId = '') {
  const b = getBrand();
  const lines = BRAND_FIELDS.filter((f) => b[f.key]?.trim()).map((f) => `- ${f.label}：${b[f.key].trim()}`);
  const brandBlock = lines.length ? `你在为下面这个账号工作，所有输出都要符合它：\n${lines.join('\n')}\n\n` : '';
  const skills = agentId ? enabledSkills(agentId) : [];
  const skillBlock = skills.length
    ? `\n\n下面是你掌握的技能（skill），做相关工作时照着做：\n${skills.map((k) => `\n## ${k.name}\n${k.content.trim()}`).join('\n')}`
    : '';
  return `${brandBlock}你的角色是「${agentName}」。\n${agentPrompt}${skillBlock}\n\n用简体中文回答。`;
}
