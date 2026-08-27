import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  listSuppliers,
  updateProduct,
  type ApiCategory,
  type ApiProduct,
  type ApiSupplier,
  type ProductQuery,
} from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import {
  fieldError,
  resolveFormError,
  type FieldErrors,
} from '../../components/ui/formErrors';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/useToast';
import { SemanticSearch } from './SemanticSearch';

interface FormState {
  name: string;
  code: string;
  description: string;
  price: string;
  stock: string;
  stockMin: string;
  categoryId: string;
  supplierId: string;
}

const emptyForm: FormState = {
  name: '',
  code: '',
  description: '',
  price: '',
  stock: '',
  stockMin: '',
  categoryId: '',
  supplierId: '',
};

interface FilterState {
  name: string;
  categoryId: string;
  supplierId: string;
  lowStock: boolean;
}

const emptyFilters: FilterState = {
  name: '',
  categoryId: '',
  supplierId: '',
  lowStock: false,
};

const PAGE_SIZE = 10;

export function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiProduct | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [draftName, setDraftName] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE });
  const { showToast } = useToast();

  const query: ProductQuery = useMemo(() => {
    const q: ProductQuery = {
      ...(filters.name ? { name: filters.name } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.lowStock ? { lowStock: true } : {}),
      page,
      pageSize: PAGE_SIZE,
    };
    return q;
  }, [filters, page]);

  const refresh = useCallback(async () => {
    const [result, categoriesData, suppliersData] = await Promise.all([
      listProducts(query),
      listCategories(),
      listSuppliers(),
    ]);
    setProducts(result.data);
    setMeta(result.meta);
    setCategories(categoriesData);
    setSuppliers(suppliersData);
  }, [query]);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudieron cargar los productos',
          'error',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh, showToast]);

  function openCreate(): void {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product: ApiProduct): void {
    setEditingId(product.id);
    setForm({
      name: product.name,
      code: product.code,
      description: product.description ?? '',
      price: product.price,
      stock: String(product.stock),
      stockMin: String(product.stockMin),
      categoryId: product.categoryId,
      supplierId: product.supplierId,
    });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
  }

  function applyFilters(next: Partial<FilterState>): void {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applyFilters({ name: draftName });
  }

  function clearFilters(): void {
    setDraftName('');
    setFilters(emptyFilters);
    setPage(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const input = {
        name: form.name,
        code: form.code,
        description: form.description ? form.description : undefined,
        price: Number(form.price),
        stock: Number(form.stock),
        stockMin: Number(form.stockMin),
        categoryId: form.categoryId,
        supplierId: form.supplierId,
      };
      if (editingId) {
        await updateProduct(editingId, input);
        showToast('Producto actualizado', 'success');
      } else {
        await createProduct(input);
        showToast('Producto creado', 'success');
      }
      closeModal();
      await refresh();
    } catch (err) {
      const resolved = resolveFormError(err);
      setFieldErrors(resolved.fieldErrors);
      if (resolved.global) {
        setFormError(resolved.global);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleting) {
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteProduct(deleting.id);
      showToast('Producto eliminado', 'success');
      if (editingId === deleting.id) {
        closeModal();
      }
      setDeleting(null);
      await refresh();
    } catch (err) {
      setDeleting(null);
      showToast(
        resolveFormError(err).global ?? 'No se pudo eliminar el producto',
        'error',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const columns: TableColumn<ApiProduct>[] = [
    { key: 'name', header: 'Nombre', render: (row) => row.name },
    { key: 'code', header: 'Código', render: (row) => row.code },
    { key: 'price', header: 'Precio', render: (row) => row.price },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.stock}
          {row.lowStock && <Badge variant="warning">Stock bajo</Badge>}
        </span>
      ),
    },
    { key: 'category', header: 'Categoría', render: (row) => row.category.name },
    { key: 'supplier', header: 'Proveedor', render: (row) => row.supplier.name },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => openEdit(row)}>
            Editar
          </Button>
          <Button type="button" variant="danger" onClick={() => setDeleting(row)}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">
          Administración de productos
        </h2>
        <Button type="button" onClick={openCreate}>
          Nuevo producto
        </Button>
      </div>

      <SemanticSearch />

      <form
        className="flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface-alt p-4"
        onSubmit={(event) => handleFilterSubmit(event)}
      >
        <FormField label="Buscar por nombre">
          <Input
            name="name"
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Ej.: pintura"
          />
        </FormField>
        <FormField label="Filtrar categoría">
          <Select
            name="categoryId"
            value={filters.categoryId}
            onChange={(event) => applyFilters({ categoryId: event.target.value })}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Filtrar proveedor">
          <Select
            name="supplierId"
            value={filters.supplierId}
            onChange={(event) => applyFilters({ supplierId: event.target.value })}
          >
            <option value="">Todos</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </FormField>
        <label className="flex items-center gap-2 pb-2 text-sm text-text">
          <input
            name="lowStock"
            type="checkbox"
            checked={filters.lowStock}
            onChange={(event) => applyFilters({ lowStock: event.target.checked })}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Solo stock bajo
        </label>
        <Button type="submit">Buscar</Button>
        <Button type="button" variant="secondary" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table
          columns={columns}
          rows={products}
          rowKey={(row) => row.id}
          emptyMessage="No hay productos cargados."
        />
      )}

      <nav
        className="flex items-center justify-center gap-4"
        aria-label="Paginación de productos"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-text-muted">
          Página {meta.page} de {totalPages} · {meta.total} productos
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
        </Button>
      </nav>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar producto' : 'Nuevo producto'}
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <FormField label="Nombre" required error={fieldError(fieldErrors, 'name')}>
            <Input
              name="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Código" required error={fieldError(fieldErrors, 'code')}>
            <Input
              name="code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              required
            />
          </FormField>
          <FormField
            label="Descripción"
            hint="Usada para la búsqueda semántica (opcional)"
            error={fieldError(fieldErrors, 'description')}
          >
            <Input
              name="description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Descripción del producto"
            />
          </FormField>
          <FormField label="Precio" required error={fieldError(fieldErrors, 'price')}>
            <Input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Stock" required error={fieldError(fieldErrors, 'stock')}>
              <Input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                required
              />
            </FormField>
            <FormField
              label="Stock mínimo"
              required
              error={fieldError(fieldErrors, 'stockMin')}
            >
              <Input
                name="stockMin"
                type="number"
                min="0"
                step="1"
                value={form.stockMin}
                onChange={(event) =>
                  setForm({ ...form, stockMin: event.target.value })
                }
                required
              />
            </FormField>
          </div>
          <FormField
            label="Categoría"
            required
            error={fieldError(fieldErrors, 'categoryId')}
          >
            <Select
              name="categoryId"
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
              required
            >
              <option value="" disabled>
                Seleccionar categoría
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Proveedor"
            required
            error={fieldError(fieldErrors, 'supplierId')}
          >
            <Select
              name="supplierId"
              value={form.supplierId}
              onChange={(event) =>
                setForm({ ...form, supplierId: event.target.value })
              }
              required
            >
              <option value="" disabled>
                Seleccionar proveedor
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>
          {formError && (
            <p role="alert" className="text-sm text-error">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        message={
          deleting ? `¿Eliminar el producto "${deleting.name}"?` : ''
        }
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </section>
  );
}
