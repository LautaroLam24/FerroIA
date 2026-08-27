import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Toast, type ToastVariant } from './Toast';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: ReactNode;
}

export interface ToastContextValue {
  showToast: (message: ReactNode, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: ReactNode, variant: ToastVariant = 'info') => {
      const id = `toast-${nextId.current++}`;
      setToasts((current) => [...current, { id, variant, message }]);
      window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
            <Toast
              variant={toast.variant}
              message={toast.message}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
