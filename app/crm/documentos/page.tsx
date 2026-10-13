import { Download, FileArchive, FileText, Pencil, Trash2, Upload } from 'lucide-react';
import { CreatePanel, EmptyState, FormActions, PageHeader } from '@/components/crm/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { createDocument, deleteDocument, updateDocument } from '@/features/documents/actions';
import { documentKindLabels, documentKinds } from '@/features/documents/validation';
import { requirePermission } from '@/lib/auth/session';
import { formatDate } from '@/lib/config';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabase } from '@/lib/supabase/server';

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; client_id: string; name: string; clients: { name?: string } | null };
type DocumentRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  name: string;
  kind: (typeof documentKinds)[number];
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
  clients: { name?: string } | null;
  projects: { name?: string } | null;
  downloadUrl?: string;
};

function ClientSelect({ clients, id, value }: { clients: ClientOption[]; id: string; value?: string }) {
  return <select id={id} name="client_id" required defaultValue={value ?? ''}>
    <option value="" disabled>Selecionar cliente</option>
    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
  </select>;
}

function ProjectSelect({ projects, id, value }: { projects: ProjectOption[]; id: string; value?: string | null }) {
  return <select id={id} name="project_id" defaultValue={value ?? ''}>
    <option value="">Sem obra associada</option>
    {projects.map((project) => <option key={project.id} value={project.id}>
      {project.clients?.name ? `${project.clients.name} · ` : ''}{project.name}
    </option>)}
  </select>;
}

function KindSelect({ id, value = 'OUTRO' }: { id: string; value?: string }) {
  return <select id={id} name="kind" defaultValue={value}>
    {documentKinds.map((kind) => <option key={kind} value={kind}>{documentKindLabels[kind]}</option>)}
  </select>;
}

