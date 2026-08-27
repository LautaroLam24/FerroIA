export { http, ApiError, onUnauthorized } from './http';
export { getToken, setToken, clearToken, getUser, setUser, clearUser } from './token';
export type { StoredUser, UserRole } from './token';
export { listUsers, createUser, deleteUser } from './users';
export type { ApiUser, CreateUserInput } from './users';
export {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories';
export type {
  ApiCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories';
export {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from './suppliers';
export type {
  ApiSupplier,
  CreateSupplierInput,
  UpdateSupplierInput,
} from './suppliers';
export {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products';
export type {
  ApiProduct,
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  ProductListResult,
} from './products';
export { createStockEntry, createStockSale, listMovements } from './stock';
export type {
  ApiStockMovement,
  CreateEntryInput,
  CreateSaleInput,
  ListMovementsFilters,
  StockMovementType,
} from './stock';
export { fetchDashboard } from './dashboard';
export type { DashboardData, DashboardAlert, DashboardMovement } from './dashboard';
export { sendChatMessage } from './chatbot';
export type { ChatRequestInput, ChatResponse } from './chatbot';
export { searchProductsSemantic, suggestRestock } from './semantic';
export type {
  SemanticSearchResult,
  RestockItem,
  RestockGroup,
  RestockSuggestion,
} from './semantic';
export {
  listPurchaseOrders,
  getPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
} from './purchase-orders';
export type {
  ApiPurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderEstado,
  PurchaseOrderOrigen,
} from './purchase-orders';
