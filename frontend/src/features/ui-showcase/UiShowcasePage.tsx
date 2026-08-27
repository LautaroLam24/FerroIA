import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Spinner, Skeleton } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/ui/FormField';
import { Card } from '../../components/ui/Card';
import { Table, type TableColumn } from '../../components/ui/Table';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';

interface DemoRow {
  id: string;
  producto: string;
  stock: number;
}

const demoRows: DemoRow[] = [
  { id: '1', producto: 'Martillo 500g', stock: 12 },
  { id: '2', producto: 'Pintura látex 4L', stock: 3 },
  { id: '3', producto: 'Tornillo autoperforante x100', stock: 40 },
];

const demoColumns: TableColumn<DemoRow>[] = [
  { key: 'producto', header: 'Producto', render: (row) => row.producto },
  { key: 'stock', header: 'Stock', render: (row) => row.stock },
];

const badgeVariants: BadgeVariant[] = ['neutral', 'success', 'warning', 'error', 'info'];

export function UiShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [showEmptyTable, setShowEmptyTable] = useState(false);
  const [fieldValue, setFieldValue] = useState('');
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Showcase de componentes</h1>
        <p className="text-sm text-text-muted">
          Todas las variantes de los componentes base del design system, para revisar de un
          vistazo.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Spinner / Skeleton</h2>
        <div className="flex flex-wrap items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <Skeleton className="h-4 w-40" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Input / Select / FormField</h2>
        <div className="grid max-w-md gap-4">
          <FormField label="Nombre del producto" hint="Como figura en el catálogo">
            <Input
              placeholder="Ej: Martillo 500g"
              value={fieldValue}
              onChange={(event) => setFieldValue(event.target.value)}
            />
          </FormField>
          <FormField label="Código" error="Este campo es obligatorio">
            <Input placeholder="Ej: MAR-500" />
          </FormField>
          <FormField label="Categoría">
            <Select defaultValue="">
              <option value="" disabled>
                Seleccionar...
              </option>
              <option value="herramientas">Herramientas</option>
              <option value="pinturas">Pinturas</option>
            </Select>
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Card</h2>
        <Card className="max-w-sm">
          <p className="text-sm text-text">Contenido de ejemplo dentro de una Card.</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Table</h2>
        <Button
          className="self-start"
          variant="ghost"
          onClick={() => setShowEmptyTable((value) => !value)}
        >
          {showEmptyTable ? 'Mostrar filas' : 'Mostrar estado vacío'}
        </Button>
        <Table
          columns={demoColumns}
          rows={showEmptyTable ? [] : demoRows}
          rowKey={(row) => row.id}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Badge</h2>
        <div className="flex flex-wrap gap-2">
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Modal / Dialog</h2>
        <Button className="self-start" onClick={() => setModalOpen(true)}>
          Abrir modal
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal de ejemplo">
          <p className="text-sm text-text-muted">
            Este modal usa &lt;dialog&gt; nativo: Escape lo cierra y el foco queda contenido
            adentro.
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Toast</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => showToast('Operación exitosa', 'success')}>
            Success
          </Button>
          <Button
            variant="ghost"
            onClick={() => showToast('Revisá los datos ingresados', 'warning')}
          >
            Warning
          </Button>
          <Button variant="ghost" onClick={() => showToast('No se pudo guardar', 'error')}>
            Error
          </Button>
          <Button
            variant="ghost"
            onClick={() => showToast('Hay una nueva actualización', 'info')}
          >
            Info
          </Button>
        </div>
      </section>
    </div>
  );
}
