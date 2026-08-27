import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestockPage } from './RestockPage';
import { ChatLauncherProvider, useChatLauncher } from '../chatbot/ChatLauncherContext';
import type { RestockSuggestion } from '../../api';

const { suggestRestock } = vi.hoisted(() => ({
  suggestRestock: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    suggestRestock,
  };
});

function PendingRequestProbe() {
  const { pendingRequest } = useChatLauncher();
  return <p data-testid="pending-request">{pendingRequest?.text ?? ''}</p>;
}

function renderPage(onNavigateToPurchaseOrders = vi.fn()) {
  render(
    <ChatLauncherProvider>
      <RestockPage onNavigateToPurchaseOrders={onNavigateToPurchaseOrders} />
      <PendingRequestProbe />
    </ChatLauncherProvider>,
  );
  return { onNavigateToPurchaseOrders };
}

const suggestionWithGroups: RestockSuggestion = {
  totalProducts: 1,
  summary: 'Hay 1 producto por debajo del stock mínimo.',
  groups: [
    {
      supplierId: 'sup-1',
      supplierName: 'Ferreterías SA',
      items: [
        {
          productId: 'prod-1',
          code: 'MART-001',
          name: 'Martillo',
          currentStock: 1,
          stockMin: 5,
          suggestedQuantity: 10,
        },
      ],
    },
  ],
};

describe('RestockPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('agrupa la sugerencia por proveedor en Card + Table', async () => {
    suggestRestock.mockResolvedValue(suggestionWithGroups);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });
    expect(screen.getByText('Martillo')).toBeTruthy();
    expect(screen.getByText('MART-001')).toBeTruthy();
  });

  it('muestra un estado de carga en lugar del panel anterior mientras recalcula', async () => {
    suggestRestock.mockResolvedValue(suggestionWithGroups);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });

    let resolveNext: (value: RestockSuggestion) => void = () => {};
    suggestRestock.mockReturnValue(
      new Promise((resolve) => {
        resolveNext = resolve;
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Recalcular/ }));

    expect(screen.getByText('Calculando sugerencia de reposición…')).toBeTruthy();
    expect(screen.queryByText('Ferreterías SA')).toBeNull();

    resolveNext(suggestionWithGroups);
    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });
  });

  it('muestra un estado vacío claro cuando no hay productos por reponer', async () => {
    suggestRestock.mockResolvedValue({
      totalProducts: 0,
      summary: 'No hay productos por reponer.',
      groups: [],
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No hay productos bajo el stock mínimo en este momento.'),
      ).toBeTruthy();
    });
  });

  it('muestra un aviso amable cuando el servicio responde 502', async () => {
    const { ApiError } = await import('../../api');
    suggestRestock.mockRejectedValue(new ApiError(502, 'Bad Gateway'));

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          'La sugerencia de reposición no está disponible en este momento. Probá de nuevo más tarde.',
        ),
      ).toBeTruthy();
    });
  });

  it('el botón "Pedir borrador al asistente" arma el mensaje y lo pasa al ChatLauncherContext', async () => {
    suggestRestock.mockResolvedValue(suggestionWithGroups);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pedir borrador al asistente' }));

    const pending = screen.getByTestId('pending-request').textContent ?? '';
    expect(pending).toContain('Ferreterías SA');
    expect(pending).toContain('MART-001');
    expect(pending).toContain('Martillo');
    expect(pending).toContain('10');
  });

  it('navega a Órdenes de compra al hacer clic en el enlace', async () => {
    suggestRestock.mockResolvedValue(suggestionWithGroups);
    const { onNavigateToPurchaseOrders } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ferreterías SA')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ver órdenes de compra →' }));

    expect(onNavigateToPurchaseOrders).toHaveBeenCalledTimes(1);
  });
});
