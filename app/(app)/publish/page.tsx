import Link from 'next/link';
import { desc, ne } from 'drizzle-orm';
import { db, sweepStaleJobs } from '@/lib/db';
import { drafts } from '@/lib/schema';
import { draftImages } from '@/lib/legacy';
import { STATUS_LABEL } from '@/lib/view';

export default function PublishList() {
  sweepStaleJobs();
  const list = db.select().from(drafts).where(ne(drafts.status, 'draft')).orderBy(desc(drafts.updatedAt)).all();
  return (
    <>
      <header className="field">
        <h1>发布包</h1>
        <p className="sub">定稿的稿件在这里拿发布包：公众号排版、封面，小红书卡片、正文和标签。你在平台上点发布。</p>
      </header>
      <div className="card" style={{ gap: 0 }}>
        {list.length === 0 && <p className="sub">还没有定稿的稿件。在稿件页点「通过，定稿」。</p>}
        {list.map((d) => (
          <Link key={d.id} href={`/publish/${d.id}`} className="list-item">
            <span className="row">
              <span className="mono hint">{d.code}</span>
              <b>{d.title}</b>
              <span className={`pill ${d.status === 'final' ? 'pill-ok' : ''}`}>{STATUS_LABEL[d.status]}</span>
            </span>
            <span className="hint">{draftImages(d.code).length} 张图{d.job === 'rendering' ? ' · 美编在出图…' : ''}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
