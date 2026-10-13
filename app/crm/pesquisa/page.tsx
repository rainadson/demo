import Link from 'next/link';
import { Search } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/crm/page-elements';
import { canAccess } from '@/lib/auth/permissions';
import { requireIdentity } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';

type Result = { id: string; title: string; detail: string; href: string; kind: string };

function pattern(value: string) {
  const safe = value.replace(/[^\p{L}\p{N}@.+ -]/gu, ' ');
  return `%${safe.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const identity = await requireIdentity('crm');
  const query = (await searchParams).q?.trim().slice(0, 80) ?? '';
  const db = await getSupabase();
  const results: Result[] = [];

  if (db && query.length >= 2) {
    const term = pattern(query);
    const searches: PromiseLike<{ data: unknown[] | null }>[] = [];
    const collectors: ((rows: unknown[]) => void)[] = [];

    if (canAccess(identity.role, 'leads')) {
      searches.push(db.from('leads').select('id,name,service,location').eq('company_id', identity.companyId).or(`name.ilike.${term},service.ilike.${term},location.ilike.${term}`).limit(20));
      collectors.push((rows) => rows.forEach((row) => {
        const item = row as { id: string; name: string; service: string; location: string | null };
        results.push({ id: item.id, title: item.name, detail: `${item.service} · ${item.location ?? 'Sem localização'}`, href: `/crm/leads/${item.id}`, kind: 'Lead' });
      }));
    }
    if (canAccess(identity.role, 'clients')) {
      searches.push(db.from('clients').select('id,name,email,phone').eq('company_id', identity.companyId).or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`).limit(20));
      collectors.push((rows) => rows.forEach((row) => {
        const item = row as { id: string; name: string; email: string | null; phone: string | null };
        results.push({ id: item.id, title: item.name, detail: item.email ?? item.phone ?? 'Cliente', href: `/crm/clientes/${item.id}`, kind: 'Cliente' });
      }));
    }
    if (canAccess(identity.role, 'projects')) {
      searches.push(db.from('projects').select('id,name,address,status').eq('company_id', identity.companyId).or(`name.ilike.${term},address.ilike.${term}`).limit(20));
      collectors.push((rows) => rows.forEach((row) => {
        const item = row as { id: string; name: string; address: string | null; status: string };
        results.push({ id: item.id, title: item.name, detail: `${item.address ?? 'Sem morada'} · ${item.status.replaceAll('_', ' ')}`, href: `/crm/obras/${item.id}`, kind: 'Obra' });
      }));
    }
    if (canAccess(identity.role, 'quotes')) {
      searches.push(db.from('quotes').select('id,number,status').eq('company_id', identity.companyId).ilike('number', term).limit(20));
      collectors.push((rows) => rows.forEach((row) => {
        const item = row as { id: string; number: string; status: string };
        results.push({ id: item.id, title: `Orçamento ${item.number}`, detail: item.status.replaceAll('_', ' '), href: `/crm/orcamentos/${item.id}`, kind: 'Orçamento' });
      }));
    }
    if (canAccess(identity.role, 'purchases')) {
      searches.push(db.from('supply_requests').select('id,reference,item_name,work_site,status').eq('company_id', identity.companyId).or(`reference.ilike.${term},item_name.ilike.${term},work_site.ilike.${term},requester_name.ilike.${term}`).limit(20));
      collectors.push((rows) => rows.forEach((row) => {
        const item = row as { id: string; reference: string; item_name: string; work_site: string; status: string };
        results.push({ id: item.id, title: item.item_name, detail: `${item.reference} · ${item.work_site} · ${item.status.replaceAll('_', ' ')}`, href: `/crm/pedidos-material#pedido-${item.id}`, kind: 'Pedido da equipa' });
      }));
    }

    const responses = await Promise.all(searches);
    responses.forEach((response, index) => collectors[index]?.(response.data ?? []));
  }

  return (
    <main className="crm-page">
      <PageHeader eyebrow="PESQUISA" title={query ? `Resultados para “${query}”` : 'Pesquisar no CRM'} description="Clientes, leads, obras, orçamentos e pedidos permitidos para o seu perfil." />
      {query.length < 2 ? (
        <EmptyState icon={Search} title="Escreva pelo menos duas letras." description="Use o campo de pesquisa no topo para localizar registos." />
      ) : results.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum resultado encontrado." description="Tente pesquisar por outro nome, número, obra ou referência." />
      ) : (
        <div className="search-results">
          {results.map((result) => (
            <Link href={result.href} key={`${result.kind}-${result.id}`}>
              <span>{result.kind}</span>
              <strong>{result.title}</strong>
              <small>{result.detail}</small>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
