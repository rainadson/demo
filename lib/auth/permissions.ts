export const roles = ['ADMIN', 'COMERCIAL', 'GESTOR_OBRA', 'FINANCEIRO', 'COLABORADOR', 'CLIENTE'] as const;
export type Role = typeof roles[number];
export const resources = ['leads','clients','visits','quotes','projects','tasks','workers','materials','purchases','daily_logs','finance','documents','settings'] as const;
export type Resource = typeof resources[number];
const grants: Record<Role, readonly Resource[]> = {
  ADMIN: resources,
  COMERCIAL: ['leads','clients','visits','quotes'],
  GESTOR_OBRA: ['projects','tasks','workers','materials','purchases','daily_logs','documents'],
  FINANCEIRO: ['finance'],
  COLABORADOR: ['projects','tasks','daily_logs'],
  CLIENTE: [],
};
export function isRole(value: unknown): value is Role { return typeof value === 'string' && roles.some(role => role === value); }
export function canAccess(role: Role, resource: Resource): boolean { return grants[role].includes(resource); }
export function canAccessAssigned(role: Role, resource: Resource, assigned: boolean): boolean {
  return canAccess(role, resource) && (role !== 'COLABORADOR' || assigned);
}
export type Identity = { id: string; companyId: string; role: Role; fullName: string };
