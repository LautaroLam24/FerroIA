import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockSaleForm } from './StockSaleForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { ApiProduct, ApiStockMovement } from '../../api';

const { listProducts, createStockSale } = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createStockSale: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    listProducts,
    createStockSale,
  };
});

const product: ApiProduct = {
  id: 'prod-1',
  name: 'Martillo',
  code: 'MART-001',
  price: '1500',
  stock: 1,
  stockMin: 2,
  categoryId: 'cat-1',
  supplierId: 'sup-1',
  category: { id: 'cat-1', name: 'Herramientas' },
  supplier: { id: 'sup-1', name: 'Ferreterías SA' },
  lowStock: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const movement: ApiStockMovement = {
  id: 'move-2',
  type: 'VENTA',
  quantity: 5,
  reason: null,
  date: '2026-01-01T00:00:00.000Z',
  productId: product.id,
  userId: 'user-1',
  product: { id: product.id, name: product.name, code: product.code },
};

function renderForm(): void {
  render(
    <ToastProvider>
      <StockSaleForm />
    </ToastProvider>,
  );
}

describe('StockSaleForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra "Stock insuficiente" como error del campo cantidad cuando el backend responde 409', async () => {
    listProducts.mockResolvedValue({
      data: [product],
      meta: { total: 1, page: 1, pageSize: 100 },
    });
    const { ApiError } = await import('../../api');
    createStockSale.mockRejectedValue(
      new ApiError(409, 'Stock insuficiente'),
    );

    renderForm();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Martillo/ })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Producto/), {
      target: { value: product.id },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Registrar venta/ }));

    await waitFor(() => {
      const quantity = screen.getByLabelText(/Cantidad/);
      const describedBy = quantity.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(
        document.getElementById(describedBy as string)?.textContent,
      ).toBe('Stock insuficiente');
      expect((quantity as HTMLInputElement).value).toBe('5');
    });
    expect(createStockSale).toHaveBeenCalledWith({
      productId: product.id,
      quantity: 5,
    });
  });

  it('registra la venta y notifica el éxito cuando el backend responde 201', async () => {
    listProducts.mockResolvedValue({
      data: [product],
      meta: { total: 1, page: 1, pageSize: 100 },
    });
    createStockSale.mockResolvedValue(movement);

    renderForm();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Martillo/ })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Producto/), {
      target: { value: product.id },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Registrar venta/ }));

    await waitFor(() => {
      expect(createStockSale).toHaveBeenCalledWith({
        productId: product.id,
        quantity: 5,
      });
    });
    expect(screen.getByText('Venta registrada correctamente')).toBeTruthy();
  });
});
