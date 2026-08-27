## Why

Las pantallas del frontend se construyeron incrementalmente change por change (`design-system`, `layout-navegacion`, `pantallas-crud`, `stock-y-dashboard`, y las pantallas de feature de IA) y cada una definió sus propios estados de carga/vacío/error y sus propias notificaciones. No hubo hasta ahora una pasada final que audite la app completa como un todo: navegación por teclado, foco visible, contraste AA medido en los componentes reales (no solo en el showcase), comportamiento responsive en pantallas chicas y consistencia de toasts de éxito/error tras cada acción. Antes de la entrega del TP hace falta esa pasada de calidad visual y accesibilidad sobre todas las pantallas, sin tocar lógica de negocio.

## What Changes

- Auditar y corregir, en cada pantalla de la app (login, dashboard, productos, categorías, proveedores, usuarios, stock, chat, búsqueda semántica/reposición, órdenes de compra, showcase), que los estados de carga usen skeleton/spinner del design-system, los estados vacíos usen el estado vacío de `Table`/sección y los estados de error se muestren dentro del layout (nunca una pantalla en blanco o negro descentrada).
- Agregar navegación por teclado completa y foco visible: orden de tabulación lógico en cada pantalla, anillo de foco visible en todo control interactivo (botones, inputs, ítems de sidebar, filas accionables), y verificar que el atrapado de foco del `Modal` (ya existente) siga cumpliendo tras los ajustes.
- Verificar y corregir contraste AA (4.5:1 texto normal, 3:1 texto grande) no solo en los tokens base sino en los estados reales usados en pantalla: texto sobre `Badge`, texto deshabilitado, placeholders, texto sobre estados hover/focus.
- Verificar responsive (<768px) en cada pantalla de feature, no solo en el `AppShell`/sidebar: formularios, tablas (scroll horizontal o layout alternativo), modales y el panel del `ChatWidget`.
- Uniformar los toasts de éxito/error tras cada acción de crear/editar/borrar en todas las pantallas de CRUD y en las acciones de confirmar/cancelar de órdenes de compra: éxito siempre notifica con `Toast` variante success; un error que no quede ya asociado a un campo del formulario (validación 400/409 de campo) siempre notifica con `Toast` variante error en lugar de fallar en silencio.

## Capabilities

### New Capabilities
- `pulido-accesibilidad`: requisitos transversales de calidad visual y accesibilidad aplicables a toda la app — estados de carga/vacío/error consistentes, navegación por teclado y foco visible, contraste AA en los componentes reales, responsive verificado por pantalla, y toasts de éxito/error uniformes tras cada acción.

### Modified Capabilities
(ninguna — las pantallas existentes conservan sus requirements actuales; este change agrega una capa transversal de calidad sin alterar el comportamiento ya especificado en `design-system`, `pantallas-crud`, `pantalla-stock`, `pantalla-dashboard`, `pantalla-chat`, `pantalla-restock` ni `navegacion-app`)

## Impact

- **Código afectado**: solo `frontend/src/` — componentes de `components/ui/*` (estilos de foco, contraste), pantallas de feature (`ProductsPage`, `CategoriesPage`, `SuppliersPage`, `UsersPage`, `StockPage`, `MovementsPage`, `DashboardPage`, `ChatWidget`, `RestockPage`, `PurchaseOrdersPage`, `UiShowcasePage`) y `AppShell`/navegación.
- **No afectado**: backend (`backend/src/**`), `chatbot/**`, contratos de API, `frontend/src/api`, hooks de datos, lógica de negocio.
- **Non-goals**: no se agregan features ni pantallas nuevas; solo pulido visual/accesibilidad sobre lo existente.
- **Restricciones**: reusar exclusivamente componentes del design-system ya existente (no se crean componentes UI nuevos salvo que un ajuste de foco/contraste lo requiera dentro de los componentes base actuales); no tocar lógica.
