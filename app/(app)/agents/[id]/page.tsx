import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, connections } from '@/lib/schema';
import { CONNECTION_PRESETS } from '@/lib/defaults';
import { saveAgent } from '@/app/actions';
import { Chat } from './chat';

const MODEL_HINTS = [...new Set(CONNECTION_PRESETS.flatMap((p) => p.models))];

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) notFound();
  const conns = db.select().from(connections).all();
  const ready = !!(agent.enabled && agent.connectionId && agent.model);

  return (
    <>
      <header className="field">
        <div className="hint"><Link href="/agents" style={{ textDecoration: 'underline' }}>Agent</Link> / {agent.name}</div>
        <h1>{agent.name}</h1>
        <p className="sub">{agent.summary}</p>
      </header>

      <form action={saveAgent} className="card">
        <input type="hidden" name="id" value={agent.id} />
        <div className="grid">
          <div className="field">
            <label htmlFor="conn">用哪个模型连接</label>
            <select id="conn" name="connectionId" defaultValue={agent.connectionId ?? ''}>
              <option value="">— 选一个 —</option>
              {conns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {conns.length === 0 && <Link href="/settings" className="hint" style={{ textDecoration: 'underline' }}>先去设置里加一个连接</Link>}
          </div>
          <div className="field">
            <label htmlFor="model">模型</label>
            <input id="model" name="model" className="mono" list="model-hints" defaultValue={agent.model} placeholder="比如 claude-sonnet-5-5" />
            <datalist id="model-hints">{MODEL_HINTS.map((m) => <option key={m} value={m} />)}</datalist>
            <span className="hint">填这家平台上的模型名</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="prompt">角色说明（提示词）</label>
          <textarea id="prompt" name="prompt" rows={8} defaultValue={agent.prompt} />
          <span className="hint">品牌设置（定位、人设、语气、禁区）会自动加在前面，这里只写这个 agent 自己的活。</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="enabled" defaultChecked={agent.enabled} style={{ minHeight: 0, width: 18, height: 18 }} />
            启用
          </label>
          <button className="btn-primary" type="submit">保存</button>
        </div>
      </form>

      <section className="card" aria-labelledby="chat-h">
        <h2 id="chat-h">和{agent.name}对话</h2>
        {ready ? (
          <Chat agentId={agent.id} agentName={agent.name} />
        ) : (
          <p className="sub">先在上面选好连接和模型、保存，就可以在这里对话了。</p>
        )}
      </section>
    </>
  );
}
