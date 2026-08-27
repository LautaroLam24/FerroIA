import type { ReactNode } from 'react';
import { cn } from './cn';
import type { BadgeVariant } from './Badge';

export type ToastVariant = Exclude<BadgeVariant, 'neutral'>;

export interface ToastProps {
  variant: ToastVariant;
  message: ReactNode;
  onDismiss: () => void;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-success-soft text-success-soft-text',
  warning: 'bg-warning-soft text-warning-soft-text',
  error: 'bg-error-soft text-error-soft-text',
  info: 'bg-info-soft text-info-soft-text',
};

export function Toast({ variant, message, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg',
        variantClasses[variant],
      )}
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Descartar notificación"
        className="rounded-sm text-current opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        ✕
      </button>
    </div>
  );
}
