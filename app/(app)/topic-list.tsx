import Link from 'next/link';
import { parkTopic, pickTopicAction } from '@/app/actions';
import type { topics } from '@/lib/schema';

type Topic = typeof topics.$inferSelect;
const KIND = { hot: ['今天', 'pill-hot'], week: ['本周内', 'pill-week'], green: ['常青', 'pill-ok'] } as const;

// One line per topic; open it for details, the angle field and the buttons.
export function TopicList({ list }: { list: Topic[] }) {
  return (
    <div>
      {list.map((t) => (
        <details key={t.id} className="topic">
          <summary>
            <span className="mono hint">{String(t.no).padStart(2, '0')}</span>
            <span className={`pill ${KIND[t.kind][1]}`}>{KIND[t.kind][0]}</span>
            <span className="topic-title">{t.title}</span>
            <span className="hint">{t.platforms}</span>
            {t.status === 'picked' && t.draftId && <Link href={`/drafts/${t.draftId}`} className="pill pill-accent">已开写 →</Link>}
            {t.status === 'parked' && <span className="pill">在灵感池</span>}
          </summary>
          <div className="topic-body">
            {t.what && <p className="sub">{t.what}</p>}
            {t.why && <p className="sub"><b>为什么值得做：</b>{t.why}</p>}
            {t.sources && <p className="hint">来源：{t.sources}</p>}
            {t.status === 'candidate' && (
              <div className="row">
                <form action={pickTopicAction} className="row" style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={t.id} />
                  <label htmlFor={`angle-${t.id}`} className="sr-only">角度</label>
                  <input id={`angle-${t.id}`} name="angle" defaultValue={t.angle} style={{ flex: 1, minWidth: 200 }} />
                  <button className="btn-primary" type="submit">做</button>
                </form>
                <form action={parkTopic}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit">放进灵感池</button>
                </form>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
