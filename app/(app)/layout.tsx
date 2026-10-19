import { getBrand } from '@/lib/prompt';
import { Nav } from './nav';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Nav account={getBrand().name ?? ''} />
      <main className="main">{children}</main>
    </div>
  );
}
