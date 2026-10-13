import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';
import { FormActions } from '@/components/crm/page-elements';
import { deleteClient, updateClient } from '@/features/crm/actions';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requirePermission('clients');
  const db = await getSupabase();
  if (!db) notFound();
  const [{ data: client }, { data: projects }, { data: quotes }] =
    await Promise.all([
      db
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('company_id', identity.companyId)
        .single(),
      db
        .from('projects')
        .select(
          'id,name,status,progress,ends_on,project_financials(contracted_cents)',
        )
        .eq('client_id', id)
        .eq('company_id', identity.companyId)
        .order('created_at', { ascending: false }),
      db
        .from('quotes')
        .select(
          'id,number,status,created_at,quote_versions(total_cents,version)',
        )
        .eq('client_id', id)
        .eq('company_id', identity.companyId)
        .order('created_at', { ascending: false }),
    ]);
  if (!client) notFound();
  return (
    <main className="crm-page">
      <Link className="back-link" href="/crm/clientes">
        <ArrowLeft size={16} />
        Voltar aos clientes
      </Link>
      <div className="detail-hero">
        <div>
          <p className="eyebrow">CLIENTE</p>
          <h1>{client.name}</h1>
          <span>
            {client.kind === 'empresa' ? 'Empresa' : 'Particular'} · cliente
            desde {formatDate(client.created_at)}
          </span>
        </div>
        <div className="detail-contact">
          {client.phone && (
            <a href={`tel:${client.phone}`}>
              <Phone />
              {client.phone}
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`}>
              <Mail />
              {client.email}
            </a>
          )}
          {client.address && (
            <span>
              <MapPin />
              {client.address}
            </span>
          )}
        </div>
      </div>
      <details className="crud-details detail-crud"><summary><Pencil size={15} /> Editar cliente</summary><ClosePanelButton />
        <form action={updateClient} className="crm-form"><input type="hidden" name="id" value={client.id} /><div className="form-grid">
          <label>Nome<input name="name" required minLength={2} defaultValue={client.name} /></label><label>Tipo<select name="kind" defaultValue={client.kind}><option value="particular">Particular</option><option value="empresa">Empresa</option></select></label>
          <label>NIF<input name="nif" defaultValue={client.nif ?? ''} /></label><label>Telemóvel<input name="phone" type="tel" defaultValue={client.phone ?? ''} /></label>
          <label>Email<input name="email" type="email" defaultValue={client.email ?? ''} /></label><label className="span-2">Morada<input name="address" defaultValue={client.address ?? ''} /></label>
          <label className="span-2">Notas<textarea name="notes" rows={4} defaultValue={client.notes ?? ''} /></label>
        </div><FormActions label="Atualizar cliente" /></form>
        <form action={deleteClient} className="crud-delete"><input type="hidden" name="id" value={client.id} /><button type="submit"><Trash2 size={15} /> Excluir cliente definitivamente</button></form>
      </details>
      <div className="detail-columns">
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">OBRAS</p>
              <h2>Projetos do cliente</h2>
            </div>
            <span>{projects?.length ?? 0}</span>
          </div>
          {projects?.length ? (
            <div className="detail-list">
              {projects.map((project) => {
                const f = Array.isArray(project.project_financials)
                  ? project.project_financials[0]
                  : project.project_financials;
                return (
                  <Link href={`/crm/obras/${project.id}`} key={project.id}>
                    <Building2 />
                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {project.ends_on
                          ? `Entrega ${formatDate(project.ends_on)}`
                          : 'Sem data de entrega'}
                      </span>
                    </div>
                    <StatusBadge status={project.status} />
                    <b>{formatMoney(Number(f?.contracted_cents ?? 0))}</b>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="crm-empty">
              <Building2 />
              <p>Este cliente ainda não tem obras.</p>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">COMERCIAL</p>
              <h2>Orçamentos</h2>
            </div>
            <span>{quotes?.length ?? 0}</span>
          </div>
          {quotes?.length ? (
            <div className="detail-list">
              {quotes.map((quote) => {
                const versions = quote.quote_versions ?? [];
                const latest = versions.at(-1);
                return (
                  <Link href={`/crm/orcamentos/${quote.id}`} key={quote.id}>
                    <FileText />
                    <div>
                      <strong>{quote.number}</strong>
                      <span>{formatDate(quote.created_at)}</span>
                    </div>
                    <StatusBadge status={quote.status} />
                    <b>{formatMoney(Number(latest?.total_cents ?? 0))}</b>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="crm-empty">
              <FileText />
              <p>Este cliente ainda não tem orçamentos.</p>
            </div>
          )}
        </section>
      </div>
      {client.notes && (
        <section className="detail-notes">
          <p className="eyebrow">NOTAS</p>
          <p>{client.notes}</p>
        </section>
      )}
    </main>
  );
}
