import { ReceiptText } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createExpense } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

const categories = [
  'MATERIAIS',
  'MAO_DE_OBRA',
  'SUBEMPREITADA',
  'TRANSPORTE',
  'COMBUSTIVEL',
  'FERRAMENTAS',
  'EQUIPAMENTOS',
  'LICENCAS',
  'RESIDUOS',
  'OUTROS',
];
export default async function ExpensesPage() {
  const identity = await requirePermission('finance');
  const db = await getSupabase();
  const [expensesResult, projectsResult, suppliersResult] = db
    ? await Promise.all([
        db
          .from('expenses')
          .select(
            'id,category,description,net_cents,vat_cents,total_cents,spent_on,status,payment_method,projects(name),suppliers(name)',
          )
          .eq('company_id', identity.companyId)
          .order('spent_on', { ascending: false })
          .limit(500),
        db
          .from('projects')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
        db
          .from('suppliers')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }, { data: [] }];
  const expenses = (expensesResult.data ?? []) as Record<string, unknown>[];
  const total = expenses.reduce((s, e) => s + Number(e.total_cents), 0);
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="FINANCEIRO"
        title="Despesas"
        description={`${formatMoney(total)} em custos registados.`}
      >
        <CreatePanel
          title="Nova despesa"
          description="Registe um custo com IVA"
        >
          <form action={createExpense} className="crm-form">
            <div className="form-grid">
              <label>
                Obra
                <select name="project_id">
                  <option value="">Custo geral</option>
                  {(projectsResult.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fornecedor
                <select name="supplier_id">
                  <option value="">Sem fornecedor</option>
                  {(suppliersResult.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Categoria
                <select name="category">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Data
                <input
                  name="spent_on"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label className="span-2">
                Descrição
                <input name="description" required />
              </label>
              <label>
                Valor líquido (€)
                <input name="net" type="number" min="0" step="0.01" required />
              </label>
              <label>
                IVA (%)
                <input
                  name="vat_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="23"
                  required
                />
              </label>
              <label>
                Forma de pagamento
                <input name="payment_method" />
              </label>
            </div>
            <FormActions label="Registar despesa" />
          </form>
        </CreatePanel>
      </PageHeader>
      {expensesResult.error ? (
        <div className="crm-error">Não foi possível carregar as despesas.</div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Sem despesas registadas."
          description="Registe custos para acompanhar a margem real das obras."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Obra</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Líquido</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={String(e.id)}>
                  <td>{formatDate(String(e.spent_on))}</td>
                  <td>
                    <strong>{String(e.description)}</strong>
                  </td>
                  <td>
                    {String(
                      (e.projects as { name?: string } | null)?.name ?? 'Geral',
                    )}
                  </td>
                  <td>{String(e.category).replaceAll('_', ' ')}</td>
                  <td>
                    {String(
                      (e.suppliers as { name?: string } | null)?.name ?? '—',
                    )}
                  </td>
                  <td>{formatMoney(Number(e.net_cents))}</td>
                  <td>{formatMoney(Number(e.vat_cents))}</td>
                  <td>
                    <strong>{formatMoney(Number(e.total_cents))}</strong>
                  </td>
                  <td>
                    <StatusBadge status={String(e.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
