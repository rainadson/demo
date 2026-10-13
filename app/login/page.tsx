import { company } from '@/lib/config';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/features/auth/login-form';
import { supabaseSettings } from '@/lib/supabase/settings';
export default function Login() {
  return <main className="auth-page"><aside className="auth-aside"><Brand /><h1>Cada etapa.<br />Cada detalhe.<br /><span>Tudo ligado.</span></h1><p>{company.name}</p></aside><section className="auth-main"><div className="auth-box"><p className="eyebrow">ÁREA RESERVADA</p><h2>Bem-vindo à {company.shortName}.</h2><p>Aceda ao seu espaço de trabalho ou acompanhe a sua obra.</p>{supabaseSettings() ? <LoginForm /> : <div className="notice"><strong>Acesso em preparação</strong><p>A ligação segura está a ser configurada. O acesso será disponibilizado pelo administrador.</p></div>}<p>O acesso é atribuído pela {company.shortName}.</p></div></section></main>;
}

