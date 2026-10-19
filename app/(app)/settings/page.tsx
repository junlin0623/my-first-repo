import { db } from '@/lib/db';
import { agents, connections } from '@/lib/schema';
import { BRAND_FIELDS } from '@/lib/defaults';
import { getBrand } from '@/lib/prompt';
import { deleteConnection, logout, saveBrand } from '@/app/actions';
import { ConnectionForm } from './connection-form';
import { ImportLegacy } from '../client';

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

      <section className="field" aria-label="导入">
        <h2>导入旧项目</h2>
        <ImportLegacy />
      </section>

      <form action={logout}>
        <button className="btn-link" type="submit">退出登录</button>
      </form>
    </>
  );
}
