import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-secondary text-white hover:bg-slate-800',
  ghost: 'bg-transparent text-text hover:bg-border/60',
  danger: 'bg-error text-white hover:bg-red-800',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
