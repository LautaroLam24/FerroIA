import { useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { Button } from '../ui/Button';

export interface AppShellNavItem {
  id: string;
  label: string;
}

export interface AppShellUser {
  name: string;
  role: string;
}

export interface AppShellProps {
  navItems: AppShellNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  user: AppShellUser;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Layout base de la app: no conoce roles ni RequireRole — recibe navItems ya
 * filtrados por quien lo use (ver design.md - Decisiones 3).
 */
export function AppShell({ navItems, activeId, onNavigate, user, onLogout, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navList = (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onNavigate(item.id);
              setMobileMenuOpen(false);
            }}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive ? 'bg-primary text-white' : 'text-text hover:bg-border/60',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text md:flex-row">
      <aside className="hidden border-b border-border bg-surface-alt md:block md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        {navList}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface-alt px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
          >
            ☰ Menú
          </button>

          <span className="text-sm font-medium text-text">
            {user.name} <span className="text-text-muted">({user.role})</span>
          </span>

          <Button variant="ghost" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </header>

        {mobileMenuOpen && (
          <div className="border-b border-border bg-surface-alt md:hidden">{navList}</div>
        )}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
