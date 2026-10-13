import Link from 'next/link';
import { Columns3, List, Users } from 'lucide-react';
import { CreatePanel, FormActions } from '@/components/crm/page-elements';
import { createLead } from '@/features/leads/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/config';
const stages = [
  'NOVO',
  'CONTACTADO',
  'QUALIFICADO',
  'VISITA_AGENDADA',
  'VISITA_REALIZADA',
  'ORCAMENTO',
  'PROPOSTA_ENVIADA',
  'NEGOCIACAO',
  'GANHO',
  'PERDIDO',
];
type Lead = {
  id: string;
  name: string;
  service: string;
  location: string | null;
  status: string;
  priority: string;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
};
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const identity = await requirePermission('leads');
  const { vista } = await searchParams;
  const db = await getSupabase();
  const { data, error } = db
    ? await db
        .from('leads')
        .select(
          'id,name,service,location,status,priority,next_action,next_action_at,created_at',
        )
        .eq('company_id', identity.companyId)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [], error: null };
  const leads = (data ?? []) as Lead[];
  return (
    <main className="crm-page">
      <div className="crm-page-header">
        <div>
          <p className="eyebrow">COMERCIAL</p>
          <h1>Leads</h1>
          <p>
            {leads.length}{' '}
            {leads.length === 1 ? 'oportunidade' : 'oportunidades'} no pipeline.
          </p>
        </div>
        <div className="header-actions lead-actions">
          <div className="view-switch">
            <Link href="/crm/leads">
              <List size={17} />
              Tabela
            </Link>
            <Link href="/crm/leads?vista=kanban">
              <Columns3 size={17} />
              Kanban
            </Link>
          </div>
          <CreatePanel title="Novo lead" description="Cadastrar oportunidade manualmente">
            <form action={createLead} className="crm-form">
              <div className="form-grid">
                <label>Nome<input name="name" required minLength={2} /></label>
                <label>Serviço<input name="service" required minLength={2} placeholder="Ex.: remodelação" /></label>
                <label>Telefone<input name="phone" type="tel" /></label>
                <label>Email<input name="email" type="email" /></label>
                <label className="span-2">Localização<input name="location" /></label>
                <label>Prioridade<select name="priority" defaultValue="NORMAL"><option value="BAIXA">Baixa</option><option value="NORMAL">Normal</option><option value="ALTA">Alta</option></select></label>
                <label>Valor estimado (€)<input name="estimated_value" type="number" min="0" step="0.01" /></label>
                <label>Próxima ação<input name="next_action" placeholder="Ex.: ligar ao cliente" /></label>
                <label>Data da próxima ação<input name="next_action_at" type="datetime-local" /></label>
                <label className="span-2">Descrição<textarea name="description" rows={4} maxLength={3000} /></label>
              </div>
              <FormActions label="Criar lead" />
            </form>
          </CreatePanel>
        </div>
      </div>
      {error ? (
        <div className="crm-error">Não foi possível carregar os leads.</div>
      ) : leads.length === 0 ? (
        <div className="crm-empty large">
          <Users />
          <h2>Ainda não existem leads.</h2>
          <p>Cadastre uma oportunidade manualmente ou receba pedidos pelo site.</p>
        </div>
      ) : vista === 'kanban' ? (
        <section className="lead-kanban">
          {stages.map((stage) => (
            <div className="kanban-column" key={stage}>
              <div>
                <StatusBadge status={stage} />
                <span>
                  {leads.filter((lead) => lead.status === stage).length}
                </span>
              </div>
              {leads
                .filter((lead) => lead.status === stage)
                .map((lead) => (
                  <Link href={`/crm/leads/${lead.id}`} key={lead.id}>
                    <strong>{lead.name}</strong>
                    <span>{lead.service}</span>
                    <small>{lead.location ?? 'Localização por definir'}</small>
                  </Link>
                ))}
            </div>
          ))}
        </section>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Serviço</th>
                <th>Localização</th>
                <th>Estado</th>
                <th>Próxima ação</th>
                <th>Entrada</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/crm/leads/${lead.id}`}>{lead.name}</Link>
                  </td>
                  <td>{lead.service}</td>
                  <td>{lead.location ?? '—'}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>{lead.next_action ?? '—'}</td>
                  <td>{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
