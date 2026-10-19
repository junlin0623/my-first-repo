'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chief, exportAction, feed, importLegacyAction, makeTopics, reviseDraft, runRoutine, type ActionState } from '@/app/actions';

function Result({ s }: { s: ActionState }) {
  if (s.error) return <p className="error">{s.error}</p>;
  if (s.ok) return <p className="pill pill-ok" style={{ alignSelf: 'flex-start' }}>{s.ok}</p>;
  return null;
}

// Re-fetch the page every few seconds while an agent is working in the background.
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}

type Msg = { id: number; role: 'user' | 'assistant'; who: string; content: string; steps: { agent: string; task: string }[]; time: string };

function Messages({ list, busy, busyText }: { list: Msg[]; busy: boolean; busyText: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [list.length, busy]);
  return (
    <div className="chat-log" ref={ref} aria-live="polite">
      {list.map((m) => (
        <div key={m.id} className={`msg ${m.role === 'user' ? 'me' : ''}`}>
          <span className="who">{m.role === 'user' ? '你' : m.who} · {m.time}</span>
          <div className="bubble">
            {m.content}
            {m.steps.map((s, i) => (
              <div key={i} className="step"><span className="agent">{s.agent}</span>{s.task}</div>
            ))}
          </div>
        </div>
      ))}
      {busy && <p className="hint">{busyText}</p>}
    </div>
  );
}

const CHIPS = ['今天先做哪条？', '库存不够，补 2 篇常青', '这周干了什么'];

export function ChiefChat({ messages, empty }: { messages: Msg[]; empty: string }) {
  const [state, action, busy] = useActionState(chief, {});
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState('');

  function submit(formData: FormData) {
    setSent(String(formData.get('text') ?? '') || fileName);
    setText('');
    setFileName('');
    action(formData);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="chat">
      {messages.length === 0 && !busy ? <p className="hint">{empty}</p> : null}
      <Messages list={messages} busy={busy} busyText={`主编在处理「${sent}」…`} />
      <Result s={state} />
      <div className="row">
        {CHIPS.map((c) => (
          <button key={c} type="button" className="chip" disabled={busy} onClick={() => { setText(c); setTimeout(() => formRef.current?.requestSubmit()); }}>{c}</button>
        ))}
      </div>
      <form ref={formRef} action={submit} className="row" style={{ flexWrap: 'nowrap' }}>
        <label className="btn" style={{ minWidth: 48, minHeight: 48, padding: 0 }} title="上传文件">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12.5l-8.5 8.5a5 5 0 0 1-7-7L14 5.5a3.3 3.3 0 0 1 4.7 4.7L10.2 18.7a1.7 1.7 0 0 1-2.4-2.4L15.5 8.6" /></svg>
          <span className="sr-only">上传文件</span>
          <input ref={fileRef} type="file" name="file" className="sr-only" accept=".pdf,.docx,.md,.txt,image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
        </label>
        <label htmlFor="chief-input" className="sr-only">对主编说</label>
        <input id="chief-input" name="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={fileName ? `已选文件：${fileName}，可以再说一句要它干嘛` : '布置任务、贴链接、写个想法都行（回车发送）'} style={{ flex: 1, minWidth: 0, minHeight: 48 }} />
        <button className="btn-primary" type="submit" disabled={busy} style={{ minHeight: 48 }}>{busy ? '处理中…' : '发送'}</button>
      </form>
      <p className="hint">回形针上传 PDF、Word、Markdown、TXT、图片；贴的链接会先交给选题官判断，再记进灵感池</p>
    </div>
  );
}

export function FeedBox() {
  const [state, action, busy] = useActionState(feed, {});
  return (
    <form action={action} className="card">
      <h2>投喂</h2>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <label htmlFor="feed-text" className="sr-only">链接或想法</label>
        <input id="feed-text" name="text" placeholder="贴链接，或写一句想法" style={{ flex: 1, minWidth: 0 }} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? '选题官在看…' : '交给选题官'}</button>
      </div>
      <div className="field">
        <label htmlFor="feed-file">或者上传资料</label>
        <input id="feed-file" name="file" type="file" accept=".pdf,.docx,.md,.txt,image/*" />
        <span className="hint">PDF、Word(.docx)、Markdown、TXT、图片。选题官读完拆成几条，每条标「值得做 / 并到已有稿 / 不建议」</span>
      </div>
      <Result s={state} />
    </form>
  );
}

export function MakeTopics() {
  const [state, action, busy] = useActionState(makeTopics, {});
  return (
    <form action={action} className="field">
      <button className="btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? '选题官在整理…' : '用灵感池出今天的选题单'}</button>
      <Result s={state} />
    </form>
  );
}

export function DraftChat({ draftId, field, fieldLabel, messages, locked }: { draftId: number; field: string; fieldLabel: string; messages: Msg[]; locked: string }) {
  const [state, action, busy] = useActionState(reviseDraft, {});
  const [text, setText] = useState('');
  return (
    <div className="chat">
      <Messages list={messages} busy={busy} busyText="写手在改…" />
      <Result s={state} />
      <form action={(f) => { setText(''); action(f); }} className="field">
        <input type="hidden" name="id" value={draftId} />
        <input type="hidden" name="field" value={field} />
        <label htmlFor="revise">对写手说，改的是「{fieldLabel}」</label>
        <textarea id="revise" name="text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="改：开头再短一点" disabled={!!locked} />
        {locked && <span className="hint">{locked}</span>}
        <button className="btn-primary" type="submit" disabled={busy || !!locked} style={{ alignSelf: 'flex-end' }}>发送</button>
      </form>
    </div>
  );
}

export function ImportLegacy() {
  const [state, action, busy] = useActionState(importLegacyAction, {});
  return (
    <form action={action} className="card">
      <div className="field">
        <label htmlFor="legacy">从旧项目文件夹导入</label>
        <input id="legacy" name="path" className="mono" placeholder="/Users/你/Documents/一人工作台-素材/AI说人话-项目全量" required />
        <span className="hint">读取文件夹里的 content/选题单、content/drafts、content/灵感池.md。重复导入会跳过已有的。</span>
      </div>
      <button className="btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? '导入中…' : '导入'}</button>
      <Result s={state} />
    </form>
  );
}

export function RunRoutine({ id, label }: { id: string; label: string }) {
  const [state, action, busy] = useActionState(runRoutine, {});
  return (
    <form action={action} className="field">
      <input type="hidden" name="key" value={id} />
      <button type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? '在跑…' : label}</button>
      <Result s={state} />
    </form>
  );
}

export function ExportButton() {
  const [state, action, busy] = useActionState(exportAction, {});
  return (
    <form action={action} className="field">
      <button type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? '导出中…' : '现在导出'}</button>
      <Result s={state} />
    </form>
  );
}
