import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createUser,
  deleteUser,
  listUsers,
  type ApiUser,
  type CreateUserInput,
  type UserRole,
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

const ROLES: UserRole[] = ['ADMIN', 'OPERARIO'];

export function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERARIO');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    setUsers(await listUsers());
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudieron cargar los usuarios',
          'error',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh, showToast]);

  function openCreate(): void {
    setName('');
    setEmail('');
    setPassword('');
    setRole('OPERARIO');
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const input: CreateUserInput = { name, email, password, role };
      await createUser(input);
      showToast('Usuario creado', 'success');
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
      await deleteUser(deleting.id);
      showToast('Usuario dado de baja', 'success');
      setDeleting(null);
      await refresh();
    } catch (err) {
      setDeleting(null);
      showToast(
        resolveFormError(err).global ?? 'No se pudo dar de baja al usuario',
        'error',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: TableColumn<ApiUser>[] = [
    { key: 'name', header: 'Nombre', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    {
      key: 'role',
      header: 'Rol',
      render: (row) => (
        <Badge variant={row.role === 'ADMIN' ? 'info' : 'neutral'}>{row.role}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <Button type="button" variant="danger" onClick={() => setDeleting(row)}>
          Dar de baja
        </Button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">
          Administración de usuarios
        </h2>
        <Button type="button" onClick={openCreate}>
          Nuevo usuario
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table
          columns={columns}
          rows={users}
          rowKey={(row) => row.id}
          emptyMessage="No hay usuarios cargados."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo usuario"
      >
        <form
          onSubmit={(event) => void handleCreate(event)}
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
          <FormField label="Email" required error={fieldError(fieldErrors, 'email')}>
            <Input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Contraseña inicial"
            required
            error={fieldError(fieldErrors, 'password')}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Rol" required error={fieldError(fieldErrors, 'role')}>
            <Select
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
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
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        message={deleting ? `¿Dar de baja a ${deleting.email}?` : ''}
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </section>
  );
}
