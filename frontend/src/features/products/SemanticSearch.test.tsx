import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SemanticSearch } from './SemanticSearch';
import type { ApiProduct } from '../../api';

const { searchProductsSemantic } = vi.hoisted(() => ({
  searchProductsSemantic: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    searchProductsSemantic,
  };
});

function makeProduct(overrides: Partial<ApiProduct>): ApiProduct {
  return {
    id: 'prod-1',
    name: 'Pintura blanca',
    code: 'PINT-001',
    price: '2500',
    stock: 5,
    stockMin: 2,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    category: { id: 'cat-1', name: 'Pinturas' },
    supplier: { id: 'sup-1', name: 'Pinturerías SA' },
    lowStock: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function search(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('¿Qué estás buscando?'), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: /Buscar por similitud|Buscando…/ }));
}

describe('SemanticSearch', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el estado de carga mientras la búsqueda está en curso', async () => {
    let resolveSearch: (value: { data: ApiProduct[] }) => void = () => {};
    searchProductsSemantic.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(<SemanticSearch />);
    await search('pintura blanca lavable');

    expect(screen.getByRole('button', { name: /Buscando…/ })).toBeTruthy();

    resolveSearch({ data: [makeProduct({})] });

    await waitFor(() => {
      expect(screen.getByText('Pintura blanca')).toBeTruthy();
    });
  });

  it('muestra un estado vacío claro cuando no hay resultados', async () => {
    searchProductsSemantic.mockResolvedValue({ data: [] });

    render(<SemanticSearch />);
    await search('algo que no existe');

    await waitFor(() => {
      expect(screen.getByText('Sin resultados para esa búsqueda.')).toBeTruthy();
    });
  });

  it('muestra un aviso amable cuando el servicio responde 502', async () => {
    const { ApiError } = await import('../../api');
    searchProductsSemantic.mockRejectedValue(new ApiError(502, 'Bad Gateway'));

    render(<SemanticSearch />);
    await search('pintura');

    await waitFor(() => {
      expect(
        screen.getByText(
          'La búsqueda semántica no está disponible en este momento. Probá de nuevo más tarde.',
        ),
      ).toBeTruthy();
    });
  });
});
