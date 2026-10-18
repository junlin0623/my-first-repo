import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, drafts, topics } from '@/lib/schema';
import { CHIEF } from '@/lib/chief';
import { JOB_LABEL, thread } from '@/lib/view';
import { AutoRefresh, ChiefChat } from './client';
import { TopicList } from './topic-list';

export default function TodayPage() {
  const all = db.select().from(drafts).orderBy(desc(drafts.updatedAt)).all();
  const latest = db.select({ date: topics.date }).from(topics).orderBy(desc(topics.date)).limit(1).get()?.date;
  const list = latest ? db.select().from(topics).where(eq(topics.date, latest)).orderBy(asc(topics.no)).all() : [];
  const working = all.filter((d) => d.job);
  const review = all.filter((d) => d.status === 'draft' && !d.job);
  const stock = all.filter((d) => d.status === 'final' && d.evergreen).length;
  const hotUsed = list.some((t) => t.kind !== 'green' && t.status === 'picked');
  const needed = ['chief', 'scout', 'writer', 'checker'];
  const unset = db.select().from(agents).all().filter((a) => needed.includes(a.id) && !(a.connectionId && a.model));

  return (
    <>
      <AutoRefresh active={working.length > 0} />
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1>今天</h1>
        <div className="row">
          <div className={`stat ${stock < 4 ? 'stat-warn' : ''}`}><span>常青稿库存</span><b>{stock} 条{stock < 4 && ' · 低于 4 条'}</b></div>
          <div className="stat"><span>待你审的稿</span><b>{review.length} 篇</b></div>
        </div>
      </header>

      {unset.length > 0 && (
        <p className="error">
          还没选模型：{unset.map((a) => <Link key={a.id} href={`/agents/${a.id}`} style={{ textDecoration: 'underline', marginRight: 8 }}>{a.name}</Link>)}
          ——先在<Link href="/settings" style={{ textDecoration: 'underline' }}>设置</Link>里加一个模型连接，再给它们选上。
        </p>
      )}

      <section className="card" aria-labelledby="chief-h">
        <h2 id="chief-h">主编 <span className="sub" style={{ fontWeight: 400, fontSize: 14 }}>· 有事都跟它说：布置任务、投喂灵感、上传资料</span></h2>
        <div className="row" style={{ alignItems: 'stretch', gap: 16 }}>
          <div style={{ flex: '999 1 480px', minWidth: 0 }}>
            <ChiefChat messages={thread(CHIEF)} empty="还没说过话。可以先问：今天先做哪条？" />
          </div>
          <aside className="tasks" aria-labelledby="tasks-h">
            <h3 id="tasks-h">进行中的任务</h3>
            {working.length === 0 && <p className="hint">没有在跑的任务</p>}
            {working.map((d) => (
              <Link key={d.id} href={`/drafts/${d.id}`} className="task">
                <span className="pill pill-accent">{JOB_LABEL[d.job!]}</span>
                <span>{d.code} {d.title}</span>
              </Link>
            ))}
          </aside>
        </div>
      </section>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <section className="card" style={{ flex: '999 1 520px', minWidth: 0 }} aria-labelledby="topics-h">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 id="topics-h">选题单 <span className="hint" style={{ fontWeight: 400 }}>{latest ?? ''} · 热点一天最多做 1 条，常青周日一起挑</span></h2>
            {hotUsed && <span className="pill pill-hot">今天的热点名额已用</span>}
          </div>
          {list.length ? <TopicList list={list} /> : <p className="sub">还没有选题单。去<Link href="/ideas" style={{ textDecoration: 'underline' }}>灵感池</Link>让选题官出一份，或在设置里导入旧项目。</p>}
        </section>

        <aside className="card" style={{ flex: '1 1 320px', minWidth: 0 }} aria-labelledby="review-h">
          <h2 id="review-h">待你审的稿</h2>
          {review.length === 0 && <p className="hint">没有</p>}
          {review.map((d) => (
            <Link key={d.id} href={`/drafts/${d.id}`} className="list-item">
              <span><span className="mono hint">{d.code}</span> {d.title}</span>
              {d.jobError && <span className="hint" style={{ color: 'var(--warn)' }}>上次出错：{d.jobError}</span>}
            </Link>
          ))}
        </aside>
      </div>
    </>
  );
}
