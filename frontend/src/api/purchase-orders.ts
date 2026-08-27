import { http } from './http';

export type PurchaseOrderEstado = 'BORRADOR' | 'CONFIRMADA' | 'CANCELADA';
export type PurchaseOrderOrigen = 'MANUAL' | 'ASISTENTE';

export interface PurchaseOrderItem {
  id: string;
  cantidadSugerida: number;
  producto: { id: string; code: string; name: string };
}

export interface ApiPurchaseOrder {
  id: string;
  estado: PurchaseOrderEstado;
  origen: PurchaseOrderOrigen;
  createdBy: string;
  createdAt: string;
  proveedor: { id: string; name: string };
  items: PurchaseOrderItem[];
}

export function listPurchaseOrders(): Promise<ApiPurchaseOrder[]> {
  return http.get<ApiPurchaseOrder[]>('/purchase-orders');
}

export function getPurchaseOrder(id: string): Promise<ApiPurchaseOrder> {
  return http.get<ApiPurchaseOrder>(`/purchase-orders/${id}`);
}

export function confirmPurchaseOrder(id: string): Promise<ApiPurchaseOrder> {
  return http.patch<ApiPurchaseOrder>(`/purchase-orders/${id}/confirmar`);
}

export function cancelPurchaseOrder(id: string): Promise<ApiPurchaseOrder> {
  return http.patch<ApiPurchaseOrder>(`/purchase-orders/${id}/cancelar`);
}
