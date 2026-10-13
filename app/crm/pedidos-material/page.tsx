import Link from 'next/link';
import { BarChart3, ClipboardList } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/crm/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { updateSupplyRequest } from '@/features/supply-requests/actions';
import { requestStatuses } from '@/features/supply-requests/validation';
import { requirePermission } from '@/lib/auth/session';
import { formatDate } from '@/lib/config';
import { getSupabase } from '@/lib/supabase/server';

type RequestRow = {
  id: string; reference: string; requester_name: string; work_site: string;
  kind: string; item_name: string; quantity: number; unit: string;
  needed_on: string; priority: string; notes: string; status: string;
  manager_note: string; created_at: string;
};

const statusLabels: Record<string, string> = {
  NOVO: 'Novo', EM_ANALISE: 'Em análise', APROVADO: 'Aprovado',
  RECUSADO: 'Recusado', ENTREGUE: 'Entregue',
};

export default async function SupplyRequestsInbox() {
  const identity = await requirePermission('purchases');
  const db = await getSupabase();
  const result = db
    ? await db.from('supply_requests')
        .select('id,reference,requester_name,work_site,kind,item_name,quantity,unit,needed_on,priority,notes,status,manager_note,created_at')
        .eq('company_id', identity.companyId).order('created_at', { ascending: false }).limit(200)
    : { data: [], error: null };
  const requests = (result.data ?? []) as RequestRow[];

  return <main className="crm-page">
    <PageHeader eyebrow="COMPRAS" title="Pedidos da equipa" description="Materiais e ferramentas pedidos pelos funcionários, sem necessidade de login.">
      <div className="header-actions">
        <Link className="crm-secondary" href="/crm/pedidos-material/relatorio"><BarChart3 size={16} /> Relatório por período</Link>
        <Link className="crm-secondary" href="/pedidos-material">Abrir formulário da equipa</Link>
      </div>
    </PageHeader>
    <p className="supply-manager-note">Os dados do funcionário e da obra são declarados no formulário. Confirme o pedido antes de aprovar ou comprar.</p>
    {result.error ? <div className="crm-error">Não foi possível carregar os pedidos.</div> : requests.length === 0 ?
      <EmptyState icon={ClipboardList} title="Ainda não há pedidos." description="Partilhe o link do formulário com a equipa para começar a receber pedidos." /> :
      <div className="supply-inbox">{requests.map((request) => <article className="supply-card" id={`pedido-${request.id}`} key={request.id}>
        <div className="supply-card-head"><div><small>{request.reference} · {formatDate(request.created_at)}</small><h2>{request.item_name}</h2><p>{request.kind === 'FERRAMENTA' ? 'Ferramenta' : 'Material'} · {request.quantity} {request.unit}</p></div><StatusBadge status={request.status} /></div>
        <dl><div><dt>Funcionário</dt><dd>{request.requester_name}</dd></div><div><dt>Obra/local</dt><dd>{request.work_site}</dd></div><div><dt>Necessário em</dt><dd>{formatDate(request.needed_on)}</dd></div><div><dt>Prioridade</dt><dd>{request.priority === 'URGENTE' ? 'Urgente' : 'Normal'}</dd></div></dl>
        {request.notes && <p className="supply-card-notes">{request.notes}</p>}
        <form action={updateSupplyRequest} className="crm-form supply-review">
          <input type="hidden" name="id" value={request.id} />
          <label>Estado<select name="status" defaultValue={request.status}>{requestStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
          <label>Nota do gestor<textarea name="manager_note" rows={2} maxLength={1000} defaultValue={request.manager_note} /></label>
          <button className="crm-primary" type="submit">Guardar</button>
        </form>
      </article>)}</div>}
  </main>;
}
