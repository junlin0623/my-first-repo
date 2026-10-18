'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, brand, connections, ideas, topics } from '@/lib/schema';
import { encrypt } from '@/lib/crypto';
import { BRAND_FIELDS } from '@/lib/defaults';
import { SESSION_COOKIE } from '@/lib/session';
import { errorText } from '@/lib/agent';
import { analyzeIntoIdeas, generateTopics } from '@/lib/scout';
import { extractFile, extractUrl, findUrls } from '@/lib/extract';
import { chiefSay } from '@/lib/chief';
import { importLegacy } from '@/lib/legacy';
import * as D from '@/lib/drafts';
import { startRender } from '@/lib/designer';
import { draftImages } from '@/lib/legacy';
import { getKv, setKv } from '@/lib/db';
import { assignSlot, autoPlan, weekStart } from '@/lib/schedule';
import { dailyTopics, weeklyPlan } from '@/lib/routines';
import { exportMarkdown } from '@/lib/export';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

// New connection, or (with an id) edit one; an empty key keeps the stored key.
export async function saveConnection(f: FormData) {
  const id = Number(f.get('id')) || 0;
  const apiKey = str(f, 'apiKey');
  const name = str(f, 'name');
  const kind = str(f, 'kind') === 'anthropic' ? 'anthropic' : 'openai';
  if (!name || (!id && !apiKey)) return;
  const values = { name, kind, baseUrl: str(f, 'baseUrl') || null, ...(apiKey ? { apiKeyEnc: encrypt(apiKey), keyHint: apiKey.slice(-4) } : {}) } as const;
  if (id) db.update(connections).set(values).where(eq(connections.id, id)).run();
  else db.insert(connections).values({ apiKeyEnc: '', keyHint: '', ...values }).run();
  revalidatePath('/', 'layout');
}

export async function deleteConnection(f: FormData) {
  const id = Number(f.get('id'));
  db.update(agents).set({ connectionId: null }).where(eq(agents.connectionId, id)).run();
  db.delete(connections).where(eq(connections.id, id)).run();
  revalidatePath('/settings');
}

export async function saveBrand(f: FormData) {
  for (const { key } of BRAND_FIELDS) {
    const value = str(f, key);
    db.insert(brand).values({ key, value }).onConflictDoUpdate({ target: brand.key, set: { value } }).run();
  }
  revalidatePath('/', 'layout');
}

export async function saveAgent(f: FormData) {
  const id = str(f, 'id');
  const conn = str(f, 'connectionId');
  db.update(agents)
    .set({
      prompt: str(f, 'prompt'),
      connectionId: conn ? Number(conn) : null,
      model: str(f, 'model'),
      enabled: f.get('enabled') === 'on',
    })
    .where(eq(agents.id, id))
    .run();
  revalidatePath('/agents');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

// ---- Step 2: content workflow ----

export type ActionState = { error?: string; ok?: string };

async function attempt(work: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = (await work()) || undefined;
    revalidatePath('/', 'layout');
    return { ok };
  } catch (e) {
    return { error: errorText(e) };
  }
}

// One input for ideas: a link, a thought, or a file.
export async function feed(_: ActionState, f: FormData): Promise<ActionState> {
  return attempt(async () => {
    const file = f.get('file');
    const text = str(f, 'text');
    if (file instanceof File && file.size > 0) {
      const found = await analyzeIntoIdeas(await extractFile(file), 5);
      return `读完「${file.name}」，拆出 ${found.length} 条`;
    }
    if (!text) throw new Error('写点什么，或者选一个文件');
    const url = findUrls(text)[0];
    const found = await analyzeIntoIdeas(url ? await extractUrl(url) : { name: '手动投喂', text }, url ? 3 : 1);
    return `记进灵感池 ${found.length} 条`;
  });
}

export async function setIdeaStatus(f: FormData) {
  const status = str(f, 'status') as 'pool' | 'used' | 'dropped';
  db.update(ideas).set({ status }).where(eq(ideas.id, Number(f.get('id')))).run();
  revalidatePath('/ideas');
}

export async function makeTopics(_: ActionState): Promise<ActionState> {
  return attempt(async () => `选题官出了 ${(await generateTopics()).length} 条`);
}

