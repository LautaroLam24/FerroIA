import type { ReactNode } from 'react';
import type { UserRole } from '../api';
import { useSession } from './useSession';

interface RequireRoleProps {
  role: UserRole | UserRole[];
  children: ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useSession();
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }
  return <>{children}</>;
}
