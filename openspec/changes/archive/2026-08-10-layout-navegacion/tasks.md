## 1. Fuente única de verdad de navegación

- [x] 1.1 Crear `frontend/src/navigation/navigation.ts` con el tipo `NavItem { id, label, roles }` y la lista `NAV_ITEMS` canónica en orden fijo: Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Reposición, Órdenes de compra (sin "UI showcase")
- [x] 1.2 Definir `visibleNavItems(role: NavRole): NavItem[]` que filtra `NAV_ITEMS` por el rol, como función pura y tipada

## 2. Integración en App.tsx

- [x] 2.1 Reemplazar los arreglos `ADMIN_ONLY_ITEMS`/`SHARED_ITEMS` de `App.tsx` por `visibleNavItems(user.role)` vía `useMemo` sobre `user.role` (mismo patrón de navegación por estado existente; `activeId`, `onNavigate`, `user` y `onLogout` del `AppShell` no cambian)
- [x] 2.2 Quitar "UI showcase" de los ítems de navegación: `UiShowcasePage` ya no se expone en la sidebar pero su valor `'ui-showcase'` en la union `AdminView` y su branch de render se conservan
- [x] 2.3 Confirmar que no se tocó `auth/SessionContext`, `useSession`, `Login`, `frontend/src/api`, el `AppShell` ni las pantallas de feature — solo cambió el cableado de navegación en `App.tsx`

## 3. Tests

- [x] 3.1 `frontend/src/navigation/navigation.test.ts`: verifica el orden exacto de `NAV_ITEMS` (8 ítems, sin "UI showcase") y que `visibleNavItems` devuelve solo los ítems del rol (OPERARIO sin Usuarios/Categorías/Proveedores/Productos; ADMIN con los 8)
- [x] 3.2 `frontend/src/App.test.tsx`: renderiza `<App />` envuelto en `SessionContext.Provider` (patrón de `PurchaseOrdersPage.test.tsx`) mockeando `src/api` con `vi.mock`/`vi.hoisted`; verifica por rol la presencia/ausencia de ítems en la sidebar
- [x] 3.3 En `App.test.tsx`, verificar resaltado de activa: la vista inicial muestra su ítem con `aria-current="page"` y al hacer clic en otro ítem la vista cambia y el resaltado se mueve
- [x] 3.4 En `App.test.tsx`, verificar que el header muestra nombre y rol del usuario, que no existe el ítem "UI showcase", y que el logout (clic en "Cerrar sesión") llama a `logout` del contexto y la app pasa a mostrar el login

## 4. Verificación final

- [x] 4.1 Verificar manualmente los criterios en la UI (desktop y viewport <768px): navegación funciona y resalta la activa; OPERARIO no ve ítems solo-ADMIN; logout devuelve al login; contenido centrado en pantalla ancha
- [x] 4.2 Ejecutar la verificación completa `npx tsc --noEmit && npm run lint && npm run test` en `frontend/` y confirmar que terminan sin errores
