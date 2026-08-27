import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-border text-text',
  success: 'bg-success-soft text-success-soft-text',
  warning: 'bg-warning-soft text-warning-soft-text',
  error: 'bg-error-soft text-error-soft-text',
  info: 'bg-info-soft text-info-soft-text',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
