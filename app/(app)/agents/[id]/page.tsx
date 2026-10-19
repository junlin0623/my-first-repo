import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, connections } from '@/lib/schema';
import { CONNECTION_PRESETS } from '@/lib/defaults';
import { saveAgent, skillAction } from '@/app/actions';
import { RECOMMENDED_PROMPTS, SKILL_CATALOG } from '@/lib/skills-catalog';
import { skillsOf } from '@/lib/skills';
import { Chat } from './chat';
import { AddFromCatalog, CustomSkill, ImportSkill, PromptEditor } from './skill-forms';

// Which kind of model suits each agent's job.
const MODEL_ADVICE: Record<string, string> = {
  chief: '推荐：Claude Sonnet。要判断意图、拆任务，用中等以上的模型；每次对话都调用，不必用最贵的。',
  scout: '推荐：DeepSeek。每天读大量新闻、量大，用便宜的模型省钱。',
  writer: '推荐：Claude Opus 或 Sonnet。写稿质量直接决定内容，这里值得用最好的。',
  checker: '推荐：Claude Sonnet。要细心逐条对照，不能太弱；最好和写手用不同的模型，互相挑错。',
  designer: '推荐：DeepSeek 或 Claude Haiku。只是把定稿拆成出图清单，便宜的模型就够。',
  planner: '推荐：DeepSeek 或 Claude Haiku。排期主要靠规则，模型只写总结。',
};

const MODEL_HINTS = [...new Set(CONNECTION_PRESETS.flatMap((p) => p.models))];

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) notFound();
  const conns = db.select().from(connections).all();
  const ready = !!(agent.enabled && agent.connectionId && agent.model);
  const skills = skillsOf(agent.id);
  const added = new Set(skills.map((k) => k.catalogId));
  const recommended = SKILL_CATALOG.filter((c) => c.agent === agent.id && !added.has(c.id));

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
        {MODEL_ADVICE[agent.id] && <p className="hint">{MODEL_ADVICE[agent.id]}</p>}
        <PromptEditor value={agent.prompt} recommended={RECOMMENDED_PROMPTS[agent.id]} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="enabled" defaultChecked={agent.enabled} style={{ minHeight: 0, width: 18, height: 18 }} />
            启用
          </label>
          <button className="btn-primary" type="submit">保存</button>
        </div>
      </form>

      <section className="card" aria-labelledby="skills-h">
        <div className="field">
          <h2 id="skills-h">Skill <span className="hint" style={{ fontWeight: 400 }}>· 打开的会加在提示词后面，每次调用都带上</span></h2>
          <p className="sub">Skill 是可以反复用的工作方法，比如「去 AI 味清单」「标题公式」。提示词说它是谁、做什么；skill 说具体怎么做好。</p>
        </div>
        {skills.length === 0 && <p className="hint">还没有。从下面的推荐里加，或者从 GitHub 导入。</p>}
        {skills.map((k) => (
          <div key={k.id} className="skill">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row">
                <b>{k.name}</b>
                {!k.enabled && <span className="pill">已关闭</span>}
                {k.source && <a href={k.source} target="_blank" rel="noreferrer" className="hint" style={{ textDecoration: 'underline' }}>来源</a>}
                <span className="hint">{k.content.length} 字</span>
              </div>
              <div className="row">
                <form action={skillAction}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="op" value="toggle" />
                  <input type="hidden" name="enabled" value={k.enabled ? '0' : '1'} />
                  <button type="submit">{k.enabled ? '关闭' : '打开'}</button>
                </form>
                <form action={skillAction}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="op" value="remove" />
                  <button type="submit" className="btn-ghost danger">移除</button>
                </form>
              </div>
            </div>
            <details>
              <summary className="hint" style={{ cursor: 'pointer' }}>看 / 改内容</summary>
              <form action={skillAction} className="field" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={k.id} />
                <input type="hidden" name="op" value="save" />
                <textarea name="content" rows={10} defaultValue={k.content} aria-label={`${k.name} 内容`} />
                <button type="submit" style={{ alignSelf: 'flex-end' }}>保存</button>
              </form>
            </details>
          </div>
        ))}

        {recommended.length > 0 && (
          <div className="field">
            <h3>推荐给{agent.name}的 skill</h3>
            <div className="grid">
              {recommended.map((c) => (
                <div key={c.id} className="skill">
                  <b>{c.name}</b>
                  <span className="sub">{c.why}</span>
                  <a href={c.source.url} target="_blank" rel="noreferrer" className="hint" style={{ textDecoration: 'underline' }}>{c.source.label} · {c.source.license}</a>
                  <details>
                    <summary className="hint" style={{ cursor: 'pointer' }}>预览精简版</summary>
                    <p className="hint" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{c.content}</p>
                  </details>
                  <AddFromCatalog agentId={agent.id} catalogId={c.id} hasRaw={!!c.raw} />
                </div>
              ))}
            </div>
            <p className="hint">精简版是按这个工作台改写过的要点，短、省 token；完整原文是原作者的 SKILL.md，更全但更长，可能夹着别的工具的说明。</p>
          </div>
        )}

        <div className="grid">
          <ImportSkill agentId={agent.id} />
          <CustomSkill agentId={agent.id} />
        </div>
      </section>

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
