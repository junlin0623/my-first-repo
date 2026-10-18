import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agentSkills, agents, connections } from '@/lib/schema';

export default function AgentsPage() {
  const list = db.select().from(agents).orderBy(asc(agents.sort)).all();
  const skillCount = new Map<string, number>();
  for (const k of db.select().from(agentSkills).all()) if (k.enabled) skillCount.set(k.agentId, (skillCount.get(k.agentId) ?? 0) + 1);
  const conns = new Map(db.select().from(connections).all().map((c) => [c.id, c.name]));

  return (
    <>
      <header className="field">
        <h1>Agent</h1>
        <p className="sub">每个 agent = 模型 + 提示词 + skill。点进去选模型、改提示词、加 skill，都有推荐；也可以直接对话试效果。</p>
      </header>
      <div className="grid">
        {list.map((a) => (
          <Link key={a.id} href={`/agents/${a.id}`} className="card" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 16 }}>{a.name}</strong>
              {!a.enabled && <span className="pill">已停用</span>}
            </div>
            <span className="sub">{a.summary}</span>
            <span className="hint">{skillCount.get(a.id) ? `${skillCount.get(a.id)} 个 skill` : '还没有 skill'}</span>
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