export default async function DocumentsPage() {
  const identity = await requirePermission('documents');
  const db = await getSupabase();
  const admin = getSupabaseAdmin();
  const [documentsResult, clientsResult, projectsResult] = db ? await Promise.all([
    db.from('documents').select('id,client_id,project_id,name,kind,mime_type,size_bytes,storage_path,created_at,clients(name),projects(name)')
      .eq('company_id', identity.companyId).order('created_at', { ascending: false }).limit(500),
    db.from('clients').select('id,name').eq('company_id', identity.companyId).order('name'),
    db.from('projects').select('id,client_id,name,clients(name)').eq('company_id', identity.companyId).order('name'),
  ]) : [{ data: [], error: null }, { data: [] }, { data: [] }];

  const clients = (clientsResult.data ?? []) as ClientOption[];
  const projects = (projectsResult.data ?? []) as ProjectOption[];
  const documents = (documentsResult.data ?? []) as DocumentRow[];
  if (admin && admin.companyId === identity.companyId) {
    await Promise.all(documents.map(async (document) => {
      const signed = await admin.db.storage.from('documents-private').createSignedUrl(document.storage_path, 3600);
      document.downloadUrl = signed.data?.signedUrl;
    }));
  }
  const grouped = new Map<string, { clientName: string; documents: DocumentRow[] }>();
  for (const document of documents) {
    const group = grouped.get(document.client_id) ?? {
      clientName: document.clients?.name ?? 'Cliente sem nome',
      documents: [],
    };
    group.documents.push(document);
    grouped.set(document.client_id, group);
  }
  const clientGroups = [...grouped.values()].sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt'));

  return <main className="crm-page">
    <PageHeader eyebrow="OPERAÇÕES" title="Documentos" description={`${documents.length} documentos organizados por cliente.`}>
      {admin && clients.length > 0 && <CreatePanel title="Adicionar documento" description="PDF ou imagem até 10 MB">
        <form action={createDocument} className="crm-form" encType="multipart/form-data">
          <div className="form-grid">
            <div className="document-form-field"><label htmlFor="new-document-client">Cliente</label><ClientSelect id="new-document-client" clients={clients} /></div>
            <div className="document-form-field"><label htmlFor="new-document-project">Obra</label><ProjectSelect id="new-document-project" projects={projects} /></div>
            <label>Nome do documento<input name="name" required minLength={2} maxLength={240} /></label>
            <div className="document-form-field"><label htmlFor="new-document-kind">Tipo</label><KindSelect id="new-document-kind" /></div>
            <label className="span-2 document-file-field">Ficheiro<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
          </div>
          <p className="form-help">Formatos aceites: PDF, JPG, PNG e WebP. Tamanho máximo: 10 MB.</p>
          <FormActions label="Adicionar documento" />
        </form>
      </CreatePanel>}
    </PageHeader>
    {!admin && <div className="crm-error">O armazenamento privado de documentos ainda não está configurado.</div>}
    {clients.length === 0 ? <EmptyState icon={FileArchive} title="Crie primeiro um cliente." description="Cada documento precisa de ficar associado a um cliente." /> :
      documentsResult.error ? <div className="crm-error">Não foi possível carregar os documentos.</div> :
      documents.length === 0 ? <EmptyState icon={FileArchive} title="O arquivo está vazio." description="Adicione contratos, plantas, faturas, recibos e relatórios separados por cliente." /> :
      <div className="document-client-list">{clientGroups.map((group) => <section className="document-client-group" key={group.clientName}>
        <header><div><p className="eyebrow">CLIENTE</p><h2>{group.clientName}</h2></div><span>{group.documents.length} {group.documents.length === 1 ? 'documento' : 'documentos'}</span></header>
        <div className="document-grid">{group.documents.map((document) => <article key={document.id} className="document-card">
          <div className="document-card-main"><FileText aria-hidden="true" /><div><StatusBadge status={document.kind} /><h3>{document.name}</h3><p>{document.projects?.name ?? 'Sem obra associada'}</p></div></div>
          <div className="document-card-meta"><span>{(document.size_bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB</span><time>{formatDate(document.created_at)}</time></div>
          <div className="document-card-actions">
            {document.downloadUrl && <a className="crm-secondary" href={document.downloadUrl} target="_blank" rel="noreferrer"><Download size={15} /> Abrir</a>}
            <details className="document-edit-panel"><summary><Pencil size={15} /> Editar</summary><form key={`${document.name}-${document.kind}-${document.client_id}-${document.project_id ?? ''}`} action={updateDocument} className="crm-form" encType="multipart/form-data">
              <input type="hidden" name="id" value={document.id} />
              <div className="form-grid">
                <div className="document-form-field"><label htmlFor={`document-client-${document.id}`}>Cliente</label><ClientSelect id={`document-client-${document.id}`} clients={clients} value={document.client_id} /></div>
                <div className="document-form-field"><label htmlFor={`document-project-${document.id}`}>Obra</label><ProjectSelect id={`document-project-${document.id}`} projects={projects} value={document.project_id} /></div>
                <label>Nome<input name="name" required defaultValue={document.name} minLength={2} maxLength={240} /></label>
                <div className="document-form-field"><label htmlFor={`document-kind-${document.id}`}>Tipo</label><KindSelect id={`document-kind-${document.id}`} value={document.kind} /></div>
                <label className="span-2 document-file-field">Substituir ficheiro (opcional)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" /></label>
              </div>
              <FormActions label="Atualizar documento" />
            </form></details>
            <form action={deleteDocument}><input type="hidden" name="id" value={document.id} /><button className="danger-link document-delete" type="submit"><Trash2 size={15} /> Excluir</button></form>
          </div>
        </article>)}</div>
      </section>)}</div>}
    {admin && clients.length > 0 && <div className="document-guidance"><Upload aria-hidden="true" /><div><strong>Arquivo privado</strong><p>Os ficheiros são guardados num espaço privado. Cada ligação de abertura expira automaticamente.</p></div></div>}
  </main>;
}
