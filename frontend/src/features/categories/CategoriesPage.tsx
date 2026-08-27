import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type ApiCategory,
} from '../../api';
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
import { Spinner } from '../../components/ui/Spinner';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/useToast';

export function CategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    setCategories(await listCategories());
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudieron cargar las categorías',
          'error',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh, showToast]);

  function openCreate(): void {
    setEditingId(null);
    setName('');
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(category: ApiCategory): void {
    setEditingId(category.id);
    setName(category.name);
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, { name });
        showToast('Categoría actualizada', 'success');
      } else {
        await createCategory({ name });
        showToast('Categoría creada', 'success');
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
      await deleteCategory(deleting.id);
      showToast('Categoría eliminada', 'success');
      if (editingId === deleting.id) {
        closeModal();
      }
      setDeleting(null);
      await refresh();
    } catch (err) {
      setDeleting(null);
      showToast(
        resolveFormError(err).global ?? 'No se pudo eliminar la categoría',
        'error',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: TableColumn<ApiCategory>[] = [
    { key: 'name', header: 'Nombre', render: (row) => row.name },
    { key: 'productCount', header: 'Productos', render: (row) => row.productCount },
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
          Administración de categorías
        </h2>
        <Button type="button" onClick={openCreate}>
          Nueva categoría
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table
          columns={columns}
          rows={categories}
          rowKey={(row) => row.id}
          emptyMessage="No hay categorías cargadas."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <FormField label="Nombre" required error={fieldError(fieldErrors, 'name')}>
            <Input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
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
              {editingId ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        message={
          deleting ? `¿Eliminar la categoría "${deleting.name}"?` : ''
        }
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </section>
  );
}
