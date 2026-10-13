import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Metric, PageHeader } from '@/components/crm/page-elements';
import { PrintButton } from '@/components/crm/print-button';
import { StatusBadge } from '@/components/status-badge';
import { requirePermission } from '@/lib/auth/session';
import { formatDate, formatMoney } from '@/lib/config';
import { getSupabase } from '@/lib/supabase/server';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
function range(input: { de?: string; ate?: string }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = `${today.slice(0, 8)}01`;
  const from = input.de && isoDate.test(input.de) ? input.de : month;
  const to = input.ate && isoDate.test(input.ate) ? input.ate : today;
  return from <= to ? { from, to } : { from: to, to: from };
}

export default async function SupplyReport({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const identity = await requirePermission('purchases');
  const { from, to } = range(await searchParams);
  const db = await getSupabase();
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const [requestsResult, purchasesResult] = db ? await Promise.all([
    db.from('supply_requests').select('id,reference,requester_name,work_site,kind,item_name,quantity,unit,status,priority,created_at').eq('company_id', identity.companyId).gte('created_at', `${from}T00:00:00Z`).lt('created_at', end.toISOString()).order('created_at', { ascending: false }).limit(1000),
    db.from('purchases').select('id,status,requested_on,total_cents,notes,projects(name),suppliers(name)').eq('company_id', identity.companyId).gte('requested_on', from).lte('requested_on', to).order('requested_on', { ascending: false }).limit(1000),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const requests = (requestsResult.data ?? []) as Record<string, unknown>[];
  const purchases = (purchasesResult.data ?? []) as Record<string, unknown>[];
  const approved = requests.filter((row) => ['APROVADO', 'ENTREGUE'].includes(String(row.status))).length;
  const delivered = requests.filter((row) => row.status === 'ENTREGUE').length;
  const urgent = requests.filter((row) => row.priority === 'URGENTE').length;
  const spent = purchases.filter((row) => row.status !== 'CANCELADA').reduce((sum, row) => sum + Number(row.total_cents), 0);

  return <main className="crm-page supply-report">
    <Link className="back-link" href="/crm/pedidos-material"><ArrowLeft size={16} /> Voltar aos pedidos</Link>
    <PageHeader eyebrow="COMPRAS" title="Relatório de pedidos e compras" description={`Histórico entre ${formatDate(from)} e ${formatDate(to)}.`}>
      <PrintButton />
    </PageHeader>
    <form className="report-period" method="get">
      <label>De<input defaultValue={from} name="de" type="date" /></label>
      <label>Até<input defaultValue={to} name="ate" type="date" /></label>
      <button className="crm-primary" type="submit">Atualizar período</button>
    </form>
    <section className="executive-grid compact">
      <Metric label="Pedidos recebidos" value={requests.length} />
      <Metric label="Aprovados / entregues" value={approved} tone="positive" />
      <Metric label="Pedidos urgentes" value={urgent} tone={urgent ? 'warning' : 'default'} />
      <Metric label="Compras registadas" value={formatMoney(spent)} detail={`${delivered} pedidos entregues`} />
    </section>
    <section className="dashboard-panel report-section">
      <div className="panel-title"><div><p className="eyebrow">PEDIDOS DA EQUIPA</p><h2>Itens solicitados</h2></div><span>{requests.length}</span></div>
      {requests.length ? <div className="crm-table-wrap borderless"><table className="crm-table"><thead><tr><th>Data</th><th>Referência</th><th>Funcionário</th><th>Obra</th><th>Item</th><th>Quantidade</th><th>Estado</th></tr></thead><tbody>{requests.map((row) => <tr key={String(row.id)}><td>{formatDate(String(row.created_at))}</td><td>{String(row.reference)}</td><td>{String(row.requester_name)}</td><td>{String(row.work_site)}</td><td>{String(row.item_name)}</td><td>{Number(row.quantity)} {String(row.unit)}</td><td><StatusBadge status={String(row.status)} /></td></tr>)}</tbody></table></div> : <div className="crm-empty"><ClipboardList /><p>Sem pedidos neste período.</p></div>}
    </section>
    <section className="dashboard-panel report-section">
      <div className="panel-title"><div><p className="eyebrow">HISTÓRICO DE COMPRAS</p><h2>Compras registadas</h2></div><strong>{formatMoney(spent)}</strong></div>
      {purchases.length ? <div className="crm-table-wrap borderless"><table className="crm-table"><thead><tr><th>Data</th><th>Obra</th><th>Fornecedor</th><th>Estado</th><th>Total</th></tr></thead><tbody>{purchases.map((row) => <tr key={String(row.id)}><td>{formatDate(String(row.requested_on))}</td><td>{String((row.projects as { name?: string } | null)?.name ?? '—')}</td><td>{String((row.suppliers as { name?: string } | null)?.name ?? '—')}</td><td><StatusBadge status={String(row.status)} /></td><td>{formatMoney(Number(row.total_cents))}</td></tr>)}</tbody></table></div> : <div className="crm-empty"><ClipboardList /><p>Sem compras registadas neste período.</p></div>}
    </section>
  </main>;
}
