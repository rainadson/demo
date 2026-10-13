/* eslint-disable typescript/restrict-template-expressions */
import Link from 'next/link';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  Metric,
  PageHeader,
  ProgressBar,
} from '@/components/crm/page-elements';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/config';

export default async function FinancePage() {
  const identity = await requirePermission('finance');
  const db = await getSupabase();
  const [projectsResult, expensesResult, paymentsResult, schedulesResult] = db
    ? await Promise.all([
        db
          .from('projects')
          .select(
            'id,name,status,progress,project_financials(contracted_cents,estimated_cost_cents)',
          )
          .eq('company_id', identity.companyId)
          .order('name'),
        db
          .from('expenses')
          .select('project_id,total_cents')
          .eq('company_id', identity.companyId),
        db
          .from('payments')
          .select('amount_cents')
          .eq('company_id', identity.companyId),
        db
          .from('payment_schedules')
          .select('amount_cents,status')
          .eq('company_id', identity.companyId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const projects = (projectsResult.data ?? []) as Record<string, unknown>[];
  const expenses = (expensesResult.data ?? []) as {
    project_id: string | null;
    total_cents: number;
  }[];
  const contracted = projects.reduce((t, p) => {
    const f = Array.isArray(p.project_financials)
      ? p.project_financials[0]
      : p.project_financials;
    return (
      t +
      Number((f as { contracted_cents?: number } | null)?.contracted_cents ?? 0)
    );
  }, 0);
  const estimated = projects.reduce((t, p) => {
    const f = Array.isArray(p.project_financials)
      ? p.project_financials[0]
      : p.project_financials;
    return (
      t +
      Number(
        (f as { estimated_cost_cents?: number } | null)?.estimated_cost_cents ??
          0,
      )
    );
  }, 0);
  const spent = expenses.reduce((t, e) => t + Number(e.total_cents), 0);
  const received = (paymentsResult.data ?? []).reduce(
    (t, p) => t + Number(p.amount_cents),
    0,
  );
  const receivable = (schedulesResult.data ?? [])
    .filter((s) => s.status === 'PENDENTE' || s.status === 'ATRASADO')
    .reduce((t, s) => t + Number(s.amount_cents), 0);
  const margin = contracted - spent;
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="FINANCEIRO"
        title="Visão financeira"
        description="Receita, custos, tesouraria e rentabilidade por obra."
      >
        <div className="header-actions">
          <Link className="crm-secondary" href="/crm/despesas">
            Registar despesa
          </Link>
          <Link className="crm-primary" href="/crm/pagamentos">
            Gerir pagamentos
          </Link>
        </div>
      </PageHeader>
      <section className="executive-grid">
        <Metric label="Receita contratada" value={formatMoney(contracted)} />
        <Metric
          label="Recebimentos"
          value={formatMoney(received)}
          tone="positive"
        />
        <Metric
          label="Despesas reais"
          value={formatMoney(spent)}
          tone="warning"
        />
        <Metric label="Contas a receber" value={formatMoney(receivable)} />
        <Metric
          label="Margem atual"
          value={formatMoney(margin)}
          detail={`${contracted ? ((margin / contracted) * 100).toFixed(1).replace('.', ',') : '0,0'}%`}
          tone={margin < 0 ? 'danger' : 'positive'}
        />
        <Metric label="Custo previsto" value={formatMoney(estimated)} />
      </section>
      <section className="dashboard-panel finance-projects">
        <div className="panel-title">
          <div>
            <p className="eyebrow">RENTABILIDADE</p>
            <h2>Orçado versus realizado</h2>
          </div>
          <BarChart3 />
        </div>
        {projects.length ? (
          <div className="profitability-list">
            {projects.map((project) => {
              const f = Array.isArray(project.project_financials)
                ? project.project_financials[0]
                : (project.project_financials as Record<
                    string,
                    unknown
                  > | null);
              const revenue = Number(f?.contracted_cents ?? 0);
              const budget = Number(f?.estimated_cost_cents ?? 0);
              const actual = expenses
                .filter((e) => e.project_id === project.id)
                .reduce((t, e) => t + Number(e.total_cents), 0);
              const currentMargin = revenue - actual;
              return (
                <Link
                  href={`/crm/obras/${project.id}`}
                  key={String(project.id)}
                >
                  <div className="profit-title">
                    <span>
                      <TrendingUp size={17} />
                      <strong>{String(project.name)}</strong>
                    </span>
                    <b className={currentMargin < 0 ? 'negative' : ''}>
                      {formatMoney(currentMargin)}
                    </b>
                  </div>
                  <div className="profit-values">
                    <span>
                      Contrato <b>{formatMoney(revenue)}</b>
                    </span>
                    <span>
                      Orçado <b>{formatMoney(budget)}</b>
                    </span>
                    <span>
                      Realizado <b>{formatMoney(actual)}</b>
                    </span>
                    <span>
                      Margem{' '}
                      <b>
                        {revenue
                          ? `${((currentMargin / revenue) * 100).toFixed(1).replace('.', ',')}%`
                          : '—'}
                      </b>
                    </span>
                  </div>
                  <ProgressBar
                    value={budget ? (actual / budget) * 100 : 0}
                    label="Consumo do orçamento de custo"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="crm-empty">
            <TrendingUp />
            <h3>Sem obras para analisar.</h3>
            <p>
              A rentabilidade aparece quando existirem contratos e despesas.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
