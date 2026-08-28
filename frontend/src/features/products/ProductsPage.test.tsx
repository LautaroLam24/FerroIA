import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductsPage } from './ProductsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { ApiCategory, ApiProduct, ApiSupplier } from '../../api';
import type { ProductListResult } from '../../api/products';

const { listProducts, listCategories, listSuppliers } = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listCategories: vi.fn(),
  listSuppliers: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    listProducts,
    listCategories,
    listSuppliers,
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  };
});

const category: ApiCategory = {
  id: 'cat-1',
  name: 'Herramientas',
  productCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const supplier: ApiSupplier = {
  id: 'sup-1',
  name: 'Ferreterías SA',
  contact: null,
  productCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeProduct(overrides: Partial<ApiProduct>): ApiProduct {
  return {
    id: 'prod-1',
    name: 'Martillo',
    code: 'MART-001',
    price: '1500',
    stock: 10,
    stockMin: 2,
    categoryId: category.id,
    supplierId: supplier.id,
    category: { id: category.id, name: category.name },
    supplier: { id: supplier.id, name: supplier.name },
    lowStock: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function result(
  data: ApiProduct[],
  meta: ProductListResult['meta'],
): ProductListResult {
  return { data, meta };
}

function setupMock(data: ApiProduct[] = []): void {
  listCategories.mockResolvedValue([category]);
  listSuppliers.mockResolvedValue([supplier]);
  listProducts.mockResolvedValue(
    result(data, { total: data.length, page: 1, pageSize: 10 }),
  );
}

function renderPage(): void {
  render(
    <ToastProvider>
      <ProductsPage />
    </ToastProvider>,
  );
}

describe('ProductsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el indicador de stock bajo solo en los productos con stock <= stockMin', async () => {
    setupMock([
      makeProduct({ id: 'prod-normal', name: 'Martillo', lowStock: false }),
      makeProduct({
        id: 'prod-bajo',
        name: 'Clavos',
        stock: 1,
        stockMin: 5,
        lowStock: true,
      }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
    });

    const rows = screen.getAllByRole('row');
    const lowStockRow = rows.find((row) => row.textContent?.includes('Clavos'));
    const normalRow = rows.find((row) => row.textContent?.includes('Martillo'));

    expect(lowStockRow?.textContent).toContain('Stock bajo');
    expect(normalRow?.textContent).not.toContain('Stock bajo');
  });

  it('envía el filtro de nombre al buscar y resetea a la página 1', async () => {
    setupMock([makeProduct({ id: 'prod-p', name: 'Pintura Azul' })]);

    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });
    listProducts.mockClear();

    fireEvent.change(screen.getByLabelText('Buscar por nombre'), {
      target: { value: 'pintura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'pintura', page: 1 }),
      );
    });
  });

  it('re-consulta al cambiar el filtro de categoría', async () => {
    setupMock([makeProduct({})]);

    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });
    listProducts.mockClear();

    fireEvent.change(screen.getByLabelText('Filtrar categoría'), {
      target: { value: category.id },
    });

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: category.id, page: 1 }),
      );
    });
  });

  it('filtra solo stock bajo al activar el checkbox', async () => {
    setupMock([makeProduct({ lowStock: true })]);

    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });
    listProducts.mockClear();

    fireEvent.click(screen.getByLabelText('Solo stock bajo'));

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalledWith(
        expect.objectContaining({ lowStock: true, page: 1 }),
      );
    });
  });

  it('muestra la paginación con el total y navega a la siguiente página', async () => {
    listCategories.mockResolvedValue([category]);
    listSuppliers.mockResolvedValue([supplier]);
    listProducts.mockResolvedValue(
      result([makeProduct({})], { total: 25, page: 1, pageSize: 10 }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/)).toBeTruthy();
    });
    expect(screen.getByText(/25 productos/)).toBeTruthy();

    listProducts.mockResolvedValue(
      result([makeProduct({})], { total: 25, page: 2, pageSize: 10 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
    expect(screen.getByText(/Página 2 de 3/)).toBeTruthy();
  });

  it('desactiva Anterior en la primera página', async () => {
    setupMock([makeProduct({})]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 1/)).toBeTruthy();
    });

    expect(
      (screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('abre el modal de alta con el formulario vacío al hacer clic en "Nuevo producto"', async () => {
    setupMock([]);
    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));

    expect(screen.getByRole('heading', { name: 'Nuevo producto' })).toBeTruthy();
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('');
    expect(screen.getByLabelText(/^Código/)).toBeTruthy();
  });

  it('crea un producto desde el modal y re-consulta la lista', async () => {
    const { createProduct } = await import('../../api');
    setupMock([]);
    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));

    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Pincel' },
    });
    fireEvent.change(screen.getByLabelText(/^Código/), {
      target: { value: 'PIN-200' },
    });
    fireEvent.change(screen.getByLabelText(/^Precio/), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText(/^Stock\s*\*?$/), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText(/^Stock mínimo/), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/^Categoría/), {
      target: { value: category.id },
    });
    fireEvent.change(screen.getByLabelText(/^Proveedor/), {
      target: { value: supplier.id },
    });

    createProduct.mockResolvedValue(makeProduct({}));

    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pincel',
          code: 'PIN-200',
          price: 300,
          stock: 10,
          stockMin: 2,
          categoryId: category.id,
          supplierId: supplier.id,
        }),
      );
    });
    await waitFor(() => {
      expect(listProducts).toHaveBeenCalledTimes(2);
    });
  });

  it('precarga los datos del producto al editar', async () => {
    setupMock([makeProduct({ id: 'prod-e', name: 'Martillo', code: 'MART-001' })]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('heading', { name: 'Editar producto' })).toBeTruthy();
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe(
      'Martillo',
    );
    expect((screen.getByLabelText(/^Código/) as HTMLInputElement).value).toBe(
      'MART-001',
    );
    expect((screen.getByLabelText(/^Stock mínimo/) as HTMLInputElement).value).toBe(
      '2',
    );
  });

  it('el campo Stock queda deshabilitado al editar y no se envía en el PATCH', async () => {
    const { updateProduct } = await import('../../api');
    setupMock([makeProduct({ id: 'prod-e', name: 'Martillo', code: 'MART-001' })]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const stockInput = screen.getByLabelText(/^Stock\s*\*?$/) as HTMLInputElement;
    expect(stockInput.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Precio/), {
      target: { value: '1600' },
    });

    updateProduct.mockResolvedValue(makeProduct({ price: '1600' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalled();
    });
    const [, payload] = updateProduct.mock.calls[0] as [string, object];
    expect(payload).not.toHaveProperty('stock');
  });

  it('muestra el error 409 de código duplicado asociado al campo en el modal', async () => {
    const { ApiError, createProduct } = await import('../../api');
    setupMock([]);
    renderPage();

    await waitFor(() => {
      expect(listProducts).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));

    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Pincel' },
    });
    fireEvent.change(screen.getByLabelText(/^Código/), {
      target: { value: 'PIN-200' },
    });
    fireEvent.change(screen.getByLabelText(/^Precio/), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText(/^Stock\s*\*?$/), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText(/^Stock mínimo/), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/^Categoría/), {
      target: { value: category.id },
    });
    fireEvent.change(screen.getByLabelText(/^Proveedor/), {
      target: { value: supplier.id },
    });

    createProduct.mockRejectedValue(
      new ApiError(409, 'Ya existe un producto con ese código'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));

    await waitFor(() => {
      expect(screen.getByText('Ya existe un producto con ese código')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: 'Nuevo producto' })).toBeTruthy();
  });

  it('confirma la baja con el ConfirmDialog antes de eliminar', async () => {
    const { deleteProduct } = await import('../../api');
    setupMock([makeProduct({ id: 'prod-del', name: 'Martillo' })]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    const confirmDialog = screen
      .getAllByRole('dialog')
      .find((dialog) => dialog.textContent?.includes('¿Eliminar el producto "Martillo"?'));
    expect(confirmDialog).toBeTruthy();

    deleteProduct.mockResolvedValue(undefined);
    fireEvent.click(
      within(confirmDialog as HTMLElement).getByRole('button', { name: 'Confirmar' }),
    );

    await waitFor(() => {
      expect(deleteProduct).toHaveBeenCalledWith('prod-del');
    });
  });

  it('no elimina si se cancela la confirmación', async () => {
    const { deleteProduct } = await import('../../api');
    setupMock([makeProduct({ id: 'prod-del', name: 'Martillo' })]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Martillo')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    const confirmDialog = screen
      .getAllByRole('dialog')
      .find((dialog) => dialog.textContent?.includes('¿Eliminar el producto "Martillo"?'));
    expect(confirmDialog).toBeTruthy();

    fireEvent.click(
      within(confirmDialog as HTMLElement).getByRole('button', { name: 'Cancelar' }),
    );

    expect(deleteProduct).not.toHaveBeenCalled();
  });
});
