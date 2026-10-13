/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock3,
} from 'lucide-react';
import { canAccess } from '@/lib/auth/permissions';
import { requireIdentity } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import {
  Metric,
  PageHeader,
  ProgressBar,
} from '@/components/crm/page-elements';
import { StatusBadge } from '@/components/status-badge';

type Attention = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  date: string | null;
  urgent: boolean;
};
const sum = (
  rows: Record<string, unknown>[] | null | undefined,
  field: string,
) => (rows ?? []).reduce((total, row) => total + (Number(row[field]) || 0), 0);

export default async function Crm() {
  const identity = await requireIdentity('crm');
  const db = await getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const results = db
    ? await Promise.all([
        db
          .from('leads')
          .select(
            'id,name,status,next_action,next_action_at,estimated_value_cents',
          )
          .eq('company_id', identity.companyId)
          .order('created_at', { ascending: false })
          .limit(250),
        db
          .from('projects')
          .select(
            'id,name,status,progress,ends_on,project_financials(contracted_cents,estimated_cost_cents)',
          )
          .eq('company_id', identity.companyId)
          .limit(200),
        db
          .from('expenses')
          .select('total_cents,spent_on,project_id')
          .eq('company_id', identity.companyId)
          .gte('spent_on', monthStart.toISOString().slice(0, 10))
          .limit(1000),
        db
          .from('payments')
          .select('amount_cents,received_on')
          .eq('company_id', identity.companyId)
          .gte('received_on', monthStart.toISOString().slice(0, 10))
          .limit(1000),
        db
          .from('payment_schedules')
          .select('id,description,amount_cents,due_on,status,projects(name)')
          .eq('company_id', identity.companyId)
          .in('status', ['PENDENTE', 'ATRASADO'])
          .order('due_on')
          .limit(20),
        db
          .from('tasks')
          .select('id,title,due_on,status,priority,projects(name)')
          .eq('company_id', identity.companyId)
          .neq('status', 'CONCLUIDA')
          .lte('due_on', today)
          .order('due_on')
          .limit(12),
        db
          .from('visits')
          .select('id,address,starts_at,status,leads(name),clients(name)')
          .eq('company_id', identity.companyId)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(5),
        db
          .from('quote_versions')
          .select('total_cents,quotes!inner(status,company_id)')
          .eq('quotes.company_id', identity.companyId)
          .in('quotes.status', ['ENVIADO', 'ACEITE'])
          .limit(500),
        canAccess(identity.role, 'purchases')
          ? db.from('supply_requests')
              .select('id,reference,item_name,work_site,status,priority,created_at')
              .eq('company_id', identity.companyId)
              .in('status', ['NOVO', 'EM_ANALISE'])
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
      ])
    : [];
  const leads = (results[0]?.data ?? []) as Record<string, unknown>[];
  const projects = (results[1]?.data ?? []) as Record<string, unknown>[];
  const expenses = (results[2]?.data ?? []) as Record<string, unknown>[];
  const payments = (results[3]?.data ?? []) as Record<string, unknown>[];
  const schedules = (results[4]?.data ?? []) as Record<string, unknown>[];
  const tasks = (results[5]?.data ?? []) as Record<string, unknown>[];
  const visits = (results[6]?.data ?? []) as Record<string, unknown>[];
  const quoteVersions = (results[7]?.data ?? []) as Record<string, unknown>[];
  const teamRequests = (results[8]?.data ?? []) as Record<string, unknown>[];
  const activeProjects = projects.filter((project) =>
    [
      'PREPARACAO',
      'EM_EXECUCAO',
      'PAUSADA',
      'AGUARDANDO_CLIENTE',
      'AGUARDANDO_MATERIAL',
    ].includes(String(project.status)),
  );
  const delayedProjects = activeProjects.filter(
    (project) =>
      project.ends_on &&
      String(project.ends_on) < today &&
      Number(project.progress) < 100,
  );
  const openLeads = leads.filter(
    (lead) => !['GANHO', 'PERDIDO'].includes(String(lead.status)),
  );
  const openProposals = leads.filter((lead) =>
    ['ORCAMENTO', 'PROPOSTA_ENVIADA', 'NEGOCIACAO'].includes(
      String(lead.status),
    ),
  );
  const contracted = projects.reduce((total, project) => {
    const f = Array.isArray(project.project_financials)
      ? project.project_financials[0]
      : project.project_financials;
    return (
      total +
      (Number((f as Record<string, unknown> | null)?.contracted_cents) || 0)
    );
  }, 0);
  const estimatedCosts = projects.reduce((total, project) => {
    const f = Array.isArray(project.project_financials)
      ? project.project_financials[0]
      : project.project_financials;
    return (
      total +
      (Number((f as Record<string, unknown> | null)?.estimated_cost_cents) || 0)
    );
  }, 0);
  const spent = sum(expenses, 'total_cents');
  const received = sum(payments, 'amount_cents');
  const receivable = sum(
    schedules.filter((row) => row.status !== 'CANCELADO'),
    'amount_cents',
  );
  const margin = contracted - estimatedCosts;
  const marginPercent = contracted ? (margin / contracted) * 100 : 0;
  const attention: Attention[] = [
    ...teamRequests.map((row) => ({
      id: String(row.id),
      kind: 'PEDIDO DA EQUIPA',
      title: String(row.item_name),
      detail: `${String(row.reference)} · ${String(row.work_site)}`,
      href: `/crm/pedidos-material#pedido-${row.id}`,
      date: String(row.created_at),
      urgent: row.priority === 'URGENTE',
    })),
    ...tasks.map((row) => ({
      id: String(row.id),
      kind: 'TAREFA',
      title: String(row.title),
      detail: String(
        (row.projects as { name?: string } | null)?.name ?? 'Obra',
      ),
      href: '/crm/tarefas',
      date: row.due_on ? String(row.due_on) : null,
      urgent: row.priority === 'URGENTE' || String(row.due_on) < today,
    })),
    ...schedules
      .filter((row) => String(row.due_on) <= today)
      .map((row) => ({
        id: String(row.id),
        kind: 'PAGAMENTO',
        title: String(row.description),
        detail: `${formatMoney(Number(row.amount_cents))} · ${String((row.projects as { name?: string } | null)?.name ?? 'Obra')}`,
        href: '/crm/pagamentos',
        date: String(row.due_on),
        urgent: true,
      })),
    ...leads
      .filter(
        (row) =>
          row.next_action_at &&
          String(row.next_action_at).slice(0, 10) <= today,
      )
      .slice(0, 6)
      .map((row) => ({
        id: String(row.id),
        kind: 'LEAD',
        title: String(row.name),
        detail: String(row.next_action ?? 'Contacto pendente'),
        href: `/crm/leads/${row.id}`,
        date: String(row.next_action_at),
        urgent: false,
      })),
  ].slice(0, 10);
  const pipeline = [
    'NOVO',
    'CONTACTADO',
    'QUALIFICADO',
    'VISITA_AGENDADA',
    'ORCAMENTO',
    'NEGOCIACAO',
    'GANHO',
  ];

  return (
    <main className="crm-page executive-dashboard">
      <PageHeader
        eyebrow="PAINEL EXECUTIVO"
        title={`Bom dia, ${identity.fullName.split(' ')[0]}.`}
        description="Indicadores comerciais, operacionais e financeiros num só lugar."
      >
        <div className="header-actions">
          <Link className="crm-secondary" href="/crm/agenda">
            Ver agenda
          </Link>
          <Link className="crm-primary" href="/crm/obras">
            Gerir obras
          </Link>
        </div>
      </PageHeader>
      <section className="executive-grid" aria-label="Indicadores principais">
        <Metric
          label="Vendas contratadas"
          value={formatMoney(contracted)}
          detail={`${activeProjects.length} obras ativas`}
        />
        <Metric
          label="Recebido este mês"
          value={formatMoney(received)}
          detail="Entradas confirmadas"
          tone="positive"
        />
        <Metric
          label="Despesas este mês"
          value={formatMoney(spent)}
          detail="Custos registados"
          tone={spent > received ? 'warning' : 'default'}
        />
        <Metric
          label="A receber"
          value={formatMoney(receivable)}
          detail={`${schedules.length} prestações abertas`}
          tone={receivable ? 'warning' : 'default'}
        />
        <Metric
          label="Margem prevista"
          value={`${marginPercent.toFixed(1).replace('.', ',')}%`}
          detail={formatMoney(margin)}
          tone={margin < 0 ? 'danger' : 'positive'}
        />
        <Metric
          label="Propostas abertas"
          value={openProposals.length}
          detail={`${formatMoney(sum(quoteVersions, 'total_cents'))} em propostas`}
        />
      </section>
      {canAccess(identity.role, 'purchases') && teamRequests.length > 0 && (
        <Link className="team-request-reminder" href="/crm/pedidos-material">
          <ClipboardList aria-hidden="true" />
          <span><strong>{teamRequests.length} {teamRequests.length === 1 ? 'pedido da equipa aguarda' : 'pedidos da equipa aguardam'} análise</strong><small>Reveja materiais e ferramentas solicitados antes de comprar.</small></span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
      <div className="dashboard-columns">
        <section className="dashboard-panel attention-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">PRIORIDADES</p>
              <h2>Atenção hoje</h2>
            </div>
            <span>{attention.length}</span>
          </div>
          {attention.length ? (
            <div className="attention-list">
              {attention.map((item) => (
                <Link href={item.href} key={`${item.kind}-${item.id}`}>
                  <div
                    className={`attention-icon ${item.urgent ? 'urgent' : ''}`}
                  >
                    {item.urgent ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <Clock3 size={17} />
                    )}
                  </div>
                  <div>
                    <small>{item.kind}</small>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  {item.date && <time>{formatDate(item.date)}</time>}
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <CircleCheck />
              <h3>Tudo em ordem por hoje.</h3>
              <p>Novas tarefas, cobranças e contactos aparecem aqui.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">COMERCIAL</p>
              <h2>Pipeline de oportunidades</h2>
            </div>
            <Link href="/crm/leads">Abrir pipeline</Link>
          </div>
          <div className="pipeline-summary">
            {pipeline.map((stage) => {
              const count = leads.filter(
                (lead) => lead.status === stage,
              ).length;
              return (
                <div key={stage}>
                  <span>
                    <StatusBadge status={stage} />
                    <b>{count}</b>
                  </span>
                  <div>
                    <i
                      style={{
                        width: `${openLeads.length ? Math.max(4, (count / openLeads.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="dashboard-columns lower">
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">OBRAS</p>
              <h2>Execução em curso</h2>
            </div>
            <span>{delayedProjects.length} atrasadas</span>
          </div>
          {activeProjects.length ? (
            <div className="project-progress-list">
              {activeProjects.slice(0, 6).map((project) => (
                <Link
                  href={`/crm/obras/${project.id}`}
                  key={String(project.id)}
                >
                  <div>
                    <strong>{String(project.name)}</strong>
                    <StatusBadge status={String(project.status)} />
                  </div>
                  <ProgressBar
                    value={Number(project.progress)}
                    label={
                      project.ends_on
                        ? `Entrega ${formatDate(String(project.ends_on))}`
                        : 'Sem data de entrega'
                    }
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <Building2 />
              <h3>Sem obras em execução.</h3>
              <p>As obras aceites passam a ser acompanhadas aqui.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">AGENDA</p>
              <h2>Próximas visitas</h2>
            </div>
            <Link href="/crm/agenda">Agenda completa</Link>
          </div>
          {visits.length ? (
            <div className="schedule-list">
              {visits.map((visit) => (
                <article key={String(visit.id)}>
                  <CalendarClock size={18} />
                  <time>
                    {new Intl.DateTimeFormat('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Lisbon',
                    }).format(new Date(String(visit.starts_at)))}
                  </time>
                  <div>
                    <strong>
                      {String(
                        (visit.leads as { name?: string } | null)?.name ??
                          (visit.clients as { name?: string } | null)?.name ??
                          'Visita',
                      )}
                    </strong>
                    <span>{String(visit.address)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-empty">
              <CalendarClock />
              <h3>Sem visitas agendadas.</h3>
              <p>Organize a agenda comercial a partir dos leads.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
