'use client';

import { useState } from 'react';
import { deleteConnection, saveConnection } from '@/app/actions';
import { CONNECTION_PRESETS } from '@/lib/defaults';

type Saved = { id: number; name: string; kind: 'anthropic' | 'openai'; baseUrl: string | null; keyHint: string };
type Choice = { key: string; name: string; kind: string; baseUrl: string; saved?: Saved };

// One button per saved connection (click to edit), then the presets not added yet, then 自定义.
export function ConnectionForm({ saved }: { saved: Saved[] }) {
  const names = new Set(saved.map((s) => s.name));
  const choices: Choice[] = [
    ...saved.map((s) => ({ key: `saved-${s.id}`, name: s.name, kind: s.kind, baseUrl: s.baseUrl ?? '', saved: s })),
    ...CONNECTION_PRESETS.filter((p) => p.name !== '自定义' && !names.has(p.name)).map((p) => ({ key: p.name, name: p.name, kind: p.kind, baseUrl: p.baseUrl })),
    { key: 'custom', name: '', kind: 'openai', baseUrl: '' },
  ];
  const [sel, setSel] = useState(choices[0].key);
  const [pendingName, setPendingName] = useState('');
  // After saving a new one, select its new button.
  const justSaved = pendingName ? choices.find((c) => c.saved && c.name === pendingName) : undefined;
  const cur = justSaved ?? choices.find((c) => c.key === sel) ?? choices[0];

  return (
    <div className="card">
      <div className="toggle-group" role="group" aria-label="模型连接">
        {choices.map((c) => (
          <button
            key={c.key}
            type="button"
            className="toggle"
            aria-pressed={c.key === cur.key}
            onClick={() => { setPendingName(''); setSel(c.key); }}
          >
            {c.saved && <span className="dot" aria-hidden="true" />}
            {c.key === 'custom' ? '＋ 自定义' : c.name}
          </button>
        ))}
      </div>
      <p className="hint">{cur.saved ? '已添加的连接：改了点保存；Key 留空就保持原来的。' : '还没添加：填好 Key 保存后，这里会多出一个按钮。'}</p>

      <form
        action={saveConnection}
        key={cur.key}
        className="field"
        onSubmit={(e) => { if (!cur.saved) setPendingName(String(new FormData(e.currentTarget).get('name') ?? '')); }}
      >
        {cur.saved && <input type="hidden" name="id" value={cur.saved.id} />}
        <div className="grid">
          <div className="field">
            <label htmlFor="c-name">名称</label>
            <input id="c-name" name="name" defaultValue={cur.name} placeholder="比如 moark、公司内部模型" required />
          </div>
          <div className="field">
            <label htmlFor="c-kind">类型</label>
            <select id="c-kind" name="kind" defaultValue={cur.kind}>
              <option value="anthropic">Claude 官方接口</option>
              <option value="openai">OpenAI 兼容</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-url">接口地址</label>
            <input id="c-url" name="baseUrl" className="mono" defaultValue={cur.baseUrl} placeholder={cur.kind === 'anthropic' ? '留空用官方地址' : 'https://…/v1'} />
          </div>
          <div className="field">
            <label htmlFor="c-key">API Key</label>
            <input
              id="c-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              required={!cur.saved}
              placeholder={cur.saved ? `留空保持原来的（••••${cur.saved.keyHint}）` : '粘贴你在这家平台申请的 Key'}
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-primary" type="submit">{cur.saved ? '保存修改' : '添加连接'}</button>
        </div>
      </form>
      {cur.saved && (
        <form action={deleteConnection} className="row" style={{ justifyContent: 'flex-end', marginTop: -8 }}>
          <input type="hidden" name="id" value={cur.saved.id} />
          <button className="btn-ghost danger" type="submit" onClick={() => setSel(choices[0].key)}>删除「{cur.name}」</button>
        </form>
      )}
    </div>
  );
}
