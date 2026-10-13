/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import { CalendarDays, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createVisit, deleteVisit, updateVisit } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

function localDateTime(value: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
}

export default async function AgendaPage() {
  const identity = await requirePermission('visits');
  const db = await getSupabase();
  const [visitsResult, leadsResult, clientsResult] = db
    ? await Promise.all([
        db
          .from('visits')
          .select(
            'id,address,starts_at,status,notes,leads(id,name),clients(id,name),profiles(full_name)',
          )
          .eq('company_id', identity.companyId)
          .order('starts_at')
          .limit(200),
        db
          .from('leads')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .not('status', 'in', '("GANHO","PERDIDO")')
          .order('name'),
        db
          .from('clients')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }, { data: [] }];
  const visits = (visitsResult.data ?? []) as Record<string, unknown>[];
  const leads = leadsResult.data ?? [];
  const clients = clientsResult.data ?? [];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMERCIAL"
        title="Agenda e visitas"
        description="Visitas técnicas, reuniões e compromissos comerciais."
      >
        <CreatePanel
          title="Agendar visita"
          description="Associe a um lead ou cliente"
        >
          <form action={createVisit} className="crm-form">
            <div className="form-grid">
              <label>
                Lead
                <select name="lead_id">
                  <option value="">Selecionar</option>
                  {leads.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cliente
                <select name="client_id">
                  <option value="">Selecionar</option>
                  {clients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Morada
                <input name="address" required />
              </label>
              <label>
                Data e hora
                <input name="starts_at" type="datetime-local" required />
              </label>
              <label className="span-2">
                Notas
                <textarea name="notes" rows={3} />
              </label>
            </div>
            <FormActions label="Agendar visita" />
          </form>
        </CreatePanel>
      </PageHeader>
      {visitsResult.error ? (
        <div className="crm-error">Não foi possível carregar a agenda.</div>
      ) : visits.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sem visitas agendadas."
          description="Agende uma visita a partir de um lead ou cliente."
        />
      ) : (
        <section className="agenda-board">
          {visits.map((visit) => {
            const person =
              (visit.leads as { name?: string } | null)?.name ??
              (visit.clients as { name?: string } | null)?.name ??
              'Contacto';
            const date = new Date(String(visit.starts_at));
            return (
              <article key={String(visit.id)}>
                <div className="agenda-date">
                  <strong>
                    {new Intl.DateTimeFormat('pt-PT', {
                      day: '2-digit',
                      timeZone: 'Europe/Lisbon',
                    }).format(date)}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat('pt-PT', {
                      month: 'short',
                      timeZone: 'Europe/Lisbon',
                    }).format(date)}
                  </span>
                </div>
                <div className="agenda-main">
                  <div>
                    <StatusBadge status={String(visit.status)} />
                    <h2>{person}</h2>
                  </div>
                  <p>
                    <Clock3 size={15} />
                    {new Intl.DateTimeFormat('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Lisbon',
                    }).format(date)}{' '}
                    <MapPin size={15} />
                    {String(visit.address)}
                  </p>
                  {Boolean(visit.notes) && <small>{String(visit.notes)}</small>}
                  <details className="crud-details"><summary><Pencil size={14} /> Editar</summary><ClosePanelButton />
                    <form action={updateVisit} className="crm-form"><input type="hidden" name="id" value={String(visit.id)} /><div className="form-grid">
                      <label>Lead<select name="lead_id" defaultValue={String((visit.leads as { id?: string } | null)?.id ?? '')}><option value="">Selecionar</option>{leads.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label>Cliente<select name="client_id" defaultValue={String((visit.clients as { id?: string } | null)?.id ?? '')}><option value="">Selecionar</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label className="span-2">Morada<input name="address" required defaultValue={String(visit.address)} /></label><label>Data e hora<input name="starts_at" type="datetime-local" required defaultValue={localDateTime(String(visit.starts_at))} /></label>
                      <label>Estado<select name="status" defaultValue={String(visit.status)}><option>AGENDADA</option><option>CONFIRMADA</option><option>REALIZADA</option><option>CANCELADA</option></select></label>
                      <label className="span-2">Notas<textarea name="notes" rows={3} defaultValue={String(visit.notes ?? '')} /></label>
                    </div><FormActions label="Atualizar visita" /></form>
                    <form action={deleteVisit} className="crud-delete"><input type="hidden" name="id" value={String(visit.id)} /><button type="submit"><Trash2 size={14} /> Excluir visita</button></form>
                  </details>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
