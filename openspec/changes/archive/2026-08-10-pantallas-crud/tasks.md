## 1. Infraestructura compartida

- [x] 1.1 Crear helper `mapValidationErrors(details: unknown): { [field]: string }` que extraiga la propiedad como clave y el mensaje como texto (p. ej. `"price must not be less than 0"` → `{ price: "must not be less than 0" }`), con fallback vacío si `details` no es un array de strings
- [x] 1.2 Crear helper `fieldError(errors, field)` que resuelva el mensaje de un campo puntual y devuelva `undefined` si no hay error
- [x] 1.3 Crear componente `ConfirmDialog` sobre `Modal` (título "Confirmar baja", texto identificando el registro, botones Cancelar / Confirmar con variante danger y estado loading) reutilizable por las 4 pantallas
- [x] 1.4 Añadir tests unit del helper `mapValidationErrors` (mapeo por prefijo, details no-array, mensajes sin propiedad) y del render del `ConfirmDialog` (confirmar llama al callback, cancelar no)

## 2. Pantalla de Categorías (CU04)

- [x] 2.1 Reemplazar la tabla inline por `Table` con estado de carga (`Spinner`) y estado vacío (`emptyMessage`), conservando `listCategories`/`refresh`
- [x] 2.2 Mover alta/edición a `Modal` con formulario de `FormField` + `Input` (label y error por campo), precargando el registro en edición
- [x] 2.3 Mostrar errores 400/409 del backend asociados al campo (o alerta global en el Modal si no mapean)
- [x] 2.4 Reemplazar `window.confirm` de baja por `ConfirmDialog`, mostrando en pantalla el 409 de "categoría con productos asociados"
- [x] 2.5 Estilizar botones con `Button` (primary para crear, secondary para cancelar, danger para eliminar)
- [x] 2.6 Actualizar `CategoriesPage` para que cierre el Modal y refresque la tabla tras guardar con éxito

## 3. Pantalla de Proveedores (CU04)

- [x] 3.1 Reemplazar la tabla inline por `Table` con estado de carga y estado vacío, conservando `listSuppliers`/`refresh`
- [x] 3.2 Mover alta/edición a `Modal` con `FormField` (name requerido, contact opcional), precargando el registro en edición
- [x] 3.3 Mostrar errores 400/409 del backend asociados al campo (o alerta global en el Modal si no mapean)
- [x] 3.4 Reemplazar `window.confirm` de baja por `ConfirmDialog`, mostrando en pantalla el 409 de "proveedor con productos asociados"
- [x] 3.5 Estilizar botones con `Button` y cerrar el Modal + refrescar tras guardar con éxito

## 4. Pantalla de Usuarios (CU02)

- [x] 4.1 Reemplazar la tabla inline por `Table` con estado de carga y estado vacío, conservando `listUsers`/`refresh`
- [x] 4.2 Mover el alta a `Modal` con `FormField` (name, email, password, rol con `Select`) y validación visible de los errores 400/409 del backend
- [x] 4.3 Renderizar el rol con `Badge` (ADMIN → info, OPERARIO → neutral) en la columna "Rol"
- [x] 4.4 Reemplazar `window.confirm` de baja por `ConfirmDialog` y mostrar errores de backend en pantalla
- [x] 4.5 Estilizar botones con `Button` y cerrar el Modal + refrescar tras crear con éxito

## 5. Pantalla de Productos (CU03)

- [x] 5.1 Reemplazar la tabla inline por `Table` con estado de carga y estado vacío, conservando `listProducts`/`query`/`refresh` y la paginación (con `Button` estilizado)
- [x] 5.2 Renderizar el indicador de stock bajo mínimo como `Badge` (variante warning, "Stock bajo") cuando `product.lowStock` es verdadero, sin recalcular en el FE
- [x] 5.3 Mover alta/edición a `Modal` con `FormField` para name, code, description, price, stock, stockMin, y `Select` para categoría y proveedor, precargando el registro en edición
- [x] 5.4 Mostrar errores 400/409 del backend asociados al campo (p. ej. código duplicado en "code"), o alerta global en el Modal si no mapean
- [x] 5.5 Reemplazar `window.confirm` de baja por `ConfirmDialog`
- [x] 5.6 Estilizar el input de búsqueda y los selects/checkbox de filtros existentes con componentes del design-system sin cambiar la lógica de `applyFilters`
- [x] 5.7 Estilizar la búsqueda semántica (`SemanticSearch`) sin modificar su lógica

## 6. Verificación

- [x] 6.1 Actualizar los tests existentes de las pantallas tocadas (p. ej. `ProductsPage.test.tsx`) a la nueva estructura (Modal, `Table`, `ConfirmDialog`)
- [x] 6.2 Ejecutar la verificación completa del frontend (`npx tsc --noEmit` + `npm run lint` + `npm run test`) y corregir cualquier falla
