import { desc, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ideas } from '@/lib/schema';
import { setIdeaStatus } from '@/app/actions';
import { FeedBox, MakeTopics } from '../client';

const VERDICT = { worth: ['值得做', 'pill-ok'], merge: ['并到已有稿', 'pill-accent'], no: ['不建议', ''] } as const;

export default function IdeasPage() {
  const list = db.select().from(ideas).where(ne(ideas.status, 'dropped')).orderBy(desc(ideas.id)).all();
  const pool = list.filter((i) => i.status === 'pool');
  const used = list.filter((i) => i.status === 'used');

  return (
    <>
      <header className="field">
        <h1>灵感池</h1>
        <p className="sub">投喂的链接、想法、资料都在这里。攒够了，让选题官整理成今天的选题单。</p>
      </header>
      <FeedBox />
      <section className="card" aria-labelledby="pool-h">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="pool-h">待用 {pool.length} 条</h2>
          <MakeTopics />
        </div>
        {pool.length === 0 && <p className="hint">空的</p>}
        {pool.map((i) => (
          <div key={i.id} className="list-item">
            <div className="row">
              {i.verdict && <span className={`pill ${VERDICT[i.verdict][1]}`}>{VERDICT[i.verdict][0]}</span>}
              <b>{i.text}</b>
            </div>
            {i.note && <span className="sub">{i.note}</span>}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="hint">{i.source}</span>
              <form action={setIdeaStatus}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="status" value="dropped" />
                <button className="btn-link" type="submit">不要了</button>
              </form>
            </div>
          </div>
        ))}
      </section>
      {used.length > 0 && (
        <details className="card">
          <summary>已经进过选题单的 {used.length} 条</summary>
          {used.map((i) => <p key={i.id} className="sub">{i.text}</p>)}
        </details>
      )}
    </>
  );
}
