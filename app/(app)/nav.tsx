'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '今天' },
  { label: '灵感池', step: 2 },
  { label: '选题单', step: 2 },
  { label: '稿件', step: 2 },
  { label: '发布包', step: 3 },
  { label: '排期', step: 4 },
  null,
  { href: '/agents', label: 'Agent' },
  { href: '/settings', label: '设置' },
];

export function Nav({ account }: { account: string }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="主导航">
      <div className="brand">
        一人工作台
        <div className="hint" style={{ fontWeight: 400 }}>账号：{account || '未设置'}</div>
      </div>
      {LINKS.map((l, i) => {
        if (!l) return <hr key={i} />;
        if (!l.href) return <span key={l.label}>{l.label}<small>第 {l.step} 步</small></span>;
        const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
