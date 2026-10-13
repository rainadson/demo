import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type PortfolioEntry = {
  projectId: string;
  order: number;
  name: string;
  description: string | null;
  beforeUrl: string;
  afterUrl: string;
};

type PortfolioDraft = {
  order: number;
  name: string;
  description: string | null;
  before?: string;
  after?: string;
};

export async function readPortfolioFromDatabase(): Promise<PortfolioEntry[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin.db.from('project_photos')
    .select('project_id,phase,description,storage_path,portfolio_order,created_at,projects(name)')
    .eq('company_id', admin.companyId).eq('publicable', true)
    .in('phase', ['ANTES', 'DEPOIS']).order('portfolio_order', { ascending: true })
    .order('created_at', { ascending: false }).limit(200);
  if (error) return [];
  const grouped = new Map<string, PortfolioDraft>();
  for (const photo of data ?? []) {
    const project = Array.isArray(photo.projects) ? photo.projects[0] : photo.projects;
    const current: PortfolioDraft = grouped.get(photo.project_id) ?? {
      order: Number(photo.portfolio_order), name: project?.name ?? 'Obra', description: photo.description,
    };
    const url = admin.db.storage.from('project-portfolio').getPublicUrl(photo.storage_path).data.publicUrl;
    if (photo.phase === 'ANTES' && !current.before) current.before = url;
    if (photo.phase === 'DEPOIS' && !current.after) current.after = url;
    grouped.set(photo.project_id, current);
  }
  return [...grouped.entries()].filter(([, item]) => item.before && item.after).map(([projectId, item]) => ({
    projectId, order: item.order, name: item.name, description: item.description,
    beforeUrl: item.before!, afterUrl: item.after!,
  }));
}

export async function getPublicPortfolio(): Promise<PortfolioEntry[]> {
  if (getSupabaseAdmin()) return readPortfolioFromDatabase();
  const backend = process.env.BACKEND_URL?.replace(/\/$/, '');
  if (!backend) return [];
  try {
    const response = await fetch(`${backend}/api/portfolio`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const value: unknown = await response.json();
    return Array.isArray(value) ? value as PortfolioEntry[] : [];
  } catch {
    return [];
  }
}
