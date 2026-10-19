import { db } from './db';
import { brand } from './schema';
import { BRAND_FIELDS } from './defaults';

export function getBrand(): Record<string, string> {
  return Object.fromEntries(db.select().from(brand).all().map((r) => [r.key, r.value]));
}

// Brand settings go in front of every agent's own prompt.
export function agentInstructions(agentName: string, agentPrompt: string) {
  const b = getBrand();
  const lines = BRAND_FIELDS.filter((f) => b[f.key]?.trim()).map((f) => `- ${f.label}：${b[f.key].trim()}`);
  const brandBlock = lines.length ? `你在为下面这个账号工作，所有输出都要符合它：\n${lines.join('\n')}\n\n` : '';
  return `${brandBlock}你的角色是「${agentName}」。\n${agentPrompt}\n\n用简体中文回答。`;
}
