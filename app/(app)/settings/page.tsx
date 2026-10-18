import { db, getKv } from '@/lib/db';
import { agents, connections } from '@/lib/schema';
import { BRAND_FIELDS } from '@/lib/defaults';
import { getBrand } from '@/lib/prompt';
import { deleteConnection, logout, saveBrand, saveSettings } from '@/app/actions';
import { PALETTES } from '@/lib/palettes';
import { lastRun, ROUTINES } from '@/lib/cron';
import { ConnectionForm } from './connection-form';
import { ExportButton, ImportLegacy, RunRoutine } from '../client';

export default function SettingsPage() {
  const conns = db.select().from(connections).all();
  const allAgents = db.select().from(agents).all();
  const b = getBrand();

  return (
    <>
      <header className="field">
        <h1>设置</h1>
        <p className="sub">模型连接填一次，所有 agent 都能选用；品牌设置会自动带进每个 agent 的提示词。</p>
      </header>

      <section className="field" aria-labelledby="conn-h">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="conn-h">模型连接</h2>
          <span className="hint">Key 加密后存进数据库，只在服务器端用；页面上只显示后 4 位</span>
        </div>
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>名称</th><th>类型 / 地址</th><th>API Key</th><th>谁在用</th><th /></tr>
            </thead>
            <tbody>
              {conns.length === 0 && (
                <tr><td colSpan={5} className="sub">还没有连接。在下面加一个，比如 Claude 或 DeepSeek。</td></tr>
              )}
              {conns.map((c) => {
                const users = allAgents.filter((a) => a.connectionId === c.id).map((a) => a.name);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>
                      {c.kind === 'anthropic' ? 'Claude 官方接口' : 'OpenAI 兼容'}
                      <div className="hint mono">{c.baseUrl || '官方地址'}</div>
                    </td>
                    <td className="mono">••••{c.keyHint}</td>
                    <td>{users.join('、') || <span className="hint">没有</span>}</td>
                    <td>
                      <form action={deleteConnection}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn-link" type="submit">删除</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ConnectionForm />
      </section>

      <section className="field" aria-labelledby="brand-h">
        <h2 id="brand-h">品牌</h2>
        <form action={saveBrand} className="card">
          {BRAND_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`b-${f.key}`}>{f.label}</label>
              {f.rows === 1 ? (
                <input id={`b-${f.key}`} name={f.key} defaultValue={b[f.key] ?? ''} />
              ) : (
                <textarea id={`b-${f.key}`} name={f.key} rows={f.rows} defaultValue={b[f.key] ?? ''} />
              )}
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn-primary" type="submit">保存品牌设置</button>
          </div>
        </form>
      </section>

      <section className="field" aria-labelledby="auto-h">
        <h2 id="auto-h">出图和自动任务</h2>
        <form action={saveSettings} className="card">
          <div className="field">
            <label htmlFor="palette">出图配色（卡片、封面、公众号排版用）</label>
            <select id="palette" name="palette" defaultValue={getKv('palette', 'aurora')}>
              {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name} · 适合{p.fit}</option>)}
            </select>
            <div className="row">
              {PALETTES.map((p) => (
                <span key={p.id} className="row hint" style={{ gap: 4 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: p.bg, border: '1px solid var(--border)' }} />
                  <span style={{ width: 28, height: 16, borderRadius: 4, background: `linear-gradient(90deg, ${p.a1}, ${p.a2})` }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="sources">信息源（RSS / Atom 地址，每行一个）</label>
            <textarea id="sources" name="sources" rows={4} className="mono" defaultValue={getKv('sources')} placeholder={'https://example.com/feed.xml\nhttps://another-site.com/rss'} />
            <span className="hint">每天 07:50 选题官会读最近 36 小时的新消息，加上灵感池，出当天的选题单。</span>
          </div>
          <div className="field">
            <label htmlFor="exportPath">导出到 Obsidian（文件夹完整路径）</label>
            <input id="exportPath" name="exportPath" className="mono" defaultValue={getKv('exportPath')} placeholder="/Users/你/Obsidian/AI说人话/工作台导出" />
          </div>
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="cronOn" defaultChecked={getKv('cron:off') !== '1'} style={{ minHeight: 0, width: 18, height: 18 }} />
            开启自动任务（重启服务后生效）
          </label>
          <button className="btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>保存</button>
        </form>
        <div className="card">
          {ROUTINES.map((r) => (
            <div key={r.key} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{r.label}<span className="hint"> · 上次：{lastRun(r.key) || '还没跑过'}</span></span>
              <RunRoutine id={r.key} label="现在跑一次" />
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>把灵感池、选题单、稿件导出成 Markdown</span>
            <ExportButton />
          </div>
        </div>
      </section>

      <section className="field" aria-label="导入">
        <h2>导入旧项目</h2>
        <ImportLegacy />
      </section>

      {process.env.APP_PASSWORD && (
        <form action={logout}>
          <button className="btn-link" type="submit">退出登录</button>
        </form>
      )}
    </>
  );
}
