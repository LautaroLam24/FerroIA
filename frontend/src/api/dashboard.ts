import { http } from './http';
import type { StockMovementType } from './stock';

export interface DashboardAlert {
  id: string;
  code: string;
  name: string;
  stock: number;
  stockMin: number;
  category: { id: string; name: string };
  supplier: { id: string; name: string };
}

export interface DashboardMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  date: string;
  product: { id: string; name: string; code: string };
  user: { id: string; name: string; email: string };
}

export interface DashboardData {
  alerts: DashboardAlert[];
  totalInventoryValue: number;
  recentMovements: DashboardMovement[];
}

export function fetchDashboard(): Promise<DashboardData> {
  return http.get<DashboardData>('/dashboard');
}
