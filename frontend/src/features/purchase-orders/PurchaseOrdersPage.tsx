import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  listPurchaseOrders,
  type ApiPurchaseOrder,
} from '../../api';
import { RequireRole } from '../../auth/RequireRole';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/useToast';

const ESTADO_LABELS: Record<ApiPurchaseOrder['estado'], string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
};

const ESTADO_BADGE_VARIANT: Record<ApiPurchaseOrder['estado'], BadgeVariant> = {
  BORRADOR: 'neutral',
  CONFIRMADA: 'success',
  CANCELADA: 'error',
};

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listPurchaseOrders());
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  async function handleConfirmar(id: string): Promise<void> {
    setError(null);
    setActioningId(id);
    try {
      await confirmPurchaseOrder(id);
      showToast('Orden de compra confirmada', 'success');
      await refresh();
    } catch (err) {
      const message = formatError(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setActioningId(null);
    }
  }

  async function handleCancelar(id: string): Promise<void> {
    setError(null);
    setActioningId(id);
    try {
      await cancelPurchaseOrder(id);
      showToast('Orden de compra cancelada', 'success');
      await refresh();
    } catch (err) {
      const message = formatError(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setActioningId(null);
    }
  }

  const columns: TableColumn<ApiPurchaseOrder>[] = [
    { key: 'proveedor', header: 'Proveedor', render: (row) => row.proveedor.name },
    {
      key: 'items',
      header: 'Items',
      render: (row) =>
        row.items.map((item) => `${item.producto.name} x${item.cantidadSugerida}`).join(', '),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => (
        <Badge variant={ESTADO_BADGE_VARIANT[row.estado]}>{ESTADO_LABELS[row.estado]}</Badge>
      ),
    },
    {
      key: 'origen',
      header: 'Origen',
      render: (row) =>
        row.origen === 'ASISTENTE' ? (
          <Badge variant="info">Sugerida por el asistente</Badge>
        ) : null,
    },
    {
      key: 'createdAt',
      header: 'Creada',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <RequireRole role="ADMIN">
          {row.estado === 'BORRADOR' && (
            <div className="flex gap-2">
              <Button
                type="button"
                loading={actioningId === row.id}
                onClick={() => void handleConfirmar(row.id)}
              >
                Confirmar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={actioningId === row.id}
                onClick={() => void handleCancelar(row.id)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </RequireRole>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-text">Órdenes de compra</h2>

      {error && (
        <p role="alert" className="rounded-md bg-error-soft px-3 py-2 text-sm text-error-soft-text">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table
          columns={columns}
          rows={orders}
          rowKey={(row) => row.id}
          emptyMessage="No hay órdenes de compra para mostrar."
        />
      )}
    </section>
  );
}
