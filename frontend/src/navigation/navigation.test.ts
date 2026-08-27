import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, visibleNavItems } from './navigation';

describe('NAV_ITEMS', () => {
  it('define los 8 ítems canónicos en orden fijo sin "UI showcase"', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      'Dashboard',
      'Productos',
      'Categorías',
      'Proveedores',
      'Usuarios',
      'Stock',
      'Reposición',
      'Órdenes de compra',
    ]);
    expect(NAV_ITEMS.some((item) => item.label === 'UI showcase')).toBe(false);
  });
});

describe('visibleNavItems', () => {
  it('ADMIN ve los 8 ítems', () => {
    expect(visibleNavItems('ADMIN').map((item) => item.label)).toEqual(
      NAV_ITEMS.map((item) => item.label),
    );
  });

  it('OPERARIO no ve Usuarios, Categorías, Proveedores ni Productos', () => {
    expect(visibleNavItems('OPERARIO').map((item) => item.label)).toEqual([
      'Dashboard',
      'Stock',
      'Reposición',
      'Órdenes de compra',
    ]);
  });

  it('cada ítem solo-ADMIN queda fuera de la vista OPERARIO', () => {
    const adminOnly = NAV_ITEMS.filter((item) => item.roles.includes('ADMIN'));
    for (const item of adminOnly) {
      if (!item.roles.includes('OPERARIO')) {
        expect(visibleNavItems('OPERARIO').map((i) => i.id)).not.toContain(item.id);
      }
    }
  });
});
