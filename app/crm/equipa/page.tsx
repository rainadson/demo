/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import { HardHat, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { CreatePanel, EmptyState, FormActions, PageHeader } from '@/components/crm/page-elements';
import { createWorker, deleteWorker, updateWorker } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

type Worker = {
  id: string; name: string; kind: 'COLABORADOR' | 'PRESTADOR' | 'SUBEMPREITEIRO';
  phone: string | null; email: string | null; specialty: string | null;
  hourly_cost_cents: number; active: boolean; time_entries: { hours: number }[] | null;
};

function WorkerFields({ worker }: { worker?: Worker }) {
  return <div className="form-grid">
    <label>Nome<input name="name" required minLength={2} maxLength={200} defaultValue={worker?.name} /></label>
    <label>Tipo<select name="kind" defaultValue={worker?.kind ?? 'COLABORADOR'}>
      <option value="COLABORADOR">Colaborador</option><option value="PRESTADOR">Prestador de serviços</option><option value="SUBEMPREITEIRO">Subempreiteiro</option>
    </select></label>
    <label>Especialidade<input name="specialty" maxLength={160} defaultValue={worker?.specialty ?? ''} /></label>
    <label>Custo/hora (€)<input name="hourly_cost" type="number" min="0" step="0.01" defaultValue={worker ? worker.hourly_cost_cents / 100 : 0} required /></label>
    <label>Telemóvel<input name="phone" type="tel" maxLength={40} defaultValue={worker?.phone ?? ''} /></label>
    <label>Email<input name="email" type="email" maxLength={254} defaultValue={worker?.email ?? ''} /></label>
    {worker && <label>Estado<select name="active" defaultValue={String(worker.active)}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>}
  </div>;
}

export default async function TeamPage() {
  const identity = await requirePermission('workers');
  const db = await getSupabase();
  const { data, error } = db ? await db.from('workers')
    .select('id,name,kind,phone,email,specialty,hourly_cost_cents,active,time_entries(hours)')
    .eq('company_id', identity.companyId).order('active', { ascending: false }).order('name')
    : { data: [], error: null };
  const workers = (data ?? []) as Worker[];
  return <main className="crm-page">
    <PageHeader eyebrow="OPERAÇÕES" title="Equipa" description="Colaboradores, prestadores, subempreiteiros, especialidades e custos horários.">
      <CreatePanel title="Adicionar à equipa" description="Registe um colaborador ou parceiro">
        <form action={createWorker} className="crm-form"><WorkerFields /><FormActions label="Adicionar elemento" /></form>
      </CreatePanel>
    </PageHeader>
    {error ? <div className="crm-error">Não foi possível carregar a equipa.</div> : workers.length === 0 ?
      <EmptyState icon={HardHat} title="A equipa ainda está vazia." description="Adicione colaboradores, prestadores e subempreiteiros." /> :
      <section className="people-grid">{workers.map((worker) => <article key={worker.id} className={!worker.active ? 'record-inactive' : undefined}>
        <div className="person-avatar">{worker.name.split(' ').slice(0, 2).map((value) => value[0]).join('')}</div>
        <div><StatusBadge status={worker.active ? worker.kind : 'INATIVO'} /><h2>{worker.name}</h2><p>{worker.specialty ?? 'Especialidade por definir'}</p></div>
        <dl><div><dt>Custo/hora</dt><dd>{formatMoney(worker.hourly_cost_cents)}</dd></div><div><dt>Horas registadas</dt><dd>{(worker.time_entries ?? []).reduce((total, entry) => total + Number(entry.hours), 0).toFixed(1)} h</dd></div></dl>
        <footer>{worker.phone && <span><Phone size={14} />{worker.phone}</span>}{worker.email && <span><Mail size={14} />{worker.email}</span>}</footer>
        <details className="crud-details"><summary><Pencil size={15} /> Editar</summary><ClosePanelButton />
          <form key={`${worker.name}-${worker.kind}-${worker.active}`} action={updateWorker} className="crm-form"><input type="hidden" name="id" value={worker.id} /><WorkerFields worker={worker} /><FormActions label="Atualizar elemento" /></form>
          <form action={deleteWorker} className="crud-delete"><input type="hidden" name="id" value={worker.id} /><button type="submit"><Trash2 size={15} /> Excluir definitivamente</button></form>
        </details>
      </article>)}</section>}
  </main>;
}
