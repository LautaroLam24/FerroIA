import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { cn } from './cn';

interface ControllableProps {
  id?: string;
  'aria-describedby'?: string;
  invalid?: boolean;
}

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<ControllableProps>;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;
  const messageId = `${controlId}-message`;
  const message = error ?? hint;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': message ? messageId : undefined,
        invalid: Boolean(error),
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={controlId} className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {control}
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-error' : 'text-text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
