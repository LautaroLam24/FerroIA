import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Sobre <dialog> nativo: showModal()/close() ya proveen focus trap y cierre
 * con Escape sin reimplementarlos a mano (ver design.md - Decisiones 3).
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className={cn(
        'm-auto w-full max-w-md rounded-lg border border-border bg-surface-alt p-6 text-text shadow-lg backdrop:bg-slate-900/50',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-sm text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
