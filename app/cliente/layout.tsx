import { requireIdentity } from '@/lib/auth/session';
export default async function ClientLayout({ children }: { children: React.ReactNode }) { await requireIdentity('cliente'); return children; }
