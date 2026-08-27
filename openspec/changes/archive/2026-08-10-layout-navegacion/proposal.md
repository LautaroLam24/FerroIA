## Why

El design-system ya provee el `AppShell` (sidebar, header con usuario/rol + logout, contenedor de contenido centrado) y `App.tsx` lo monta, pero el set de ítems de navegación no está formalizado: incluye un ítem de desarrollo ("UI showcase") y la regla de visibilidad por rol está embebida ad-hoc en `App.tsx`. Hay que convertir la navegación por estado existente en el layout real y consistente de la app: sidebar con los ítems canónicos (Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Reposición, Órdenes de compra), resaltado de la ruta activa, y ocultamiento de los ítems solo-ADMIN cuando el rol es OPERARIO — reusando el estado de sesión y el `RequireRole` que ya existen, sin tocar la lógica de sesión.

## What Changes

- Definir una **fuente única de verdad de navegación**: set canónico de ítems (Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Reposición, Órdenes de compra) con orden fijo y metadato de rol por ítem.
- **Resaltado de ruta activa**: al navegar, el ítem correspondiente a la vista actual queda visualmente distinguido en la sidebar (mecanismo `activeId` existente del `AppShell`).
- **Filtrado por rol**: los ítems solo-ADMIN (Usuarios, Categorías, Proveedores, Productos) se ocultan de la sidebar cuando el rol es OPERARIO; Dashboard, Stock, Reposición y Órdenes de compra quedan visibles para ambos roles. Se reusa el estado de sesión (`useSession`) — no se modifica la lógica de sesión ni el guard de contenido (`RequireRole`).
- **Header con usuario y logout**: nombre + rol del usuario autenticado y botón "Cerrar sesión" que invoca el `logout` existente y devuelve a la pantalla de login.
- **Contenedor de contenido centrado**: todo el contenido de las vistas queda dentro del contenedor centrado de ancho máximo provisto por `AppShell` (sin contenido pegado al borde en pantallas anchas).
- **Responsive**: la sidebar colapsa a menú en viewports angostos (<768px).
- **"UI showcase" sale del menú de la app**: la vista queda funcional pero ya no se expone como ítem de navegación (acceso de desarrollo).

## Capabilities

### New Capabilities
- `navegacion-app`: navegación por estado del frontend sobre el `AppShell` del design-system — sidebar con ítems canónicos ordenados, resaltado de la ruta activa, filtrado de ítems por rol (OPERARIO no ve los solo-ADMIN), header con usuario/rol + logout y contenedor de contenido centrado.

### Modified Capabilities
<!-- (ninguna: el AppShell del design-system y su spec no cambian; este change define el cableado de la app sobre él) -->

## Impact

- **Código afectado:** solo `frontend/` — `frontend/src/App.tsx` (configuración de navegación y montaje del `AppShell`), una nueva fuente de datos de navegación (p. ej. `frontend/src/navigation/` con la lista de ítems + roles), y tests de frontend del comportamiento de navegación/roles. No se toca `frontend/src/api`, ni `auth/SessionContext`/`useSession`, ni el `AppShell` ni `components/ui/*`, ni ninguna pantalla de feature.
- **Dependencias:** ninguna nueva (se mantiene la navegación por estado; no se introduce react-router).
- **Backend / contrato de API:** sin cambios.
- **Verificación:** `npx tsc --noEmit && npm run lint && npm run test` (frontend) en verde; criterios de aceptación verificables en la UI (ver `specs/navegacion-app/spec.md`).

Cubre los casos de uso CU01–CU10 en su faceta de navegación entre las pantallas ya implementadas (no cambia la lógica de ningún CU).

## Non-goals

- Rediseñar el contenido interno de las pantallas de feature (ProductsPage, StockPage, Dashboard, etc.) — eso va en FE2+.
- Introducir rutas URL (`react-router`) — se mantiene la navegación por estado existente.
- Cambiar reglas de acceso de negocio del backend (qué puede ver/hacer cada rol en cada recurso); solo se alinea la visibilidad de los ítems de navegación con el guard de contenido ya existente.
- Modificar la lógica de sesión (`SessionContext`, `useSession`, `Login`).
