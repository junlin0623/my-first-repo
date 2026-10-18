import { eq } from 'drizzle-orm';
import { db } from './db';
import { ideas } from './schema';
import { errorText, getAgent } from './agent';
import { CHIEF } from './chief';
import { addMessage } from './drafts';
import { fetchNews, newsSources } from './news';
import { autoPlan, openEvergreenTopics, PLATFORM, stock, weekSlots, weekStart, WEEKDAY } from './schedule';
import { generateTopics } from './scout';

// 07:50 — news + idea pool -> today's topic list; 主编 posts the morning brief.
export async function dailyTopics({ manual = false } = {}) {
  // Quietly skip until there's something to work with (first run, nothing configured yet).
  if (!manual) {
    try {
      getAgent('scout');
    } catch {
      return;
    }
    if (newsSources().length === 0 && !db.select().from(ideas).where(eq(ideas.status, 'pool')).get()) return;
  }
  try {
    const news = await fetchNews();
    const list = await generateTopics(news.text);
    const hot = list.filter((t) => t.kind !== 'green');
    const s = stock().length;
    addMessage(
      CHIEF,
      'assistant',
      [
        `选题官出了今天的选题单：热点 ${hot.length} 条、常青 ${list.length - hot.length} 条。`,
        hot[0] && `建议做「${hot[0].title}」，回「做 1」就开写。`,
        `常青库存 ${s} 条${s < 4 ? '，低于 4 条，周日排期时要补' : ''}。`,
        news.errors.length > 0 && `有 ${news.errors.length} 个信息源没读到：${news.errors.join('；')}`,
      ].filter(Boolean).join('\n'),
      '主编',
    );
  } catch (e) {
    addMessage(CHIEF, 'assistant', `今天的选题单没出成：${errorText(e)}`, '主编');
  }
}

// Sunday 09:50 — fill next week from stock; list what's missing and the evergreen topics to choose from.
export async function weeklyPlan() {
  const monday = weekStart(1);
  const r = autoPlan(monday);
  const open = weekSlots(monday).filter((s) => !s.draftId);
  const candidates = openEvergreenTopics(weekStart(0));
  addMessage(
    CHIEF,
    'assistant',
    [
      `下周排期：排好 ${r.filled} 格，还空 ${r.empty} 格${open.length ? `（${open.map((s) => `${WEEKDAY[new Date(`${s.date}T00:00:00Z`).getUTCDay()]}${PLATFORM[s.platform]}·${s.label}`).join('、')}）` : ''}。`,
      `常青库存剩 ${r.stock} 条${r.stock < 4 ? '，低于 4 条，建议补写' : ''}。`,
      candidates.length > 0 && `本周没被挑走的常青选题：${candidates.map((t) => `${t.date} #${t.no}《${t.title}》`).join('；')}。去选题单点开一条就能开写。`,
    ].filter(Boolean).join('\n'),
    '排期助理',
  );
}
