import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { SessionContext } from './auth/SessionContext';
import type { StoredUser } from './api';

const { fetchDashboard, listUsers } = vi.hoisted(() => ({
  fetchDashboard: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    fetchDashboard,
    listUsers,
  };
});

const ALL_NAV_LABELS = [
  'Dashboard',
  'Productos',
  'Categorías',
  'Proveedores',
  'Usuarios',
  'Stock',
  'Reposición',
  'Órdenes de compra',
];

const OPERARIO_NAV_LABELS = ['Dashboard', 'Stock', 'Reposición', 'Órdenes de compra'];

function SessionHarness({
  role,
  onLogout,
}: {
  role: 'ADMIN' | 'OPERARIO';
  onLogout?: () => void;
}) {
  const [user, setUser] = useState<StoredUser | null>({
    id: 'u1',
    email: 'ana@ferreteria.test',
    name: 'Ana',
    role,
  });

  return (
    <SessionContext.Provider
      value={{
        user,
        login: vi.fn(),
        logout: () => {
          onLogout?.();
          setUser(null);
        },
      }}
    >
      <App />
    </SessionContext.Provider>
  );
}

async function renderApp(role: 'ADMIN' | 'OPERARIO') {
  render(<SessionHarness role={role} />);
  await screen.findByRole('button', { name: 'Dashboard' });
}

describe('App - navegación por rol', () => {
  beforeEach(() => {
    fetchDashboard.mockResolvedValue({
      totalInventoryValue: 0,
      alerts: [],
      recentMovements: [],
    });
    listUsers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN ve los 8 ítems de navegación en la sidebar', async () => {
    await renderApp('ADMIN');

    for (const label of ALL_NAV_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('OPERARIO no ve los ítems solo-ADMIN', async () => {
    await renderApp('OPERARIO');

    for (const label of OPERARIO_NAV_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    for (const label of ['Usuarios', 'Productos', 'Categorías', 'Proveedores']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('resalta la vista activa y mueve el resaltado al navegar', async () => {
    await renderApp('ADMIN');

    expect(
      screen.getByRole('button', { name: 'Dashboard' }).getAttribute('aria-current'),
    ).toBe('page');

    fireEvent.click(screen.getByRole('button', { name: 'Usuarios' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Usuarios' }).getAttribute('aria-current'),
      ).toBe('page');
    });
    expect(
      screen.getByRole('button', { name: 'Dashboard' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('muestra nombre y rol del usuario en el header y no expone "UI showcase"', async () => {
    await renderApp('ADMIN');

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('(ADMIN)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'UI showcase' })).toBeNull();
  });

  it('logout llama a logout del contexto y vuelve al login', async () => {
    const onLogout = vi.fn();
    render(<SessionHarness role="ADMIN" onLogout={onLogout} />);
    await screen.findByRole('button', { name: 'Dashboard' });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(onLogout).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    });
  });
});
