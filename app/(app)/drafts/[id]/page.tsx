import Link from 'next/link';
import { notFound } from 'next/navigation';
import { diffLines } from 'diff';
import { draftAction } from '@/app/actions';
import { FIELD_LABEL, getDraft, type Field } from '@/lib/drafts';
import { draftImages } from '@/lib/legacy';
import { JOB_LABEL, STATUS_LABEL, thread } from '@/lib/view';
import { AutoRefresh, DraftChat } from '../../client';

const TABS = [['mp', '公众号'], ['xhs', '小红书'], ['sources', '来源'], ['check', '核查'], ['cards', '卡片']] as const;
type Tab = (typeof TABS)[number][0];

function Op({ id, op, label, primary, extra }: { id: number; op: string; label: string; primary?: boolean; extra?: React.ReactNode }) {
  return (
    <form action={draftAction} className="row">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      {extra}
      <button className={primary ? 'btn-primary' : undefined} type="submit">{label}</button>
    </form>
  );
}

export default async function DraftPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const id = Number((await params).id);
  const d = getDraft(id);
  if (!d) notFound();
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find(([t]) => t === asked)?.[0] ?? 'mp';
  const field: Field = tab === 'xhs' || tab === 'sources' ? tab : 'mp';
  const images = tab === 'cards' ? draftImages(d.code) : [];
  const pendingHere = d.pendingField === field && (tab === 'mp' || tab === 'xhs' || tab === 'sources');
  const locked = d.job ? `${JOB_LABEL[d.job]}，稍等` : d.pendingField ? `「${FIELD_LABEL[d.pendingField]}」有一处改动等你接受或撤销` : '';

  return (
    <>
      <AutoRefresh active={!!d.job} />
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="field">
          <div className="hint"><Link href="/drafts" style={{ textDecoration: 'underline' }}>稿件</Link> / <span className="mono">{d.code}</span></div>
          <h1 style={{ fontSize: 22 }}>{d.title}</h1>
          {d.angle && <p className="sub">角度：{d.angle}</p>}
        </div>
        <div className="row">
          <span className={`pill ${d.status === 'final' ? 'pill-ok' : 'pill-week'}`}>{STATUS_LABEL[d.status]}</span>
          {d.job && <span className="pill pill-accent">{JOB_LABEL[d.job]}…</span>}
          {d.status === 'draft' && <Op id={id} op="final" label="通过，定稿" primary />}
          {d.status === 'final' && (
            <>
              <Op id={id} op="published" label="发了" primary extra={<input name="url" placeholder="发布链接（可选）" aria-label="发布链接" />} />
              <Op id={id} op="reopen" label="撤回定稿" />
            </>
          )}
          {d.status === 'published' && d.publishedUrl && <a href={d.publishedUrl} className="btn" target="_blank" rel="noreferrer">看已发布</a>}
        </div>
      </header>
      {d.jobError && <p className="error">上次任务出错：{d.jobError}</p>}

      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <section className="card" style={{ flex: '999 1 520px', minWidth: 0, padding: 0, gap: 0 }} aria-label="稿件内容">
          <nav className="tabs" aria-label="稿件版本">
            {TABS.map(([t, label]) => (
              <Link key={t} href={`?tab=${t}`} aria-current={t === tab ? 'page' : undefined} className={t === tab ? 'on' : undefined}>
                {label}{t === 'cards' && images.length ? ` ${images.length}` : ''}
              </Link>
            ))}
          </nav>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pendingHere && (
              <div className="pending">
                <b>写手的改动（绿色是新加的，划线是删掉的）</b>
                <div className="diff">
                  {diffLines(d[field], d.pendingContent).map((p, i) => (
                    <span key={i} className={p.added ? 'add' : p.removed ? 'del' : undefined}>{p.value}</span>
                  ))}
                </div>
                <div className="row">
                  <Op id={id} op="accept" label="接受" primary />
                  <Op id={id} op="reject" label="撤销" />
                </div>
              </div>
            )}
            {(tab === 'mp' || tab === 'xhs' || tab === 'sources') && (
              <form action={draftAction} className="field" key={`${field}-${d.updatedAt}`}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="op" value="save" />
                <input type="hidden" name="field" value={field} />
                <label htmlFor="editor" className="sr-only">{FIELD_LABEL[field]}</label>
                <textarea id="editor" name="value" rows={28} defaultValue={d[field]} disabled={!!d.job} placeholder={d.job ? '写手正在写，内容会陆续出现…' : ''} />
                <button type="submit" disabled={!!d.job} style={{ alignSelf: 'flex-end' }}>保存手改</button>
              </form>
            )}
            {tab === 'check' && (
              <>
                <div className="bubble" style={{ whiteSpace: 'pre-wrap' }}>{d.checkReport || '还没有核查报告。'}</div>
                {!d.job && <Op id={id} op="check" label="让核查员再查一遍" />}
              </>
            )}
            {tab === 'cards' && (
              images.length ? (
                <div className="cards">
                  {images.map((n) => <img key={n} src={`/api/media/${encodeURIComponent(d.code)}/${encodeURIComponent(n)}`} alt={n} />)}
                </div>
              ) : <p className="sub">还没有卡片。美编出图在第 3 步接上。</p>
            )}
          </div>
        </section>

        <aside className="card" style={{ flex: '1 1 340px', minWidth: 0 }} aria-labelledby="chat-h">
          <h2 id="chat-h">编辑部 <span className="hint" style={{ fontWeight: 400 }}>· 这篇稿的对话</span></h2>
          <DraftChat draftId={id} field={field} fieldLabel={FIELD_LABEL[field]} messages={thread(`draft:${id}`)} locked={locked} />
        </aside>
      </div>
    </>
  );
}
