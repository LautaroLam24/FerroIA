## Why

Las pantallas de CRUD de Productos (CU03), Categorías y Proveedores (CU04) y
Usuarios (CU02) hoy usan HTML crudo (inputs y tablas con clases ad-hoc,
`window.confirm` para confirmar bajas, sin estado de carga ni vacío explícito y
con errores de backend mostrados en un único párrafo). El design-system ya
provee los componentes base necesarios (Table con estado vacío, Modal, FormField
con error, Badge, Button) que estas pantallas no aprovechan. El objetivo es
rediseñar las pantallas sobre esos componentes para una experiencia coherente,
accesible y consistente con el resto del sistema.

## What Changes

- Rediseñar las pantallas de listado de Productos, Categorías, Proveedores y
  Usuarios usando el componente `Table` (con estado vacío y estado de carga
  explícitos) y `Button` con variantes apropiadas.
- Mover alta y edición a un `Modal` con formulario construido con `FormField`,
  mostrando la validación del backend (400/409) asociada a cada campo, de forma
  clara y visible dentro del formulario.
- Reemplazar `window.confirm` por un `Modal` de confirmación antes de ejecutar
  cualquier baja (producto, categoría, proveedor, usuario).
- Mostrar `Badge` para el rol en la tabla de Usuarios y para el indicador de
  stock bajo mínimo en la tabla de Productos (`stock <= stockMin`).
- Conservar intactos los filtros/búsqueda existentes (incluida la búsqueda
  semántica) y la paginación, aplicándoles solo el estilo del design-system.
- No cambiar contratos de API, `src/api`, ni los hooks/estado de datos actuales.

## Capabilities

### New Capabilities
- `pantallas-crud`: Comportamiento de las pantallas frontend de CRUD (Productos,
  Categorías, Proveedores, Usuarios): listado con Table (carga + vacío), alta y
  edición en Modal con FormField y validación visible, confirmación de baja en
  Modal, Badge de rol y de stock bajo mínimo.

### Modified Capabilities
<!-- No se modifican contratos ni requisitos de los specs existentes: los specs
de gestion-productos, categorias, proveedores y user-management describen
comportamiento de API, que este change no altera. -->

## Impact

- `frontend/src/features/products/ProductsPage.tsx` y `SemanticSearch.tsx`
  (estilo del input, sin cambiar lógica).
- `frontend/src/features/categories/CategoriesPage.tsx`
- `frontend/src/features/suppliers/SuppliersPage.tsx`
- `frontend/src/features/users/UsersPage.tsx`
- Reutiliza componentes existentes de `frontend/src/components/ui`
  (Table, Modal, FormField, Badge, Button, Input, Select, Card, Spinner).
- Sin impacto en backend, `frontend/src/api` ni hooks de datos.
