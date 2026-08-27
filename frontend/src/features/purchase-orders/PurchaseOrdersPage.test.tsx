import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrdersPage } from './PurchaseOrdersPage';
import { SessionContext } from '../../auth/SessionContext';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ApiError, type ApiPurchaseOrder, type StoredUser } from '../../api';

const { listPurchaseOrders, confirmPurchaseOrder, cancelPurchaseOrder } = vi.hoisted(() => ({
  listPurchaseOrders: vi.fn(),
  confirmPurchaseOrder: vi.fn(),
  cancelPurchaseOrder: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    listPurchaseOrders,
    confirmPurchaseOrder,
    cancelPurchaseOrder,
  };
});

const order: ApiPurchaseOrder = {
  id: 'order-1',
  estado: 'BORRADOR',
  origen: 'ASISTENTE',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  proveedor: { id: 'sup-1', name: 'Ferreterías SA' },
  items: [
    {
      id: 'item-1',
      cantidadSugerida: 5,
      producto: { id: 'prod-1', code: 'COD-1', name: 'Martillo' },
    },
  ],
};

function renderAs(role: 'ADMIN' | 'OPERARIO') {
  const user: StoredUser = { id: 'u1', email: 'x@x.com', name: 'X', role };
  return render(
    <SessionContext.Provider value={{ user, login: vi.fn(), logout: vi.fn() }}>
      <ToastProvider>
        <PurchaseOrdersPage />
      </ToastProvider>
    </SessionContext.Provider>,
  );
}

describe('PurchaseOrdersPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN ve los botones Confirmar/Cancelar para un borrador', async () => {
    listPurchaseOrders.mockResolvedValue([order]);
    renderAs('ADMIN');

    await waitFor(() => {
      expect(screen.getByText('Confirmar')).toBeTruthy();
    });
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('OPERARIO no ve los botones Confirmar/Cancelar', async () => {
    listPurchaseOrders.mockResolvedValue([order]);
    renderAs('OPERARIO');

    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });
    expect(screen.queryByText('Confirmar')).toBeNull();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  it('muestra el indicador de origen ASISTENTE', async () => {
    listPurchaseOrders.mockResolvedValue([order]);
    renderAs('ADMIN');

    await waitFor(() => {
      expect(screen.getByText('Sugerida por el asistente')).toBeTruthy();
    });
  });

  it('no muestra Confirmar/Cancelar para una orden ya CONFIRMADA', async () => {
    listPurchaseOrders.mockResolvedValue([{ ...order, estado: 'CONFIRMADA' }]);
    renderAs('ADMIN');

    await waitFor(() => {
      expect(screen.getByText('Confirmada')).toBeTruthy();
    });
    expect(screen.queryByText('Confirmar')).toBeNull();
  });

  it('confirmar una orden llama a la API y refresca el listado', async () => {
    listPurchaseOrders.mockResolvedValue([order]);
    confirmPurchaseOrder.mockResolvedValue({ ...order, estado: 'CONFIRMADA' });
    renderAs('ADMIN');

    await waitFor(() => screen.getByText('Confirmar'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(confirmPurchaseOrder).toHaveBeenCalledWith('order-1');
    });
  });

  it('muestra el error 409 al intentar confirmar una orden ya confirmada', async () => {
    listPurchaseOrders.mockResolvedValue([order]);
    confirmPurchaseOrder.mockRejectedValue(
      new ApiError(409, 'La orden de compra no está en estado BORRADOR'),
    );
    renderAs('ADMIN');

    await waitFor(() => screen.getByText('Confirmar'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'no está en estado BORRADOR',
      );
    });
  });
});
