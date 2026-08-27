import { cn } from './cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-t-transparent align-middle text-current',
        sizeClasses[size],
        className,
      )}
    />
  );
}

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-md bg-border', className)}
    />
  );
}
