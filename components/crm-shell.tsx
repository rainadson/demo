import Link from 'next/link';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CreditCard,
  FileArchive,
  FileText,
  HardHat,
  Images,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import { Brand } from './brand';
import {
  canAccess,
  type Identity,
  type Resource,
} from '@/lib/auth/permissions';
import { signOut } from '@/features/auth/actions';
import { CrmSearch } from './crm/crm-search';
const groups: {
  label: string;
  links: [string, typeof LayoutDashboard, string, Resource | null][];
}[] = [
  { label: 'GERAL', links: [['/crm', LayoutDashboard, 'Visão geral', null]] },
  {
    label: 'COMERCIAL',
    links: [
      ['/crm/leads', BriefcaseBusiness, 'Leads', 'leads'],
      ['/crm/clientes', Users, 'Clientes', 'clients'],
      ['/crm/agenda', CalendarDays, 'Agenda', 'visits'],
      ['/crm/orcamentos', FileText, 'Orçamentos', 'quotes'],
    ],
  },
  {
    label: 'OPERAÇÕES',
    links: [
      ['/crm/obras', Building2, 'Obras', 'projects'],
      ['/crm/tarefas', ClipboardCheck, 'Tarefas', 'tasks'],
      ['/crm/equipa', HardHat, 'Equipa', 'workers'],
      ['/crm/documentos', FileArchive, 'Documentos', 'documents'],
      ['/crm/portfolio', Images, 'Portfólio', 'projects'],
    ],
  },
  {
    label: 'COMPRAS',
    links: [
      ['/crm/fornecedores', Truck, 'Fornecedores', 'materials'],
      ['/crm/materiais', Package, 'Materiais', 'materials'],
      ['/crm/compras', ShoppingCart, 'Compras', 'purchases'],
      ['/crm/pedidos-material', ClipboardList, 'Pedidos da equipa', 'purchases'],
    ],
  },
  {
    label: 'FINANCEIRO',
    links: [
      ['/crm/financeiro', CreditCard, 'Visão financeira', 'finance'],
      ['/crm/despesas', ReceiptText, 'Despesas', 'finance'],
      ['/crm/pagamentos', Contact, 'Pagamentos', 'finance'],
      ['/crm/relatorios', BarChart3, 'Relatórios', 'finance'],
    ],
  },
  {
    label: 'SISTEMA',
    links: [['/crm/configuracoes', Settings, 'Configurações', 'settings']],
  },
];
export function CrmShell({
  identity,
  children,
}: {
  identity: Identity;
  children: React.ReactNode;
}) {
  return (
    <div className="crm-shell">
      <aside className="crm-sidebar">
        <div className="crm-brand" style={{ flexShrink: 0 }}>
          <Brand />
          <small>GESTÃO DE OBRA</small>
        </div>
        <nav aria-label="CRM">
          {groups.map((group) => {
            const visible = group.links.filter(
              ([, , , resource]) =>
                resource === null || canAccess(identity.role, resource),
            );
            return visible.length ? (
              <section key={group.label}>
                <p>{group.label}</p>
                {visible.map(([href, Icon, label]) => (
                  <Link href={href} key={href}>
                    <Icon aria-hidden="true" size={17} />
                    <span>{label}</span>
                  </Link>
                ))}
              </section>
            ) : null;
          })}
        </nav>
        <div className="crm-user">
          <span>{identity.fullName}</span>
          <small>{identity.role.replaceAll('_', ' ')}</small>
          <form action={signOut}>
            <button aria-label="Terminar sessão">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </aside>
      <div className="crm-content">
        <header className="crm-topbar">
          <CrmSearch />
          <nav>
            <Link href="/crm/agenda">Agenda</Link>
            <Link href="/">Ver site</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
