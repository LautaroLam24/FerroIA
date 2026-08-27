## Context

Las pantallas de CRUD de Productos (CU03), Categorías/Proveedores (CU04) y
Usuarios (CU02) usan HTML crudo: formularios inline al pie de la tabla,
`window.confirm` para confirmar bajas, errores de backend en un único `<p
role="alert">` y tablas con clases ad-hoc sin estado vacío ni de carga. El
design-system ya provee `Table` (con `emptyMessage`), `Modal`, `FormField` (con
`error` + `aria-describedby`), `Badge`, `Button`, `Input`, `Select`, `Card` y
`Spinner`, y el contrato de errores del backend es `{ error, details? }` donde
`details` es un array de strings de validación de class-validator (p. ej.
`"price must not be less than 0"`) y los 409 traen solo `error`. Ver
proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**
- Rediseñar las 4 pantallas reutilizando solo componentes de `components/ui` y
  tokens del design-system (sin estilos ad-hoc nuevos).
- Mapear errores de backend (400/409) a los campos del formulario dentro del
  Modal, con fallback a mensaje global visible.
- Reemplazar `window.confirm` por confirmación en Modal.
- Conservar la lógica de datos existente (hooks/estado, `src/api`) intacta.

**Non-Goals:**
- No tocar endpoints, DTOs ni contratos del backend.
- No tocar `frontend/src/api` ni los hooks de datos (solo se reordenan en el
  render).
- No agregar búsqueda avanzada: la lógica de filtros/búsqueda semántica ya
  existe, solo se estila el input.

## Decisions

### 1. Composición por pantalla: hooks existentes + capa de render con design-system
Cada página conserva su `refresh`, su estado y sus llamadas a `src/api`; solo
cambia el JSX. El listado usa `Table` con `columns`/`render`; la tabla se
sustituye por `Spinner` mientras carga (`loading` local) y `Table` muestra su
`emptyMessage` sin filas.
**Alternativa:** extraer un componente `CrudTable` genérico. Se descarta: las
columnas por pantalla difieren demasiado (acciones, badges, join de
categoría/proveedor) y un componente genérico agrega indirección sin valor.

### 2. Formularios de alta/edición dentro de Modal
El estado del formulario sigue siendo local de la página (misma `FormState`),
pero se renderiza dentro de `Modal` (usando `showModal()` nativo, que ya da
focus trap y cierre con Escape, ver design-system). El `FormField` envuelve cada
`Input`/`Select`; el `error` del field se pasa a `FormField` y el backend respeta
el contrato `{ error, details }`.
**Alternativa:** formularios en página separada/ruta propia. Se descarta: el TP
requiere fluidez; el Modal ya está soportado por el design-system.

### 3. Mapeo de errores 400 a campos
`details` viene como `string[]` de class-validator con el prefijo del nombre de
propiedad (`"price must not be less than 0"`, `"email must be an email"`). Se
agrega un helper `mapValidationErrors(details)` (en `features/...` o
`components/ui`) que extrae la propiedad como clave y el resto del mensaje como
texto del field. Reglas:
- El 409 (duplicado) llega solo como `error` (sin `details`): se asigna al campo
  correspondiente por heurística del mensaje (p. ej. mensajes que mencionan
  "código"/"nombre"/"email") y, si no coincide, se muestra como alerta global
  dentro del Modal (`role="alert"`).
- Los `details` que no mapean a ningún field caen a la alerta global.
Esto es un helper puro (fácil de testear unit).

### 4. Confirmación de baja reutilizable
Se agrega un componente pequeño `ConfirmDialog` construido sobre `Modal` (título
"Confirmar baja", texto con el identificador del registro, botones Cancelar /
Confirmar con variante `danger` y `loading` en el botón de confirmar mientras
espera el backend). El handler de baja existente (que llama a
`deleteProduct`/`deleteCategory`/etc.) se invoca solo tras confirmar.
**Alternativa:** seguir con `window.confirm`. Se descarta: es el criterio
explícito del change y el design-system exige Modal.

### 5. Badge de rol y de stock bajo
- Usuarios: columna "Rol" renderiza `Badge` (`ADMIN` → variante `info`,
  `OPERARIO` → variante `neutral`).
- Productos: la celda de stock renderiza un `Badge` variante `warning` con
  "Stock bajo" cuando `row.lowStock` es verdadero (indicador que ya calcula el
  backend, `stock <= stockMin`). No se recalcula en el FE.

### 6. Filtros/búsqueda y paginación
Se mantienen idénticos: los selects/checkbox del filtro pasan a componentes
`Select`/`Input` estilizados y los botones de paginación a `Button`; la lógica
(`query`, `applyFilters`, `setPage`) no se toca. La búsqueda semántica
(`SemanticSearch`) solo recibe estilo.

## Risks / Trade-offs

- [Tests existentes (p. ej. `ProductsPage.test.tsx`) asumen la UI vieja
  (inputs/`window.confirm`)] → Se actualizan los tests de las páginas tocadas a
  la nueva estructura (Modal, `Table`, `ConfirmDialog`) en el mismo change.
- [Mapeo de `details` por prefijo de propiedad es heurístico] → Fallback a alerta
  global dentro del Modal; el mapeo se aísla en un helper testeable.
- [`Modal` nativo tiene estilos de `dialog` por defecto en algunos navegadores]
  → El design-system ya lo normaliza (clases en `Modal.tsx`); no se agregan
  estilos nuevos.

## Migration Plan

Change puramente frontend: se despliega junto con el resto del frontend (Vite).
No hay migración de datos ni rollback de backend; si algo falla, se revierte el
commit de las pantallas. Los cambios son incrementales por pantalla (una a la
vez) para mantener el árbol siempre verificable (`tsc --noEmit` + lint +
tests).

## Open Questions

Ninguna: el alcance y los contratos están definidos en proposal.md y
specs/pantallas-crud/spec.md.
