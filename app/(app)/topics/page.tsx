import { asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { topics } from '@/lib/schema';
import { MakeTopics } from '../client';
import { TopicList } from '../topic-list';

export default function TopicsPage() {
  const all = db.select().from(topics).orderBy(desc(topics.date), asc(topics.no)).all();
  const dates = [...new Set(all.map((t) => t.date))];

  return (
    <>
      <header className="field">
        <h1>选题单</h1>
        <p className="sub">每天一份。点开一条可以改角度、开写，或者放回灵感池。每天 07:50 自动出单在第 4 步接上。</p>
      </header>
      <MakeTopics />
      {dates.length === 0 && <p className="sub">还没有选题单。</p>}
      {dates.map((d) => (
        <section key={d} className="card" aria-label={d}>
          <h2 className="mono">{d}</h2>
          <TopicList list={all.filter((t) => t.date === d)} />
        </section>
      ))}
    </>
  );
}
