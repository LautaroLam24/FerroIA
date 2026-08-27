import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { DashboardData } from '../../api';

const { fetchDashboard } = vi.hoisted(() => ({
  fetchDashboard: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    fetchDashboard,
  };
});

const emptyData: DashboardData = {
  alerts: [],
  totalInventoryValue: 0,
  recentMovements: [],
};

const fullData: DashboardData = {
  alerts: [
    {
      id: 'alert-1',
      code: 'MART-001',
      name: 'Martillo',
      stock: 1,
      stockMin: 2,
      category: { id: 'cat-1', name: 'Herramientas' },
      supplier: { id: 'sup-1', name: 'Ferreterías SA' },
    },
  ],
  totalInventoryValue: 15000,
  recentMovements: [
    {
      id: 'move-1',
      type: 'VENTA',
      quantity: 5,
      reason: null,
      date: '2026-01-01T00:00:00.000Z',
      product: { id: 'prod-1', name: 'Martillo', code: 'MART-001' },
      user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
    },
  ],
};

function renderPage(): void {
  render(
    <ToastProvider>
      <DashboardPage />
    </ToastProvider>,
  );
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra skeleton mientras carga y no estados vacíos prematuros', async () => {
    let resolveFetch: (value: DashboardData) => void;
    fetchDashboard.mockReturnValue(
      new Promise<DashboardData>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderPage();

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Valorización del inventario')).toBeTruthy();
    expect(screen.queryByText('Sin alertas de stock.')).toBeNull();
    expect(screen.queryByText('Sin movimientos registrados.')).toBeNull();

    resolveFetch!(emptyData);

    await screen.findByText('Sin alertas de stock.');
    await screen.findByText('Sin movimientos registrados.');
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });

  it('muestra estados vacíos cuando no hay alertas ni movimientos', async () => {
    fetchDashboard.mockResolvedValue(emptyData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin alertas de stock.')).toBeTruthy();
      expect(screen.getByText('Sin movimientos registrados.')).toBeTruthy();
    });
  });

  it('muestra alertas con Badge de stock bajo y movimientos recientes', async () => {
    fetchDashboard.mockResolvedValue(fullData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
      expect(screen.getByText('Herramientas')).toBeTruthy();
      expect(screen.getByText('Stock bajo')).toBeTruthy();
      expect(screen.getByText(/15\.000/)).toBeTruthy();
      expect(screen.getByText('Martillo (MART-001)')).toBeTruthy();
      expect(screen.getByText('VENTA')).toBeTruthy();
      expect(screen.getByText('Ana')).toBeTruthy();
    });
  });
});
