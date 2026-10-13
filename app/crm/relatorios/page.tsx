import { company } from '@/lib/config';
import {
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';
import { Metric, PageHeader } from '@/components/crm/page-elements';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/config';

export default async function ReportsPage() {
  const identity = await requirePermission('finance');
  const db = await getSupabase();
  const [leadsResult, projectsResult, expensesResult, paymentsResult] = db
    ? await Promise.all([
        db
          .from('leads')
          .select('status,source,estimated_value_cents,created_at')
          .eq('company_id', identity.companyId),
        db
          .from('projects')
          .select(
            'status,progress,starts_on,ends_on,project_financials(contracted_cents)',
          )
          .eq('company_id', identity.companyId),
        db
          .from('expenses')
          .select('category,total_cents,spent_on')
          .eq('company_id', identity.companyId),
        db
          .from('payments')
          .select('amount_cents,received_on')
          .eq('company_id', identity.companyId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const leads = (leadsResult.data ?? []) as Record<string, unknown>[];
  const projects = (projectsResult.data ?? []) as Record<string, unknown>[];
  const expenses = (expensesResult.data ?? []) as Record<string, unknown>[];
  const payments = (paymentsResult.data ?? []) as Record<string, unknown>[];
  const won = leads.filter((l) => l.status === 'GANHO').length;
  const conversion = leads.length ? (won / leads.length) * 100 : 0;
  const revenue = projects.reduce((t, p) => {
    const f = Array.isArray(p.project_financials)
      ? p.project_financials[0]
      : p.project_financials;
    return (
      t +
      Number((f as { contracted_cents?: number } | null)?.contracted_cents ?? 0)
    );
  }, 0);
  const cost = expenses.reduce((t, e) => t + Number(e.total_cents), 0);
  const received = payments.reduce((t, p) => t + Number(p.amount_cents), 0);
  const sources = ['WEBSITE', 'MANUAL', 'INDICACAO', 'OUTRO'];
  const categories = [...new Set(expenses.map((e) => String(e.category)))];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="ANÁLISE"
        title="Relatórios"
        description={"Desempenho comercial, operacional e financeiro da " + company.shortName + "."}
      />
      <section className="executive-grid compact">
        <Metric
          label="Conversão comercial"
          value={`${conversion.toFixed(1).replace('.', ',')}%`}
          detail={`${won} leads ganhos`}
        />
        <Metric label="Receita contratada" value={formatMoney(revenue)} />
        <Metric
          label="Custos acumulados"
          value={formatMoney(cost)}
          tone="warning"
        />
        <Metric
          label="Recebimentos"
          value={formatMoney(received)}
          tone="positive"
        />
      </section>
      <div className="report-grid">
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">COMERCIAL</p>
              <h2>Leads por origem</h2>
            </div>
            <BriefcaseBusiness />
          </div>
          <div className="report-bars">
            {sources.map((source) => {
              const count = leads.filter((l) => l.source === source).length;
              return (
                <div key={source}>
                  <span>{source.replace('_', ' ')}</span>
                  <div>
                    <i
                      style={{
                        width: `${leads.length ? (count / leads.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">OPERAÇÕES</p>
              <h2>Estado das obras</h2>
            </div>
            <Building2 />
          </div>
          <div className="report-bars">
            {[
              'PLANEAMENTO',
              'EM_EXECUCAO',
              'PAUSADA',
              'CONCLUIDA',
              'ENTREGUE',
            ].map((status) => {
              const count = projects.filter((p) => p.status === status).length;
              return (
                <div key={status}>
                  <span>{status.replaceAll('_', ' ')}</span>
                  <div>
                    <i
                      style={{
                        width: `${projects.length ? (count / projects.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">FINANCEIRO</p>
              <h2>Custos por categoria</h2>
            </div>
            <CircleDollarSign />
          </div>
          <div className="report-bars">
            {categories.length ? (
              categories.map((category) => {
                const value = expenses
                  .filter((e) => e.category === category)
                  .reduce((t, e) => t + Number(e.total_cents), 0);
                return (
                  <div key={category}>
                    <span>{category.replaceAll('_', ' ')}</span>
                    <div>
                      <i
                        style={{ width: `${cost ? (value / cost) * 100 : 0}%` }}
                      />
                    </div>
                    <b>{formatMoney(value)}</b>
                  </div>
                );
              })
            ) : (
              <p className="report-empty">Sem custos registados.</p>
            )}
          </div>
        </section>
        <section className="dashboard-panel report-highlight">
          <TrendingUp />
          <p className="eyebrow">RESULTADO</p>
          <h2>{formatMoney(revenue - cost)}</h2>
          <p>
            Margem acumulada sobre contratos, antes de impostos e custos não
            registados.
          </p>
          <strong>
            {revenue
              ? `${(((revenue - cost) / revenue) * 100).toFixed(1).replace('.', ',')}%`
              : '0,0%'}
          </strong>
        </section>
      </div>
    </main>
  );
}
