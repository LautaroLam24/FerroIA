import type { ReactNode } from 'react';
import { cn } from './cn';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No hay datos para mostrar.',
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-md border border-border', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface text-text-muted">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row)} className={index % 2 === 1 ? 'bg-surface' : 'bg-surface-alt'}>
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-2', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
