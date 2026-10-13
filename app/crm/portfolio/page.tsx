import { Images, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { CreatePanel, EmptyState, FormActions, PageHeader } from '@/components/crm/page-elements';
import { publishProjectPortfolio, removeProjectPortfolio, updateProjectPortfolio } from '@/features/portfolio/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabase } from '@/lib/supabase/server';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

export default async function PortfolioPage() {
  const identity = await requirePermission('projects');
  const db = await getSupabase();
  const admin = getSupabaseAdmin();
  const [projectsResult, photosResult] = db ? await Promise.all([
    db.from('projects').select('id,name').eq('company_id', identity.companyId).order('name'),
    db.from('project_photos').select('id,project_id,phase,description,storage_path,portfolio_order,created_at,projects(name)')
      .eq('company_id', identity.companyId).in('phase', ['ANTES', 'DEPOIS'])
      .order('portfolio_order', { ascending: true }).order('created_at', { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  type PortfolioDraft = { name: string; description: string | null; order: number; before?: string; after?: string };
  const grouped = new Map<string, PortfolioDraft>();
  for (const photo of photosResult.data ?? []) {
    const project = Array.isArray(photo.projects) ? photo.projects[0] : photo.projects;
    const item: PortfolioDraft = grouped.get(photo.project_id) ?? { name: project?.name ?? 'Obra', description: photo.description, order: Number(photo.portfolio_order) };
    const url = admin?.db.storage.from('project-portfolio').getPublicUrl(photo.storage_path).data.publicUrl;
    if (photo.phase === 'ANTES' && !item.before) item.before = url;
    if (photo.phase === 'DEPOIS' && !item.after) item.after = url;
    grouped.set(photo.project_id, item);
  }
  const entries = [...grouped.entries()].filter(([, item]) => item.before && item.after)
    .sort(([, a], [, b]) => a.order - b.order || a.name.localeCompare(b.name, 'pt'));
  return <main className="crm-page">
    <PageHeader eyebrow="COMUNICAÇÃO" title="Portfólio" description="Publique uma fotografia de antes e outra de depois para cada obra.">
      <CreatePanel title="Adicionar fotos" description="Criar ou substituir um antes e depois">
        <form action={publishProjectPortfolio} className="crm-form" encType="multipart/form-data">
          <div className="form-grid">
            <label className="span-2">Obra<select name="project_id" required defaultValue=""><option value="" disabled>Selecionar obra</option>{(projectsResult.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label>Foto de antes<input name="before" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <label>Foto de depois<input name="after" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <label className="span-2">Descrição opcional<textarea name="description" rows={3} maxLength={500} placeholder="Breve contexto sobre a transformação" /></label>
          </div>
          <p className="form-help">JPG, PNG ou WebP, até 5 MB por fotografia. Ao publicar novas fotos para a mesma obra, o par anterior é substituído.</p>
          <FormActions label="Publicar no portfólio" />
        </form>
      </CreatePanel>
    </PageHeader>
    {!admin ? <div className="crm-error">O armazenamento de fotografias ainda não está configurado.</div> : entries.length === 0 ? <EmptyState icon={Images} title="Ainda não existem projetos publicados." description="Adicione um par de fotografias de antes e depois para preencher a página de projetos." /> : <section className="portfolio-admin-grid">{entries.map(([projectId, item]) => <article key={projectId}>
      <div className="portfolio-admin-head"><div><p className="eyebrow">POSIÇÃO {item.order}</p><h2>{item.name}</h2>{item.description && <p>{item.description}</p>}</div></div>
      <div className="comparison-grid"><figure><div><Image src={item.before!} alt={`Antes da obra ${item.name}`} fill sizes="(max-width: 600px) 100vw, 50vw" unoptimized /></div><figcaption>Antes</figcaption></figure><figure><div><Image src={item.after!} alt={`Depois da obra ${item.name}`} fill sizes="(max-width: 600px) 100vw, 50vw" unoptimized /></div><figcaption>Depois</figcaption></figure></div>
      <details className="crud-details portfolio-edit"><summary><Pencil size={15} /> Editar publicação e ordem</summary><ClosePanelButton />
        <form key={`${item.order}-${item.description ?? ''}`} action={updateProjectPortfolio} className="crm-form" encType="multipart/form-data">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="form-grid"><label>Posição no site<input name="portfolio_order" type="number" min="1" max="1000" required defaultValue={item.order} /></label>
            <label className="span-2">Descrição<textarea name="description" rows={3} maxLength={500} defaultValue={item.description ?? ''} /></label>
            <label>Trocar foto de antes (opcional)<input name="before" type="file" accept="image/jpeg,image/png,image/webp" /></label>
            <label>Trocar foto de depois (opcional)<input name="after" type="file" accept="image/jpeg,image/png,image/webp" /></label></div>
          <p className="form-help">Pode alterar somente uma fotografia ou substituir as duas.</p><FormActions label="Atualizar publicação" />
        </form>
        <form action={removeProjectPortfolio} className="crud-delete"><input type="hidden" name="project_id" value={projectId} /><button type="submit" aria-label={`Remover ${item.name} do portfólio`}><Trash2 size={16} /> Remover do portfólio</button></form>
      </details>
    </article>)}</section>}
  </main>;
}
