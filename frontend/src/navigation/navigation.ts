import type { UserRole } from '../api';

export type NavRole = UserRole;

export interface NavItem {
  id: string;
  label: string;
  roles: NavRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', roles: ['ADMIN', 'OPERARIO'] },
  { id: 'products', label: 'Productos', roles: ['ADMIN'] },
  { id: 'categories', label: 'Categorías', roles: ['ADMIN'] },
  { id: 'suppliers', label: 'Proveedores', roles: ['ADMIN'] },
  { id: 'users', label: 'Usuarios', roles: ['ADMIN'] },
  { id: 'stock', label: 'Stock', roles: ['ADMIN', 'OPERARIO'] },
  { id: 'restock', label: 'Reposición', roles: ['ADMIN', 'OPERARIO'] },
  { id: 'purchase-orders', label: 'Órdenes de compra', roles: ['ADMIN', 'OPERARIO'] },
];

export function visibleNavItems(role: NavRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
