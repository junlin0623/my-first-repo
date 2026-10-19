import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db, sweepStaleJobs } from '@/lib/db';
import { drafts } from '@/lib/schema';
import { JOB_LABEL, STATUS_LABEL } from '@/lib/view';

export default function DraftsPage() {
  sweepStaleJobs();
  const all = db.select().from(drafts).orderBy(desc(drafts.id)).all();
  return (
    <>
      <header className="field">
        <h1>稿件</h1>
        <p className="sub">所有写过的稿，也是选题记录：写过什么、到哪一步、发在哪。</p>
      </header>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>编号</th><th>标题</th><th>状态</th><th>类型</th></tr></thead>
          <tbody>
            {all.length === 0 && <tr><td colSpan={4} className="sub">还没有稿件</td></tr>}
            {all.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.code}</td>
                <td><Link href={`/drafts/${d.id}`} style={{ fontWeight: 500 }}>{d.title}</Link></td>
                <td>
                  <span className={`pill ${d.status === 'final' ? 'pill-ok' : d.status === 'published' ? '' : 'pill-week'}`}>{STATUS_LABEL[d.status]}</span>
                  {d.job && <span className="pill pill-accent" style={{ marginLeft: 6 }}>{JOB_LABEL[d.job]}</span>}
                </td>
                <td>{d.evergreen ? '常青' : '热点'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
