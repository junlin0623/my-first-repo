import Link from 'next/link';
import { db } from '@/lib/db';
import { drafts } from '@/lib/schema';
import { planWeek, setSlot } from '@/app/actions';
import { PLATFORM, stock, weekSlots, weekStart, WEEKDAY } from '@/lib/schedule';

function Week({ title, offset }: { title: string; offset: number }) {
  const monday = weekStart(offset);
  const list = weekSlots(monday);
  const choices = db.select().from(drafts).all().filter((d) => d.status !== 'draft');
  const byId = new Map(choices.map((d) => [d.id, d]));
  return (
    <section className="card" aria-label={title}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{title} <span className="hint mono" style={{ fontWeight: 400 }}>{monday} 起</span></h2>
        <form action={planWeek}>
          <input type="hidden" name="offset" value={offset} />
          <button type="submit">排期助理：用库存填空格</button>
        </form>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>日子</th><th>平台</th><th>格子</th><th>排的稿</th></tr></thead>
          <tbody>
            {list.map((s) => {
              const d = s.draftId ? byId.get(s.draftId) : undefined;
              return (
                <tr key={s.id}>
                  <td className="mono">{WEEKDAY[new Date(`${s.date}T00:00:00Z`).getUTCDay()]} {s.date.slice(5)}</td>
                  <td>{PLATFORM[s.platform]}</td>
                  <td>{s.label}{s.evergreen && <span className="pill pill-ok" style={{ marginLeft: 6 }}>常青</span>}</td>
                  <td>
                    <form action={setSlot} className="row" style={{ flexWrap: 'nowrap' }}>
                      <input type="hidden" name="id" value={s.id} />
                      <label htmlFor={`slot-${s.id}`} className="sr-only">排的稿</label>
                      <select id={`slot-${s.id}`} name="draftId" defaultValue={s.draftId ?? ''} style={{ minWidth: 0, flex: 1 }}>
                        <option value="">— 空 —</option>
                        {choices.map((c) => <option key={c.id} value={c.id}>{c.code} {c.title}</option>)}
                      </select>
                      <button type="submit">保存</button>
                      {d && <Link href={`/publish/${d.id}`} className="btn-link">发布包</Link>}
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SchedulePage() {
  const s = stock();
  return (
    <>
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="field">
          <h1>排期</h1>
          <p className="sub">按固定节奏排格子：常青格从库存里填，热点和周报当周再定。排好后到平台用「定时发布」排上。每周日 09:50 自动排下周。</p>
        </div>
        <div className={`stat ${s.length < 4 ? 'stat-warn' : ''}`}><span>常青稿库存</span><b>{s.length} 条{s.length < 4 && ' · 低于 4 条'}</b></div>
      </header>
      <Week title="本周" offset={0} />
      <Week title="下周" offset={1} />
    </>
  );
}
