'use client';

import { useState } from 'react';
import { addConnection } from '@/app/actions';
import { CONNECTION_PRESETS } from '@/lib/defaults';

export function ConnectionForm() {
  const [preset, setPreset] = useState<(typeof CONNECTION_PRESETS)[number]>(CONNECTION_PRESETS[0]);
  return (
    <form action={addConnection} className="card" key={preset.name}>
      <div className="row" role="group" aria-label="常用平台">
        {CONNECTION_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-pressed={p.name === preset.name}
            className={p.name === preset.name ? 'btn-primary' : undefined}
            onClick={() => setPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid">
        <div className="field">
          <label htmlFor="c-name">名称</label>
          <input id="c-name" name="name" defaultValue={preset.name === '自定义' ? '' : preset.name} required />
        </div>
        <div className="field">
          <label htmlFor="c-kind">类型</label>
          <select id="c-kind" name="kind" defaultValue={preset.kind}>
            <option value="anthropic">Claude 官方接口</option>
            <option value="openai">OpenAI 兼容</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-url">接口地址</label>
          <input id="c-url" name="baseUrl" className="mono" defaultValue={preset.baseUrl} placeholder={preset.kind === 'anthropic' ? '留空用官方地址' : 'https://…/v1'} />
        </div>
        <div className="field">
          <label htmlFor="c-key">API Key</label>
          <input id="c-key" name="apiKey" type="password" autoComplete="off" required placeholder="粘贴你在这家平台申请的 Key" />
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-primary" type="submit">保存连接</button>
      </div>
    </form>
  );
}
