import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, sessionToken } from '@/lib/session';

async function login(formData: FormData) {
  'use server';
  const expected = process.env.APP_PASSWORD;
  if (!expected || formData.get('password') !== expected) redirect('/login?error=1');
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  redirect('/');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!process.env.APP_PASSWORD) redirect('/');
  const { error } = await searchParams;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form action={login} className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: 22 }}>一人工作台</h1>
        <div className="field">
          <label htmlFor="password">访问密码</label>
          <input id="password" name="password" type="password" autoFocus required />
          <span className="hint">密码在 .env.local 的 APP_PASSWORD 里</span>
        </div>
        {error && <p className="error">密码不对</p>}
        <button className="btn-primary" type="submit">进入</button>
      </form>
    </main>
  );
}
