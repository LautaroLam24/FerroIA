import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-sm border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        invalid ? 'border-error' : 'border-border',
        className,
      )}
      {...rest}
    />
  );
}
