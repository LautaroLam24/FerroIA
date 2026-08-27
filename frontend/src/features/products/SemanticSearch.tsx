import { useState, type FormEvent } from 'react';
import {
  ApiError,
  searchProductsSemantic,
  type ApiProduct,
} from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Table, type TableColumn } from '../../components/ui/Table';

const UNAVAILABLE_MESSAGE =
  'La búsqueda semántica no está disponible en este momento. Probá de nuevo más tarde.';

function formatError(error: unknown): string {
  if (error instanceof ApiError && error.status === 502) {
    return UNAVAILABLE_MESSAGE;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiProduct[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);
    setSearching(true);
    try {
      const response = await searchProductsSemantic(trimmed);
      setResults(response.data);
      setMessage(response.message ?? null);
    } catch (err) {
      setResults(null);
      setMessage(null);
      setError(formatError(err));
    } finally {
      setSearching(false);
    }
  }

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
  ];

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-text">Buscador semántico</h3>
        <p className="text-sm text-text-muted">
          Describí lo que necesitás en lenguaje natural, no hace falta que
          coincida con el nombre o el código del producto.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FormField label="¿Qué estás buscando?" className="min-w-[20rem] flex-1">
          <Input
            name="q"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej.: pintura blanca lavable para interior"
          />
        </FormField>
        <Button
          type="submit"
          variant="secondary"
          loading={searching}
          disabled={!query.trim()}
        >
          {searching ? 'Buscando…' : 'Buscar por similitud'}
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-error-soft px-3 py-2 text-sm text-error-soft-text"
        >
          {error}
        </p>
      )}

      {results !== null && (
        <>
          {message && <p className="text-sm text-text-muted">{message}</p>}
          <Table
            columns={columns}
            rows={results}
            rowKey={(row) => row.id}
            emptyMessage="Sin resultados para esa búsqueda."
          />
        </>
      )}
    </Card>
  );
}
