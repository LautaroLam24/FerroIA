## Context

El design-system ya está implementado y verificado: `AppShell` (sidebar, header con usuario/rol + logout, contenedor centrado, responsive) y `App.tsx` ya lo monta con navegación por estado (`useState<AdminView>`, sin react-router). El estado de sesión vive en `auth/SessionContext` + `useSession` y el contenido de cada vista sigue gateado por `RequireRole`. Lo que falta es formalizar la capa de navegación: hoy el set de ítems y su visibilidad por rol están embebidos ad-hoc en `App.tsx` como dos arreglos (`ADMIN_ONLY_ITEMS` / `SHARED_ITEMS`) que además incluyen "UI showcase". Ver `proposal.md` - Why para la motivación completa; este documento cubre solo el cómo.

## Goals / Non-Goals

**Goals:**
- Consolidar la navegación en una fuente única de verdad tipada: ítems canónicos con orden fijo y metadato de roles por ítem.
- Derivar el filtrado por rol exclusivamente del estado de sesión existente (`useSession`), sin duplicar estado.
- Mantener el `AppShell` del design-system intacto: todo el trabajo de layout ya está resuelto ahí; acá solo se define qué se le pasa y cómo se filtra.
- Cubrir el comportamiento de navegación con tests (config pura + render de `App`).

**Non-Goals:**
- No cambiar `AppShell` ni `components/ui/*` (design-system).
- No tocar `auth/SessionContext`, `useSession`, `Login`, ni `frontend/src/api`.
- No modificar el contenido de las pantallas de feature ni sus tests existentes (FE2+).
- No introducir routing por URL.
- No perseguir accesibilidad por teclado/ARIA más allá de lo que ya provee `AppShell` (`aria-current`).

## Decisions

### 1. Fuente única de verdad de navegación (`frontend/src/navigation/navigation.ts`)

Nuevo módulo con:

```ts
export type NavRole = 'ADMIN' | 'OPERARIO';

export interface NavItem {
  id: string;      // coincide con el valor de AdminView
  label: string;   // texto visible en la sidebar
  roles: NavRole[]; // roles que ven el ítem
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',        label: 'Dashboard',        roles: ['ADMIN', 'OPERARIO'] },
  { id: 'products',         label: 'Productos',        roles: ['ADMIN'] },
  { id: 'categories',       label: 'Categorías',       roles: ['ADMIN'] },
  { id: 'suppliers',        label: 'Proveedores',      roles: ['ADMIN'] },
  { id: 'users',            label: 'Usuarios',         roles: ['ADMIN'] },
  { id: 'stock',            label: 'Stock',            roles: ['ADMIN', 'OPERARIO'] },
  { id: 'restock',          label: 'Reposición',       roles: ['ADMIN', 'OPERARIO'] },
  { id: 'purchase-orders',  label: 'Órdenes de compra', roles: ['ADMIN', 'OPERARIO'] },
];

export function visibleNavItems(role: NavRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
```

- `id` = valor de `AdminView` → la relación nav ↔ vista es 1:1 y `onNavigate(id)` ya funciona sin mapa extra.
- El filtrado por rol queda declarativo y testeable sin render (función pura), y el orden canónico vive en un solo lugar.
- **Alternativa descartada:** mantener los dos arreglos en `App.tsx` (estado actual). Embeber la regla de roles en la estructura de los arreglos la hace implícita, duplica responsabilidad y no es testeable en aislamiento.

### 2. Filtrado por rol reusando `useSession`

`App.tsx` calcula los ítems con `useMemo(() => visibleNavItems(user.role), [user.role])` (patrón que ya usa) y se los pasa a `AppShell` como `navItems`. No se toca la lógica de sesión; el rol sale de la misma fuente que usa `RequireRole`, así la sidebar y el guard de contenido no pueden desalinearse por definición. Cuando la sesión cambia (login/logout/rol distinto), `user.role` cambia y el `useMemo` recalcula — cubre el scenario "El filtrado refleja el rol de la sesión actual".

### 3. "UI showcase" fuera del menú

`ui-showcase` se excluye de `NAV_ITEMS` pero se conserva como valor de la union `AdminView` y su rama de render en `App.tsx`. La vista sigue montable (acceso de desarrollo cambiando el estado inicial) sin romper el requirement del design-system de que el showcase es "accesible dentro de la aplicación autenticada"; simplemente ya no se expone como ítem de la sidebar. **Alternativa descartada:** eliminar `ui-showcase` de la union y el branch — habría roto el requirement del design-system y dejado la página sin forma de abrirse.

### 4. El layout en sí no cambia

Header (nombre/rol), botón "Cerrar sesión", contenedor centrado de ancho máximo, resaltado de activa y colapso responsive ya son responsabilidad del `AppShell` (design-system). Este change solo asegura que `App.tsx` siga pasándole `user={{ name, role }}`, `onLogout={logout}` y `activeId={view}`, y que `visibleNavItems` reemplace los arreglos inline.

### 5. Tests

- `navigation.test.ts`: verifica el orden de `NAV_ITEMS` y que `visibleNavItems` filtra según rol (OPERARIO no recibe Usuarios/Categorías/Proveedores/Productos).
- `App.test.tsx`: renderiza `<App />` envuelto en `SessionContext.Provider` (mismo patrón que `PurchaseOrdersPage.test.tsx`), mockeando `src/api` (dashboard y demás features) con `vi.mock`/`vi.hoisted`. Assertions: por rol se renderizan/ocultan los ítems; la vista activa tiene `aria-current="page"`; hacer clic en un ítem cambia la vista y el resaltado; "UI showcase" no aparece; el logout llama a `logout` del contexto y la app muestra el login. Sin `jest-dom`: usar `toBeTruthy()` / `queryByText(...).toBeNull()`.

## Risks / Trade-offs

- [Refactor de `App.tsx` podría romper alguna vista existente al tocar la estructura del layout] → Mitigación: el cambio se limita a `App.tsx` + el nuevo módulo de navegación; `AppShell`, features, `src/api` y `auth/*` no se tocan; se corre `tsc --noEmit && lint && test` completos.
- [Tests de `App` requieren mockear varias llamadas de API (la vista por defecto es Dashboard)] → Mitigación: se mockea `src/api` siguiendo el patrón existente con `vi.hoisted`; las pages quedan con datos vacíos, suficiente para testear el shell de navegación.
- [Ocultar "UI showcase" choca en superficie con el requirement del design-system de que es accesible en la app autenticada] → Decisión con el usuario: se oculta del menú; la vista queda registrada en la union y su branch de render, solo sin ítem de navegación. Documentado para evitar sorpresas al archivar.

## Migration Plan

Sin migración de datos ni de API. Orden seguro y revertible por commit:
1. Crear `frontend/src/navigation/navigation.ts` (config + filtro) — no afecta nada existente.
2. Refactor de `App.tsx` para usar `visibleNavItems(user.role)` y sacar "UI showcase" del menú — un solo commit, fácil de revertir.
3. Agregar `navigation.test.ts` y `App.test.tsx`.
4. Correr `npx tsc --noEmit && npm run lint && npm run test` (frontend).
5. Verificación manual de los criterios: navegación + resaltado en desktop y mobile, OPERARIO sin ítems de admin, logout, contenido centrado.
