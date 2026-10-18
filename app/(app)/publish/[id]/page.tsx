import Link from 'next/link';
import { notFound } from 'next/navigation';
import { draftAction } from '@/app/actions';
import { publishPackage } from '@/lib/publish';
import { AutoRefresh } from '../../client';
import { Copy } from '../copy';

const img = (code: string, n: string) => `/api/media/${encodeURIComponent(code)}/${encodeURIComponent(n)}`;

export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const pkg = publishPackage(id);
  if (!pkg) notFound();
  const { draft: d, mp, xhs } = pkg;
  const plain = mp.html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n');

  return (
    <>
      <AutoRefresh active={!!d.job} />
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="field">
          <div className="hint"><Link href="/publish" style={{ textDecoration: 'underline' }}>发布包</Link> / <span className="mono">{d.code}</span></div>
          <h1 style={{ fontSize: 22 }}>{d.title}</h1>
        </div>
        <div className="row">
          <Link href={`/drafts/${id}`} className="btn">回到稿件</Link>
          <form action={draftAction} className="row">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="op" value="render" />
            <button type="submit" disabled={!!d.job}>{d.job === 'rendering' ? '美编在出图…' : '重新出图'}</button>
          </form>
          {d.status === 'final' && (
            <form action={draftAction} className="row">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="op" value="published" />
              <input name="url" placeholder="发布链接（可选）" aria-label="发布链接" />
              <button className="btn-primary" type="submit">发了</button>
            </form>
          )}
        </div>
      </header>
      {d.jobError && <p className="error">上次出图出错：{d.jobError}</p>}

      <section className="card" aria-labelledby="mp-h">
        <h2 id="mp-h">公众号 <span className="hint" style={{ fontWeight: 400 }}>· 电脑上操作，约 3 分钟</span></h2>
        <div className="field">
          <b>标题（选一个）</b>
          {mp.titles.map((t) => <div key={t} className="row"><span style={{ flex: 1 }}>{t}</span><Copy text={t} label="复制" /></div>)}
        </div>
        {mp.summary && <div className="row"><span className="sub" style={{ flex: 1 }}>摘要：{mp.summary}</span><Copy text={mp.summary} label="复制摘要" /></div>}
        <div className="row">
          <Copy text={plain} html={mp.html} label="复制排版好的正文" />
          <span className="hint">粘贴进公众号编辑器会保留格式</span>
        </div>
        <details>
          <summary className="hint" style={{ cursor: 'pointer' }}>预览排版</summary>
          <iframe title="公众号排版预览" srcDoc={`<body style="margin:0;padding:16px;background:#f5f6f8"><div style="max-width:578px;margin:0 auto;background:#fff">${mp.html}</div></body>`} style={{ width: '100%', height: 640, border: '1px solid var(--border)', borderRadius: 8, marginTop: 8 }} />
        </details>
        <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {mp.covers.map((n) => (
            <a key={n} href={img(d.code, n)} download={n} className="field"><img src={img(d.code, n)} alt={n} /><span className="hint">{n} · 下载</span></a>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="xhs-h">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="xhs-h">小红书 <span className="hint" style={{ fontWeight: 400 }}>· 手机上操作，约 2 分钟</span></h2>
          {xhs.cards.length > 0 && <a className="btn-primary btn" href={`/api/publish/${id}/zip`}>打包下载 {xhs.cards.length} 张卡片</a>}
        </div>
        {xhs.cards.length === 0 && <p className="sub">还没有卡片。点上面的「重新出图」让美编出。</p>}
        <div className="cards">
          {xhs.cards.map((n) => <a key={n} href={img(d.code, n)} download={n}><img src={img(d.code, n)} alt={n} /></a>)}
        </div>
        <div className="field">
          <div className="row" style={{ justifyContent: 'space-between' }}><b>正文</b><Copy text={xhs.body} label="复制正文" /></div>
          <div className="bubble" style={{ whiteSpace: 'pre-wrap' }}>{xhs.body}</div>
        </div>
        {xhs.tags && <div className="row"><span style={{ flex: 1 }}>{xhs.tags}</span><Copy text={xhs.tags} label="复制标签" /></div>}
      </section>

      <section className="card" aria-labelledby="check-h">
        <h2 id="check-h">发布前检查</h2>
        {[
          '勾选平台的「内容由 AI 辅助生成」声明（《人工智能生成合成内容标识办法》）',
          '小红书正文和图片里没有公众号名、微信号、二维码、外链',
          '公众号：自己写的长文可以声明原创；大段引用的不要声明',
          '隔很久才发的话，先让核查员复核最新数字',
        ].map((t) => <label key={t} className="row" style={{ cursor: 'pointer' }}><input type="checkbox" style={{ minHeight: 0, width: 18, height: 18 }} />{t}</label>)}
      </section>
    </>
  );
}
