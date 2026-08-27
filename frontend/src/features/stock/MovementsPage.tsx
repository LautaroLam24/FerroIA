import { useCallback, useEffect, useState } from 'react';
import {
  listMovements,
  listProducts,
  type ApiProduct,
  type ApiStockMovement,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { resolveFormError } from '../../components/ui/formErrors';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/useToast';

export function MovementsPage() {
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    const [movementsData, productsResult] = await Promise.all([
      listMovements({
        ...(productId && { productId }),
        ...(from && { from }),
        ...(to && { to }),
      }),
      listProducts({ pageSize: 100 }),
    ]);
    setMovements(movementsData);
    setProducts(productsResult.data);
  }, [productId, from, to]);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudieron cargar los movimientos',
          'error',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh, showToast]);

  const columns: TableColumn<ApiStockMovement>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (row) => new Date(row.date).toLocaleString(),
    },
    { key: 'type', header: 'Tipo', render: (row) => row.type },
    {
      key: 'product',
      header: 'Producto',
      render: (row) => `${row.product.name} (${row.product.code})`,
    },
    { key: 'quantity', header: 'Cantidad', render: (row) => row.quantity },
    { key: 'reason', header: 'Motivo', render: (row) => row.reason ?? '—' },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-text">Movimientos de stock</h3>

      <form
        className="flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface-alt p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh();
        }}
      >
        <FormField label="Producto" htmlFor="movements-product">
          <Select
            id="movements-product"
            name="productId"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Todos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Desde" htmlFor="movements-from">
          <Input
            id="movements-from"
            name="from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </FormField>
        <FormField label="Hasta" htmlFor="movements-to">
          <Input
            id="movements-to"
            name="to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </FormField>
        <Button type="submit" variant="secondary">
          Actualizar
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <Table
          columns={columns}
          rows={movements}
          rowKey={(row) => row.id}
          emptyMessage="No hay movimientos para mostrar"
        />
      )}
    </section>
  );
}
