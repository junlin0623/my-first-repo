'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export function Chat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, messages: history }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: reply }]);
      }
      if (!reply) throw new Error('模型没有返回内容，检查连接、Key 和模型名');
    } catch (err) {
      setMessages(history);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && <p className="hint">比如：用一段话讲清楚什么是 HBM</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'me' : ''}`}>
            <span className="who">{m.role === 'user' ? '你' : agentName}</span>
            <div className="bubble">{m.content || '…'}</div>
          </div>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <form onSubmit={send} className="row" style={{ flexWrap: 'nowrap' }}>
        <label htmlFor="chat-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          对{agentName}说
        </label>
        <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="回车发送" style={{ flex: 1, minWidth: 0, minHeight: 48 }} />
        <button className="btn-primary" type="submit" disabled={busy} style={{ minHeight: 48 }}>{busy ? '回复中…' : '发送'}</button>
      </form>
    </div>
  );
}
