import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, connections } from '@/lib/schema';
import { getBrand } from '@/lib/prompt';

// Step 1 home: a checklist to get the first agent talking. The full 今天 page lands in step 2.
export default function TodayPage() {
  const hasConn = db.select().from(connections).all().length > 0;
  const writer = db.select().from(agents).all().find((a) => a.id === 'writer');
  const writerReady = !!(writer?.connectionId && writer.model);
  const hasBrand = !!getBrand().positioning;

  const steps = [
    { done: hasConn, text: '加一个模型连接（Claude 或 DeepSeek）', href: '/settings' },
    { done: hasBrand, text: '填品牌设置：账号名、定位、语气', href: '/settings' },
    { done: writerReady, text: '给写手选连接和模型', href: '/agents/writer' },
  ];

  return (
    <>
      <header className="field">
        <h1>今天</h1>
        <p className="sub">第 1 步：先让写手跑起来。选题单、稿件、主编调度在第 2 步接上。</p>
      </header>
      <section className="card" aria-labelledby="setup-h">
        <h2 id="setup-h">开始</h2>
        {steps.map((s) => (
          <Link key={s.text} href={s.href} className="row">
            <span className={`pill ${s.done ? 'pill-ok' : 'pill-warn'}`}>{s.done ? '已完成' : '待完成'}</span>
            {s.text}
          </Link>
        ))}
        <Link href="/agents/writer" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>和写手对话</Link>
      </section>
    </>
  );
}
