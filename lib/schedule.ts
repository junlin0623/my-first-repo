import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from './db';
import { drafts, slots, topics } from './schema';

// The weekly rhythm from 一人运营效率方案. Evergreen slots can be filled from stock.
export const RHYTHM = [
  { dow: 1, platform: 'xhs', label: '常青科普卡片', evergreen: true },
  { dow: 2, platform: 'mp', label: '解读 / 科普长文', evergreen: true },
  { dow: 3, platform: 'xhs', label: '常青科普卡片', evergreen: true },
  { dow: 4, platform: 'xhs', label: '热点速评', evergreen: false },
  { dow: 5, platform: 'mp', label: '周报', evergreen: false },
  { dow: 6, platform: 'xhs', label: '周报精华卡片', evergreen: false },
] as const;
export const PLATFORM = { mp: '公众号', xhs: '小红书' } as const;
export const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const shanghaiToday = () => new Date(`${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })}T00:00:00Z`);

// Monday of this week (offset 0) or next week (offset 1), Beijing time.
export function weekStart(offset = 0) {
  const d = shanghaiToday();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
  return ymd(d);
}

export function weekDates(monday: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${monday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return ymd(d);
  });
}

export function weekSlots(monday: string) {
  const dates = weekDates(monday);
  if (!db.select().from(slots).where(and(gte(slots.date, dates[0]), lte(slots.date, dates[6]))).get()) {
    for (const r of RHYTHM) db.insert(slots).values({ date: dates[r.dow - 1], platform: r.platform, label: r.label, evergreen: r.evergreen }).run();
  }
  return db.select().from(slots).where(and(gte(slots.date, dates[0]), lte(slots.date, dates[6]))).orderBy(asc(slots.date), asc(slots.platform)).all();
}

// 库存: approved evergreen drafts not yet published.
export function stock() {
  return db.select().from(drafts).where(and(eq(drafts.status, 'final'), eq(drafts.evergreen, true))).orderBy(asc(drafts.updatedAt)).all();
}

// 排期助理: fill empty evergreen slots with stock that isn't scheduled on that platform yet.
export function autoPlan(monday: string) {
  const list = weekSlots(monday);
  const used = (platform: string) =>
    new Set(db.select().from(slots).where(eq(slots.platform, platform as 'mp' | 'xhs')).all().map((s) => s.draftId).filter(Boolean));
  let filled = 0;
  for (const s of list.filter((x) => x.evergreen && !x.draftId)) {
    const taken = used(s.platform);
    const next = stock().find((d) => !taken.has(d.id));
    if (!next) continue;
    db.update(slots).set({ draftId: next.id }).where(eq(slots.id, s.id)).run();
    filled++;
  }
  const after = weekSlots(monday);
  return { filled, empty: after.filter((s) => !s.draftId).length, stock: stock().length };
}

export function assignSlot(slotId: number, draftId: number | null) {
  db.update(slots).set({ draftId }).where(eq(slots.id, slotId)).run();
}

// Evergreen candidates from this week's lists that nobody picked: chosen on Sunday.
export function openEvergreenTopics(monday: string) {
  const dates = weekDates(monday);
  return db.select().from(topics).where(and(inArray(topics.date, dates), eq(topics.kind, 'green'), eq(topics.status, 'candidate'))).all();
}
