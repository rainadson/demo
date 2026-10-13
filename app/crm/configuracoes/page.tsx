import { Building2, Settings, UserCog, UserPlus, Users } from 'lucide-react';
import { CreatePanel, FormActions, PageHeader } from '@/components/crm/page-elements';
import { updateCompany } from '@/features/crm/actions';
import { createUser, removeUserAccess, updateUser } from '@/features/users/actions';
import { roles } from '@/lib/auth/permissions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabase } from '@/lib/supabase/server';

const roleLabels: Record<(typeof roles)[number], string> = {
  ADMIN: 'Administrador', COMERCIAL: 'Comercial', GESTOR_OBRA: 'Gestor de obra',
  FINANCEIRO: 'Financeiro', COLABORADOR: 'Colaborador', CLIENTE: 'Cliente',
};

export default async function SettingsPage() {
  const identity = await requirePermission('settings');
  const db = await getSupabase();
  const admin = getSupabaseAdmin();
  const [{ data: company, error }, { data: profiles }] = db ? await Promise.all([
    db.from('companies').select('name,legal_name,tax_id,address,phone,email,website,iban,default_vat,currency,timezone').eq('id', identity.companyId).single(),
    db.from('profiles').select('id,full_name,role,active,updated_at').eq('company_id', identity.companyId).order('full_name'),
  ]) : [{ data: null, error: null }, { data: [] }];
  const authUsers = admin ? (await admin.db.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users : [];
  const emails = new Map(authUsers.map((user) => [user.id, user.email ?? '']));

  return <main className="crm-page">
    <PageHeader eyebrow="SISTEMA" title="Configurações" description="Dados da empresa e administração dos acessos ao CRM." />
    {error || !company ? <div className="crm-error">Não foi possível carregar as configurações.</div> :
      <div className="settings-layout">
        <aside>
          <div><Building2 /><h2>{company.name}</h2><p>Dados legais, preferências e utilizadores autorizados.</p></div>
          <nav><a href="#empresa"><Settings /> Empresa</a><a href="#utilizadores"><Users /> Utilizadores</a></nav>
        </aside>
        <div className="settings-panels">
          <section className="settings-panel" id="empresa">
            <header><h2>Dados da empresa</h2><p>Confirme a informação legal antes de emitir documentos.</p></header>
            <form action={updateCompany} className="crm-form">
              <div className="form-grid">
                <label>Nome comercial<input name="name" defaultValue={company.name ?? ''} required /></label>
                <label>Nome fiscal<input name="legal_name" defaultValue={company.legal_name ?? ''} /></label>
                <label>NIF<input name="tax_id" defaultValue={company.tax_id ?? ''} /></label>
                <label>Telefone<input name="phone" type="tel" defaultValue={company.phone ?? ''} /></label>
                <label>Email<input name="email" type="email" defaultValue={company.email ?? ''} /></label>
                <label>Website<input name="website" type="url" defaultValue={company.website ?? ''} /></label>
                <label className="span-2">Morada<input name="address" defaultValue={company.address ?? ''} /></label>
                <label>IBAN<input name="iban" defaultValue={company.iban ?? ''} /></label>
                <label>IVA padrão (%)<input name="default_vat" type="number" min="0" max="100" step="0.01" defaultValue={company.default_vat ?? 23} /></label>
                <label>Moeda<input value={company.currency ?? 'EUR'} disabled /></label>
                <label>Fuso horário<input name="timezone" defaultValue={company.timezone ?? 'Europe/Lisbon'} required /></label>
              </div>
              <FormActions label="Guardar configurações" />
            </form>
          </section>
          <section className="settings-panel settings-users" id="utilizadores">
            <header className="settings-users-head">
              <div><h2>Utilizadores</h2><p>Crie contas, atualize dados, perfis e palavras-passe ou remova o acesso.</p></div>
              {admin && <CreatePanel title="Adicionar utilizador" description="Criar novo acesso ao CRM">
                <form action={createUser} className="crm-form">
                  <div className="form-grid">
                    <label>Nome completo<input name="full_name" minLength={2} required /></label>
                    <label>Email<input name="email" type="email" required /></label>
                    <label>Senha inicial<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
                    <label>Perfil<select name="role" defaultValue="COLABORADOR">{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
                  </div>
                  <FormActions label="Criar utilizador" />
                </form>
              </CreatePanel>}
            </header>
            {!admin ? <div className="crm-error">A gestão de acessos está disponível apenas no servidor administrativo.</div> : profiles?.length ?
              <div className="user-admin-list">{profiles.map((profile) => {
                const role = profile.role as (typeof roles)[number];
                return <article key={profile.id}>
                  <div className="user-admin-title"><span><UserCog /></span><div><strong>{profile.full_name}</strong><small>{emails.get(profile.id) || 'Email indisponível'}</small></div><b className={profile.active ? 'active' : 'inactive'}>{profile.active ? 'Ativo' : 'Sem acesso'}</b></div>
                  <form action={updateUser} className="crm-form user-edit-form">
                    <input name="id" type="hidden" value={profile.id} />
                    <label>Nome<input name="full_name" defaultValue={profile.full_name} required /></label>
                    <label>Email<input name="email" type="email" defaultValue={emails.get(profile.id)} required /></label>
                    <label>Perfil<select name="role" defaultValue={role}>{roles.map((item) => <option value={item} key={item}>{roleLabels[item]}</option>)}</select></label>
                    <label>Nova senha (opcional)<input name="new_password" type="password" minLength={10} autoComplete="new-password" /></label>
                    <label className="user-active"><input name="active" type="checkbox" defaultChecked={profile.active} /> Acesso ativo</label>
                    <button className="crm-primary" type="submit">Atualizar utilizador</button>
                  </form>
                  {profile.id !== identity.id && profile.active && <form action={removeUserAccess}><input name="id" type="hidden" value={profile.id} /><button className="danger-link" type="submit">Remover acesso</button></form>}
                </article>;
              })}</div> : <div className="crm-empty"><UserPlus /><p>Nenhum utilizador encontrado.</p></div>}
          </section>
        </div>
      </div>}
  </main>;
}
