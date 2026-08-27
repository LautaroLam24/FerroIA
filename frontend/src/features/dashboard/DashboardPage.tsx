import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboard,
  type DashboardAlert,
  type DashboardData,
  type DashboardMovement,
} from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { resolveFormError } from '../../components/ui/formErrors';
import { Skeleton } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/useToast';

function formatValue(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(value);
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    setData(await fetchDashboard());
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudo cargar el dashboard',
          'error',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh, showToast]);

  const alertColumns: TableColumn<DashboardAlert>[] = [
    { key: 'code', header: 'Código', render: (row) => row.code },
    { key: 'name', header: 'Producto', render: (row) => row.name },
    { key: 'category', header: 'Categoría', render: (row) => row.category.name },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.stock}
          <Badge variant="warning">Stock bajo</Badge>
        </span>
      ),
    },
    {
      key: 'stockMin',
      header: 'Stock mínimo',
      render: (row) => row.stockMin,
    },
  ];

  const movementColumns: TableColumn<DashboardMovement>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (row) => new Date(row.date).toLocaleString(),
    },
    { key: 'type', header: 'Tipo', render: (row) => row.type },
    { key: 'quantity', header: 'Cantidad', render: (row) => row.quantity },
    {
      key: 'product',
      header: 'Producto',
      render: (row) => `${row.product.name} (${row.product.code})`,
    },
    { key: 'user', header: 'Usuario', render: (row) => row.user.name },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-text">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-text-muted">Valorización del inventario</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-48" />
          ) : (
            <p className="mt-1 text-3xl font-semibold text-text">
              {formatValue(data?.totalInventoryValue ?? 0)}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm font-medium text-text-muted">Alertas de stock bajo</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-semibold text-text">
              {data?.alerts.length ?? 0}
            </p>
          )}
        </Card>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-text">Alertas de stock bajo</h3>
        {loading ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <Table
            columns={alertColumns}
            rows={data?.alerts ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Sin alertas de stock."
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-text">Movimientos recientes</h3>
        {loading ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <Table
            columns={movementColumns}
            rows={data?.recentMovements ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Sin movimientos registrados."
          />
        )}
      </section>
    </div>
  );
}
