import { eq, sql } from 'drizzle-orm';
import { generateText, streamText } from 'ai';
import { db } from './db';
import { drafts, messages, topics } from './schema';
import { errorText, getAgent, now } from './agent';

type Draft = typeof drafts.$inferSelect;
export type Field = 'mp' | 'xhs' | 'sources';
export const FIELD_LABEL: Record<Field, string> = { mp: '公众号', xhs: '小红书', sources: '来源' };

const MARK = { mp: '=== 公众号 ===', xhs: '=== 小红书 ===', sources: '=== 来源 ===' };

// Writer output is one text with three marked sections; split it (works on partial text too).
export function splitSections(text: string): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  const order = (Object.keys(MARK) as Field[])
    .map((f) => ({ f, at: text.indexOf(MARK[f]) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  order.forEach((x, i) => {
    const start = x.at + MARK[x.f].length;
    const end = i + 1 < order.length ? order[i + 1].at : text.length;
    out[x.f] = text.slice(start, end).trim();
  });
  return out;
}

export function getDraft(id: number) {
  return db.select().from(drafts).where(eq(drafts.id, id)).get();
}

function update(id: number, set: Partial<Draft>) {
  db.update(drafts).set({ ...set, updatedAt: now() }).where(eq(drafts.id, id)).run();
}

export function addMessage(thread: string, role: 'user' | 'assistant', content: string, who = '', steps: { agent: string; task: string }[] = []) {
  db.insert(messages).values({ thread, role, who, content, steps: JSON.stringify(steps), createdAt: now() }).run();
}

function nextCode() {
  const row = db.select({ n: sql<number>`max(cast(substr(code, 4) as integer))` }).from(drafts).get();
  return `No.${String((row?.n ?? 0) + 1).padStart(3, '0')}`;
}

export function createDraft(input: { title: string; angle?: string; evergreen?: boolean; brief?: string }) {
  const res = db
    .insert(drafts)
    .values({ code: nextCode(), title: input.title, angle: input.angle ?? '', evergreen: input.evergreen ?? true, updatedAt: now() })
    .returning({ id: drafts.id })
    .get();
  startWrite(res.id, input.brief ?? '');
  return res.id;
}

// 「做」: a topic becomes a draft and the writer starts.
export function pickTopic(topicId: number, angle?: string) {
  const t = db.select().from(topics).where(eq(topics.id, topicId)).get();
  if (!t) throw new Error('没有这个选题');
  if (t.draftId) return t.draftId;
  const brief = [`发生了什么：${t.what}`, `为什么值得做：${t.why}`, `平台：${t.platforms}`, `一手来源：\n${t.sources}`].join('\n');
  const id = createDraft({ title: t.title, angle: angle || t.angle, evergreen: t.kind === 'green', brief });
  db.update(topics).set({ status: 'picked', draftId: id }).where(eq(topics.id, topicId)).run();
  return id;
}

// Run work in the background; the page polls the draft's `job` field.
function background(id: number, job: Draft['job'], work: () => Promise<void>) {
  update(id, { job, jobError: '' });
  work()
    .then(() => update(id, { job: null }))
    .catch((e) => {
      console.error(`draft ${id} ${job} failed:`, e);
      update(id, { job: null, jobError: errorText(e) });
    });
}

export function startWrite(id: number, brief: string) {
  background(id, 'writing', async () => {
    const d = getDraft(id)!;
    const writer = getAgent('writer');
    const result = streamText({
      model: writer.model,
      instructions: writer.instructions,
      prompt: [
        `选题：${d.title}`,
        d.angle && `角度：${d.angle}`,
        brief,
        '',
        `按下面的格式输出，三个标记各占一行，不要别的开场白：`,
        `${MARK.mp}\n（3 个备选标题、摘要、正文）`,
        `${MARK.xhs}\n（封面标题、正文、卡片文案、话题标签）`,
        `${MARK.sources}\n（每个数字和引语对应的来源链接，标一手 / 二手）`,
      ].filter(Boolean).join('\n'),
    });
    let text = '';
    let last = 0;
    for await (const chunk of result.textStream) {
      text += chunk;
      if (Date.now() - last > 800) {
        update(id, splitSections(text));
        last = Date.now();
      }
    }
    const parts = splitSections(text);
    if (!parts.mp && !parts.xhs) throw new Error('写手没有按格式返回内容，检查模型设置');
    update(id, parts);
    addMessage(`draft:${id}`, 'assistant', `${d.code} 初稿写好了，核查员接着查数字和来源。`, writer.name);
    startCheck(id);
  });
}

export function startCheck(id: number) {
  // Runs after the writer has cleared its own job, so wait a tick.
  setTimeout(() => {
    background(id, 'checking', async () => {
      const d = getDraft(id)!;
      const checker = getAgent('checker');
      const { text } = await generateText({
        model: checker.model,
        instructions: checker.instructions,
        prompt: `核查这篇稿件。先一句话总结（多少条有出处、多少条二手、多少条找不到），再逐条列出需要处理的句子。\n\n【公众号】\n${d.mp}\n\n【来源清单】\n${d.sources}`,
      });
      update(id, { checkReport: text });
      addMessage(`draft:${id}`, 'assistant', text.split('\n')[0] || '核查完了，看「核查」标签页。', checker.name);
    });
  }, 0);
}

// 「改：……」 — the writer rewrites one section; the result waits for accept / undo.
export function startRevise(id: number, field: Field, instruction: string) {
  addMessage(`draft:${id}`, 'user', instruction);
  background(id, 'revising', async () => {
    const d = getDraft(id)!;
    const writer = getAgent('writer');
    const { text } = await generateText({
      model: writer.model,
      instructions: writer.instructions,
      prompt: `下面是稿件的「${FIELD_LABEL[field]}」部分。按我的意见修改，只改提到的地方。\n先输出完整的修改后版本，然后另起一行写「=== 改动说明 ===」，用一两句说改了哪几处。\n\n我的意见：${instruction}\n\n【原文】\n${d[field]}`,
    });
    const [content, note = '改好了。'] = text.split('=== 改动说明 ===');
    if (!content.trim()) throw new Error('写手没有返回修改后的内容');
    update(id, { pendingField: field, pendingContent: content.trim() });
    addMessage(`draft:${id}`, 'assistant', `${note.trim()} 稿子上方标出了改动，满意就点「接受」。`, writer.name);
  });
}

export function resolvePending(id: number, accept: boolean) {
  const d = getDraft(id);
  if (!d?.pendingField) return;
  update(id, { ...(accept ? { [d.pendingField]: d.pendingContent } : {}), pendingField: null, pendingContent: '' });
}

export function setStatus(id: number, status: Draft['status'], publishedUrl?: string) {
  update(id, { status, ...(publishedUrl !== undefined ? { publishedUrl } : {}) });
}

export function saveField(id: number, field: Field, value: string) {
  update(id, { [field]: value });
}