export async function pickTopicAction(f: FormData) {
  const id = D.pickTopic(Number(f.get('id')), str(f, 'angle') || undefined);
  redirect(`/drafts/${id}`);
}

export async function parkTopic(f: FormData) {
  const t = db.select().from(topics).where(eq(topics.id, Number(f.get('id')))).get();
  if (!t) return;
  db.update(topics).set({ status: 'parked' }).where(eq(topics.id, t.id)).run();
  db.insert(ideas).values({ text: t.title, source: `选题单 ${t.date}`, note: t.angle, createdAt: new Date().toISOString() }).run();
  revalidatePath('/', 'layout');
}

export async function chief(_: ActionState, f: FormData): Promise<ActionState> {
  const text = str(f, 'text');
  const file = f.get('file');
  try {
    const extracted = file instanceof File && file.size > 0 ? await extractFile(file) : undefined;
    if (text || extracted) await chiefSay(text, extracted);
  } catch (e) {
    return { error: errorText(e) };
  }
  revalidatePath('/', 'layout');
  return {};
}

export async function reviseDraft(_: ActionState, f: FormData): Promise<ActionState> {
  return attempt(async () => {
    const id = Number(f.get('id'));
    const d = D.getDraft(id);
    if (d?.job) throw new Error('上一个任务还没做完，稍等');
    if (d?.pendingField) throw new Error('先处理上一处改动：接受或撤销');
    const text = str(f, 'text');
    if (!text) return;
    D.startRevise(id, str(f, 'field') as D.Field, text);
  });
}

export async function draftAction(f: FormData) {
  const id = Number(f.get('id'));
  const op = str(f, 'op');
  if (op === 'accept' || op === 'reject') D.resolvePending(id, op === 'accept');
  if (op === 'final') {
    D.setStatus(id, 'final');
    const d = D.getDraft(id);
    // 通过 hands the draft to 美编 unless it already has cards
    if (d && !d.job && draftImages(d.code).length === 0) startRender(id);
  }
  if (op === 'render' && !D.getDraft(id)?.job) startRender(id, { respec: f.get('respec') === '1' });
  if (op === 'reopen') D.setStatus(id, 'draft');
  if (op === 'published') D.setStatus(id, 'published', str(f, 'url'));
  if (op === 'check' && !D.getDraft(id)?.job) D.startCheck(id);
  if (op === 'save') D.saveField(id, str(f, 'field') as D.Field, String(f.get('value') ?? ''));
  revalidatePath('/', 'layout');
}

export async function importLegacyAction(_: ActionState, f: FormData): Promise<ActionState> {
  return attempt(async () => {
    const r = importLegacy(str(f, 'path'));
    return `导入了 ${r.topics} 条选题、${r.drafts} 篇稿件、${r.images} 张图、${r.ideas} 条灵感`;
  });
}

// ---- Steps 3–4: publishing, schedule, routines ----

export async function saveSettings(f: FormData) {
  for (const k of ['palette', 'sources', 'exportPath']) setKv(k, str(f, k));
  setKv('cron:off', f.get('cronOn') === 'on' ? '0' : '1');
  revalidatePath('/', 'layout');
}

export async function runRoutine(_: ActionState, f: FormData): Promise<ActionState> {
  return attempt(async () => {
    if (str(f, 'key') === 'weekly-plan') await weeklyPlan();
    else await dailyTopics({ manual: true });
    return '跑完了，结果在首页主编的对话里';
  });
}

export async function exportAction(_: ActionState): Promise<ActionState> {
  return attempt(async () => {
    const r = exportMarkdown(getKv('exportPath'));
    return `导出了 ${r.drafts} 篇稿件、${r.lists} 份选题单、${r.ideas} 条灵感`;
  });
}

export async function planWeek(f: FormData) {
  autoPlan(weekStart(Number(f.get('offset') ?? 1)));
  revalidatePath('/schedule');
}

export async function setSlot(f: FormData) {
  const d = str(f, 'draftId');
  assignSlot(Number(f.get('id')), d ? Number(d) : null);
  revalidatePath('/', 'layout');
}
