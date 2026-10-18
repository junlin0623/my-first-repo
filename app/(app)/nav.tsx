'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '今天' },
  { href: '/ideas', label: '灵感池' },
  { href: '/topics', label: '选题单' },
  { href: '/drafts', label: '稿件' },
  { href: '/publish', label: '发布包' },
  { href: '/schedule', label: '排期' },
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
