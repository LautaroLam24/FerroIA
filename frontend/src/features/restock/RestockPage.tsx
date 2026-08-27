import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  suggestRestock,
  type RestockGroup,
  type RestockItem,
  type RestockSuggestion,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useChatLauncher } from '../chatbot/ChatLauncherContext';

const UNAVAILABLE_MESSAGE =
  'La sugerencia de reposición no está disponible en este momento. Probá de nuevo más tarde.';

function formatError(error: unknown): string {
  if (error instanceof ApiError && error.status === 502) {
    return UNAVAILABLE_MESSAGE;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}

function buildDraftMessage(group: RestockGroup): string {
  const items = group.items
    .map(
      (item) =>
        `- ${item.code} ${item.name}: cantidad sugerida ${item.suggestedQuantity}`,
    )
    .join('\n');
  return `Necesito un borrador de orden de compra para el proveedor "${group.supplierName}" con estos productos:\n${items}`;
}

const itemColumns: TableColumn<RestockItem>[] = [
  { key: 'code', header: 'Código', render: (row) => row.code },
  { key: 'name', header: 'Producto', render: (row) => row.name },
  { key: 'currentStock', header: 'Stock actual', render: (row) => row.currentStock },
  { key: 'stockMin', header: 'Stock mínimo', render: (row) => row.stockMin },
  {
    key: 'suggestedQuantity',
    header: 'Cantidad sugerida',
    render: (row) => row.suggestedQuantity,
  },
];

export interface RestockPageProps {
  onNavigateToPurchaseOrders: () => void;
}

export function RestockPage({ onNavigateToPurchaseOrders }: RestockPageProps) {
  const [suggestion, setSuggestion] = useState<RestockSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openChatWithMessage } = useChatLauncher();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSuggestion(await suggestRestock());
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Sugerencia de reposición</h2>
          <button
            type="button"
            onClick={onNavigateToPurchaseOrders}
            className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ver órdenes de compra →
          </button>
        </div>
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={() => void refresh()}
        >
          {loading ? 'Calculando…' : 'Recalcular'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-alt p-4 text-sm text-text-muted">
          <Spinner size="sm" />
          Calculando sugerencia de reposición…
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-error-soft px-3 py-2 text-sm text-error-soft-text"
        >
          {error}
        </p>
      ) : (
        suggestion && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">{suggestion.summary}</p>

            {suggestion.groups.length === 0 ? (
              <p className="text-sm text-text-muted">
                No hay productos bajo el stock mínimo en este momento.
              </p>
            ) : (
              suggestion.groups.map((group) => (
                <Card key={group.supplierId} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-text">
                      {group.supplierName}
                    </h3>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openChatWithMessage(buildDraftMessage(group))}
                    >
                      Pedir borrador al asistente
                    </Button>
                  </div>
                  <Table
                    columns={itemColumns}
                    rows={group.items}
                    rowKey={(row) => row.productId}
                    emptyMessage="Sin productos para este proveedor."
                  />
                </Card>
              ))
            )}
          </div>
        )
      )}
    </div>
  );
}
