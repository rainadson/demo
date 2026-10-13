import { company } from '@/lib/config';
import { requireIdentity } from '@/lib/auth/session';
import { signOut } from '@/features/auth/actions';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
export default async function ClientPortal() {
  const identity = await requireIdentity('cliente');
  return <main className="workspace"><header className="workspace-header"><Brand /><form action={signOut}><Button variant="outline">Terminar sessão</Button></form></header><p className="eyebrow">PORTAL DO CLIENTE</p><h1>Bem-vindo, {identity.fullName}.</h1><div className="empty-state"><h2>O acompanhamento da sua obra está em preparação.</h2><p>A {company.shortName} disponibilizará aqui as informações da sua obra.</p></div></main>;
}
