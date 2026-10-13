import { requireIdentity } from '@/lib/auth/session';
import { CrmShell } from '@/components/crm-shell';
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const identity=await requireIdentity('crm');
  return <CrmShell identity={identity}>{children}</CrmShell>;
}
