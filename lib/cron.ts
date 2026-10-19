import { getKv, setKv } from './db';
import { dailyTopics, weeklyPlan } from './routines';

// Two fixed routines, Beijing time. Each runs at most once per day; if the app was off at
// the scheduled time it catches up the next time it's running that day.
export const ROUTINES = [
  { key: 'daily-topics', label: '每天 07:50 出选题单', at: '07:50', sundayOnly: false, run: dailyTopics },
  { key: 'weekly-plan', label: '每周日 09:50 排下周', at: '09:50', sundayOnly: true, run: weeklyPlan },
];

function beijingNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, sunday: parts.weekday === 'Sun' };
}

export const lastRun = (key: string) => getKv(`cron:${key}`);

async function tick() {
  const now = beijingNow();
  for (const r of ROUTINES) {
    if (r.sundayOnly && !now.sunday) continue;
    if (now.time < r.at || lastRun(r.key).startsWith(now.date)) continue;
    setKv(`cron:${r.key}`, `${now.date} ${now.time}`);
    await r.run();
  }
}

export function startCron() {
  const g = globalThis as { __wbCron?: NodeJS.Timeout };
  if (g.__wbCron || getKv('cron:off') === '1') return;
  g.__wbCron = setInterval(() => tick().catch((e) => console.error('cron:', e)), 30_000);
}
