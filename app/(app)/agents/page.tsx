import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, connections } from '@/lib/schema';

export default function AgentsPage() {
  const list = db.select().from(agents).orderBy(asc(agents.sort)).all();
  const conns = new Map(db.select().from(connections).all().map((c) => [c.id, c.name]));

  return (
    <>
      <header className="field">
        <h1>Agent</h1>
        <p className="sub">每个 agent = 角色说明 + 用哪个模型连接。点进去改提示词、选模型、直接对话。</p>
      </header>
      <div className="grid">
        {list.map((a) => (
          <Link key={a.id} href={`/agents/${a.id}`} className="card" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 16 }}>{a.name}</strong>
              {!a.enabled && <span className="pill">已停用</span>}
            </div>
            <span className="sub">{a.summary}</span>
            {a.connectionId && a.model ? (
              <span className="hint mono">{conns.get(a.connectionId)} · {a.model}</span>
            ) : (
              <span className="pill pill-warn" style={{ alignSelf: 'flex-start' }}>还没选模型</span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
