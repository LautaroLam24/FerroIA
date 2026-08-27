import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovementsPage } from './MovementsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { ApiProduct, ApiStockMovement } from '../../api';

const { listMovements, listProducts } = vi.hoisted(() => ({
  listMovements: vi.fn(),
  listProducts: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    listMovements,
    listProducts,
  };
});

const product: ApiProduct = {
  id: 'prod-1',
  name: 'Martillo',
  code: 'MART-001',
  price: '1500',
  stock: 10,
  stockMin: 2,
  categoryId: 'cat-1',
  supplierId: 'sup-1',
  category: { id: 'cat-1', name: 'Herramientas' },
  supplier: { id: 'sup-1', name: 'Ferreterías SA' },
  lowStock: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const movement: ApiStockMovement = {
  id: 'move-1',
  type: 'ENTRADA',
  quantity: 5,
  reason: 'Reposición',
  date: '2026-01-01T00:00:00.000Z',
  productId: product.id,
  userId: 'user-1',
  product: { id: product.id, name: product.name, code: product.code },
};

function renderPage(): void {
  render(
    <ToastProvider>
      <MovementsPage />
    </ToastProvider>,
  );
}

describe('MovementsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('aplica el filtro por producto al listar', async () => {
    listProducts.mockResolvedValue({
      data: [product],
      meta: { total: 1, page: 1, pageSize: 100 },
    });
    listMovements.mockResolvedValue([movement]);

    renderPage();

    await waitFor(() => {
      expect(listMovements).toHaveBeenCalledWith({});
    });

    fireEvent.change(screen.getByLabelText('Producto'), {
      target: { value: product.id },
    });

    await waitFor(() => {
      expect(listMovements).toHaveBeenCalledWith({ productId: product.id });
    });
  });

  it('muestra los movimientos cargados en la tabla', async () => {
    listProducts.mockResolvedValue({
      data: [product],
      meta: { total: 1, page: 1, pageSize: 100 },
    });
    listMovements.mockResolvedValue([movement]);

    renderPage();

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText('Martillo (MART-001)')).toBeTruthy();
      expect(within(table).getByText('ENTRADA')).toBeTruthy();
      expect(within(table).getByText('Reposición')).toBeTruthy();
    });
  });

  it('muestra estado vacío cuando no hay movimientos', async () => {
    listProducts.mockResolvedValue({
      data: [product],
      meta: { total: 1, page: 1, pageSize: 100 },
    });
    listMovements.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No hay movimientos para mostrar')).toBeTruthy();
    });
  });
});
