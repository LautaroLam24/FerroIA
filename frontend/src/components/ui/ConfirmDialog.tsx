import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  message: ReactNode;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  message,
  title = 'Confirmar baja',
  confirmLabel = 'Confirmar',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-text">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
