'use client';

import { useActionState, useRef } from 'react';
import { addSkillAction, type ActionState } from '@/app/actions';
import { PROMPT_GUIDE } from '@/lib/skills-catalog';

function Result({ s }: { s: ActionState }) {
  if (s.error) return <p className="error">{s.error}</p>;
  if (s.ok) return <span className="pill pill-ok">{s.ok}</span>;
  return null;
}

// The prompt textarea, with the writing guide and a one-click recommended version.
export function PromptEditor({ value, recommended }: { value: string; recommended?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="field">
      <label htmlFor="prompt">角色说明（提示词）</label>
      <textarea id="prompt" name="prompt" rows={12} defaultValue={value} ref={ref} />
      <details className="guide">
        <summary>推荐写法</summary>
        <div className="guide-body">
          <p className="sub">按五段写，每段一两行就够。品牌设置会自动加在最前面，skill 会自动加在最后面，这里不用重复。</p>
          <ol>
            {PROMPT_GUIDE.map(([k, v]) => <li key={k}><b>【{k}】</b>{v}</li>)}
          </ol>
          <p className="sub">写好的提示词有三个特点：要求具体到能检查（「每张不超过 80 字」而不是「简洁」）；先写要做什么，再写不要做什么；最重要的规则只写一遍，不要到处强调。</p>
          {recommended && (
            <div className="row">
              <button type="button" onClick={() => { if (ref.current) ref.current.value = recommended; }}>用推荐版本替换</button>
              <span className="hint">替换后点「保存」才会生效</span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export function AddFromCatalog({ agentId, catalogId, hasRaw }: { agentId: string; catalogId: string; hasRaw: boolean }) {
  const [state, action, busy] = useActionState(addSkillAction, {});
  return (
    <form action={action} className="row">
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="mode" value="catalog" />
      <input type="hidden" name="catalogId" value={catalogId} />
      <button className="btn-primary" type="submit" name="full" value="0" disabled={busy}>添加精简版</button>
      {hasRaw && <button type="submit" name="full" value="1" disabled={busy}>导入完整原文</button>}
      {busy && <span className="hint">处理中…</span>}
      <Result s={state} />
    </form>
  );
}

export function ImportSkill({ agentId }: { agentId: string }) {
  const [state, action, busy] = useActionState(addSkillAction, {});
  return (
    <form action={action} className="field">
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="mode" value="url" />
      <label htmlFor="skill-url">从 GitHub 导入</label>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id="skill-url" name="url" className="mono" placeholder="https://github.com/作者/仓库/blob/main/skills/xxx/SKILL.md" style={{ flex: 1, minWidth: 0 }} />
        <button type="submit" disabled={busy}>{busy ? '导入中…' : '导入'}</button>
      </div>
      <span className="hint">贴 SKILL.md 文件、或 skill 所在文件夹的链接都行。导入后可以在上面改内容。</span>
      <Result s={state} />
    </form>
  );
}

export function CustomSkill({ agentId }: { agentId: string }) {
  const [state, action, busy] = useActionState(addSkillAction, {});
  return (
    <form action={action} className="field">
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="mode" value="custom" />
      <label htmlFor="skill-name">自己写一个</label>
      <input id="skill-name" name="name" placeholder="名称，比如「标题公式」" />
      <textarea name="content" rows={5} aria-label="skill 内容" placeholder={'写成可以照着做的步骤或清单，例如：\n1. 标题不超过 20 字\n2. 必须带一个数字\n3. 不用问号开头'} />
      <span className="hint">好的 skill = 什么时候用 + 具体步骤或检查清单 + 一个例子。只写这个 agent 会反复用到的方法，不写一次性的任务。</span>
      <button type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>添加</button>
      <Result s={state} />
    </form>
  );
}
