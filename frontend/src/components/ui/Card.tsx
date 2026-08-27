import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-md border border-border bg-surface-alt p-6 shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
