import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  HardHat,
  Pencil,
  ReceiptText,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { FormActions, Metric, ProgressBar } from '@/components/crm/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { deleteProject, updateProject } from '@/features/crm/actions';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requirePermission('projects');
  const db = await getSupabase();
  if (!db) notFound();
  const [
    { data: project },
    { data: tasks },
    { data: expenses },
    { data: schedules },
    { data: phases },
    { data: logs },
    { data: clients },
  ] = await Promise.all([
    db
      .from('projects')
      .select(
        '*,clients(id,name,phone,email),profiles(full_name),project_financials(contracted_cents,estimated_cost_cents)',
      )
      .eq('id', id)
      .eq('company_id', identity.companyId)
      .single(),
    db
      .from('tasks')
      .select('id,title,status,priority,due_on')
      .eq('project_id', id)
      .eq('company_id', identity.companyId)
      .order('due_on'),
    db
      .from('expenses')
      .select('id,description,category,total_cents,spent_on')
      .eq('project_id', id)
      .eq('company_id', identity.companyId)
      .order('spent_on', { ascending: false }),
    db
      .from('payment_schedules')
      .select(
        'id,description,amount_cents,due_on,status,payments(amount_cents)',
      )
      .eq('project_id', id)
      .eq('company_id', identity.companyId)
      .order('due_on'),
    db
      .from('project_phases')
      .select('id,name,status,progress,position')
      .eq('project_id', id)
      .eq('company_id', identity.companyId)
      .order('position'),
    db
      .from('daily_logs')
      .select('id,logged_on,summary,weather,workers_count')
      .eq('project_id', id)
      .eq('company_id', identity.companyId)
      .order('logged_on', { ascending: false })
      .limit(10),
    db.from('clients').select('id,name').eq('company_id', identity.companyId).order('name'),
  ]);
  if (!project) notFound();
  const financial = Array.isArray(project.project_financials)
    ? project.project_financials[0]
    : project.project_financials;
  const revenue = Number(financial?.contracted_cents ?? 0);
  const budget = Number(financial?.estimated_cost_cents ?? 0);
  const spent = (expenses ?? []).reduce((t, e) => t + Number(e.total_cents), 0);
  const received = (schedules ?? []).reduce(
    (t, s) =>
      t +
      (s.payments ?? []).reduce(
        (a: number, p: { amount_cents: number }) => a + Number(p.amount_cents),
        0,
      ),
    0,
  );
  const margin = revenue - spent;
  return (
    <main className="crm-page">
      <Link className="back-link" href="/crm/obras">
        <ArrowLeft size={16} />
        Voltar às obras
      </Link>
      <div className="detail-hero project-detail-hero">
        <div>
          <StatusBadge status={project.status} />
          <h1>{project.name}</h1>
          <p>
            {project.clients?.name} · {project.address ?? 'Morada por definir'}
          </p>
        </div>
        <div className="project-overall">
          <strong>{Math.round(Number(project.progress))}%</strong>
          <ProgressBar
            value={Number(project.progress)}
            label="Progresso global"
          />
        </div>
      </div>
      <details className="crud-details detail-crud"><summary><Pencil size={15} /> Editar obra</summary><ClosePanelButton />
        <form action={updateProject} className="crm-form"><input type="hidden" name="id" value={project.id} /><div className="form-grid">
          <label className="span-2">Nome da obra<input name="name" required defaultValue={project.name} /></label><label>Cliente<select name="client_id" required defaultValue={project.client_id}>{(clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label className="span-2">Morada<input name="address" defaultValue={project.address ?? ''} /></label><label>Início<input name="starts_on" type="date" defaultValue={project.starts_on ?? ''} /></label><label>Entrega prevista<input name="ends_on" type="date" defaultValue={project.ends_on ?? ''} /></label>
          <label>Progresso (%)<input name="progress" type="number" min="0" max="100" step="1" required defaultValue={Number(project.progress)} /></label><label>Valor contratado (€)<input name="contracted" type="number" min="0" step="0.01" required defaultValue={revenue / 100} /></label><label>Custo previsto (€)<input name="estimated_cost" type="number" min="0" step="0.01" required defaultValue={budget / 100} /></label>
        </div><FormActions label="Atualizar obra" /></form>
        <form action={deleteProject} className="crud-delete"><input type="hidden" name="id" value={project.id} /><button type="submit"><Trash2 size={15} /> Excluir obra definitivamente</button></form>
      </details>
      <section className="executive-grid compact">
        <Metric label="Valor contratado" value={formatMoney(revenue)} />
        <Metric
          label="Recebido"
          value={formatMoney(received)}
          tone="positive"
        />
        <Metric
          label="Custo realizado"
          value={formatMoney(spent)}
          tone="warning"
        />
        <Metric
          label="Margem atual"
          value={formatMoney(margin)}
          detail={
            revenue
              ? `${((margin / revenue) * 100).toFixed(1).replace('.', ',')}%`
              : '—'
          }
          tone={margin < 0 ? 'danger' : 'positive'}
        />
      </section>
      <div className="project-detail-grid">
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CRONOGRAMA</p>
              <h2>Fases da obra</h2>
            </div>
            <CalendarDays />
          </div>
          {phases?.length ? (
            <div className="phase-list">
              {phases.map((phase) => (
                <article key={phase.id}>
                  <span>{String(phase.position).padStart(2, '0')}</span>
                  <div>
                    <div>
                      <strong>{phase.name}</strong>
                      <StatusBadge status={phase.status} />
                    </div>
                    <ProgressBar value={Number(phase.progress)} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <CalendarDays />
              <p>Sem fases definidas.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">EXECUÇÃO</p>
              <h2>Tarefas</h2>
            </div>
            <ClipboardCheck />
          </div>
          {tasks?.length ? (
            <div className="compact-list">
              {tasks.slice(0, 8).map((task) => (
                <article key={task.id}>
                  <span
                    className={`priority-dot priority-${task.priority.toLowerCase()}`}
                  />
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.due_on ? formatDate(task.due_on) : 'Sem prazo'}
                    </small>
                  </div>
                  <StatusBadge status={task.status} />
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <ClipboardCheck />
              <p>Sem tarefas nesta obra.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CUSTOS</p>
              <h2>Despesas recentes</h2>
            </div>
            <ReceiptText />
          </div>
          {expenses?.length ? (
            <div className="compact-list">
              {expenses.slice(0, 8).map((expense) => (
                <article key={expense.id}>
                  <ReceiptText />
                  <div>
                    <strong>{expense.description}</strong>
                    <small>
                      {expense.category.replaceAll('_', ' ')} ·{' '}
                      {formatDate(expense.spent_on)}
                    </small>
                  </div>
                  <b>{formatMoney(expense.total_cents)}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <ReceiptText />
              <p>Sem despesas nesta obra.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">DIÁRIO</p>
              <h2>Últimos registos</h2>
            </div>
            <HardHat />
          </div>
          {logs?.length ? (
            <div className="timeline-compact">
              {logs.map((log) => (
                <article key={log.id}>
                  <time>{formatDate(log.logged_on)}</time>
                  <div>
                    <strong>{log.summary}</strong>
                    <small>
                      {log.weather ?? 'Tempo não registado'} ·{' '}
                      {log.workers_count ?? 0} pessoas
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <HardHat />
              <p>O diário ainda não tem registos.</p>
            </div>
          )}
        </section>
      </div>
      <section className="profit-banner">
        <TrendingUp />
        <div>
          <p className="eyebrow">CONTROLO DE RENTABILIDADE</p>
          <h2>{formatMoney(margin)} de margem atual</h2>
          <p>
            Contrato {formatMoney(revenue)} · custo previsto{' '}
            {formatMoney(budget)} · realizado {formatMoney(spent)}
          </p>
        </div>
        <ProgressBar
          value={budget ? (spent / budget) * 100 : 0}
          label="Consumo do custo previsto"
        />
      </section>
    </main>
  );
}
