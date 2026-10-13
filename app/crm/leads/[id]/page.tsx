import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/config';
import { addLeadNote, changeLeadStatus, deleteLead, updateLead } from '@/features/leads/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClosePanelButton } from '@/components/crm/close-panel-button';
import { FormActions } from '@/components/crm/page-elements';
const statuses = [
  ['NOVO', 'Novo'],
  ['CONTACTADO', 'Contactado'],
  ['QUALIFICADO', 'Qualificado'],
  ['VISITA_AGENDADA', 'Visita agendada'],
  ['VISITA_REALIZADA', 'Visita realizada'],
  ['ORCAMENTO', 'Orçamento'],
  ['PROPOSTA_ENVIADA', 'Proposta enviada'],
  ['NEGOCIACAO', 'Negociação'],
  ['GANHO', 'Ganho'],
  ['PERDIDO', 'Perdido'],
];
function localDateTime(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
}
type Activity = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
};
export default async function LeadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) notFound();
  const [{ data: lead }, { data: activities }] = await Promise.all([
    db
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('company_id', identity.companyId)
      .single(),
    db
      .from('lead_activities')
      .select('id,kind,body,created_at')
      .eq('lead_id', id)
      .eq('company_id', identity.companyId)
      .order('created_at', { ascending: false }),
  ]);
  if (!lead) notFound();
  return (
    <main className="crm-page">
      <Link className="back-link" href="/crm/leads">
        <ArrowLeft size={17} />
        Voltar aos leads
      </Link>
      <div className="lead-title">
        <div>
          <StatusBadge status={lead.status} />
          <h1>{lead.name}</h1>
          <p>
            {lead.service} · {lead.location ?? 'Localização por definir'}
          </p>
        </div>
        <form action={changeLeadStatus}>
          <input type="hidden" name="leadId" value={lead.id} />
          <label htmlFor="status">Etapa</label>
          <select id="status" name="status" defaultValue={lead.status}>
            {statuses.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit">Atualizar</Button>
        </form>
      </div>
      <details className="crud-details detail-crud"><summary><Pencil size={15} /> Editar lead</summary><ClosePanelButton />
        <form action={updateLead} className="crm-form"><input type="hidden" name="id" value={lead.id} /><div className="form-grid">
          <label>Nome<input name="name" required defaultValue={lead.name} /></label><label>Serviço<input name="service" required defaultValue={lead.service} /></label>
          <label>Telemóvel<input name="phone" type="tel" defaultValue={lead.phone ?? ''} /></label><label>Email<input name="email" type="email" defaultValue={lead.email ?? ''} /></label>
          <label>Localização<input name="location" defaultValue={lead.location ?? ''} /></label><label>Prioridade<select name="priority" defaultValue={lead.priority}><option>BAIXA</option><option>NORMAL</option><option>ALTA</option></select></label>
          <label>Valor estimado (€)<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={Number(lead.estimated_value_cents ?? 0) / 100} /></label>
          <label>Próxima ação<input name="next_action" defaultValue={lead.next_action ?? ''} /></label><label>Data da próxima ação<input name="next_action_at" type="datetime-local" defaultValue={localDateTime(lead.next_action_at)} /></label>
          <label className="span-2">Descrição<textarea name="description" rows={4} defaultValue={String(lead.details?.description ?? '')} /></label>
        </div><FormActions label="Atualizar lead" /></form>
        <form action={deleteLead} className="crud-delete"><input type="hidden" name="id" value={lead.id} /><button type="submit"><Trash2 size={15} /> Excluir lead definitivamente</button></form>
      </details>
      <div className="lead-layout">
        <section className="lead-info">
          <h2>Informação</h2>
          <dl>
            <div>
              <dt>Telemóvel</dt>
              <dd>{lead.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{lead.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Origem</dt>
              <dd>{lead.source}</dd>
            </div>
            <div>
              <dt>Prioridade</dt>
              <dd>{lead.priority}</dd>
            </div>
            <div>
              <dt>Entrada</dt>
              <dd>{formatDate(lead.created_at)}</dd>
            </div>
          </dl>
          {lead.details?.description && (
            <>
              <h3>Descrição</h3>
              <p>{String(lead.details.description)}</p>
            </>
          )}
        </section>
        <section className="lead-timeline">
          <h2>Atividade</h2>
          <form action={addLeadNote}>
            <input type="hidden" name="leadId" value={lead.id} />
            <label htmlFor="note">Nova nota</label>
            <Textarea id="note" name="body" required maxLength={5000} />
            <Button type="submit">Guardar nota</Button>
          </form>
          {((activities ?? []) as Activity[]).length === 0 ? (
            <div className="crm-empty">
              <MessageSquare />
              <p>Ainda não existe atividade.</p>
            </div>
          ) : (
            <ol>
              {((activities ?? []) as Activity[]).map((activity) => (
                <li key={activity.id}>
                  <span />
                  <div>
                    <strong>{activity.kind.replaceAll('_', ' ')}</strong>
                    <p>{activity.body}</p>
                    <time>{formatDate(activity.created_at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
