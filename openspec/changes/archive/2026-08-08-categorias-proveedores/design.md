## Context

El backend es NestJS + Prisma. `backend/src` hoy solo implementa `auth`, `users`,
`health` y `prisma`. El schema de Prisma ya declara los modelos `Category` y
`Supplier` (tablas `categories` y `suppliers`) y la relación con `Product`
(`categoryId`/`supplierId` requeridos, FK a `products`), pero **no existe**
ningún módulo CRUD para ellos. `Supplier` carece del campo `contact`.

El patrón de referencia para el CRUD es `UsersModule`: controller con
`@Roles(Role.ADMIN)` a nivel de clase, guard global JWT, respuestas `{ data }`,
`ConflictException` para unicidad (pre-check + catch de `P2002`) y
`NotFoundException` para inexistentes. La motivación está en proposal.md.

## Goals / Non-Goals

**Goals:**
- Módulos NestJS `categories` y `suppliers` (controller, service, DTOs con
  class-validator) siguiendo el patrón de `UsersModule`.
- Migración de Prisma para agregar `Supplier.contact` (opcional).
- Regla de integridad en el delete: bloquear con `409` si hay productos
  activos asociados.
- Pantallas frontend de listado y alta/edición para ambos recursos.
- Tests unit y e2e cubriendo los escenarios mínimos de la spec.

**Non-Goals:**
- Baja lógica para categorías/proveedores (la baja es física).
- Vinculación masiva, importación, paginación ni búsqueda avanzada.
- Endpoints de consulta para OPERARIO (todo es ADMIN-only).

## Decisions

### Endpoints y respuestas
`POST /api/categories`, `GET /api/categories`, `PATCH /api/categories/:id`,
`DELETE /api/categories/:id`; análogos en `/api/suppliers`. Todos responden
`{ data }` y usan los códigos de la spec (201/200/204/400/404/409/403).
`PATCH` en lugar de `PUT` porque la edición es parcial (nombre y/o contacto).
Alternativa `PUT` descartada: obliga a mandar el recurso completo y no aporta
nada en un CRUD de 1-2 campos.

### Eliminación con productos asociados (409)
En el `remove`, el service cuenta productos asociados con
`product.count({ where: { categoryId: id } })`. Si es > 0 →
`ConflictException('No se puede eliminar: la categoría tiene productos asociados')`
(análogo para proveedores). El count considera TODOS los productos (activos y
dados de baja): como los productos usan baja lógica y nunca se eliminan
físicamente, un producto con `deletedAt` sigue referenciando por FK a la
categoría/proveedor y la DB no permite el delete. Se mantiene además un catch
de `P2003` (FK violada) mapeado al mismo `409` como respaldo ante carreras.
El `NotFoundException` de id inexistente se resuelve antes. No se usa
`onDelete: Restrict` de Prisma como control primario porque el mensaje del 409
sería genérico.

### Unicidad de nombre (409)
Mismo patrón que `UsersService.create`: pre-check con `findUnique({ name })`
y catch de `Prisma.PrismaClientKnownRequestError` código `P2002` como
respaldo ante condiciones de carrera, ambos mapeados a `ConflictException`.

### Uso de skills
- La creación de cada módulo NestJS (categories y suppliers) se delega a la
  skill `add-crud-nest`, que materializa module/controller/service/DTOs,
  guards y tests siguiendo los patrones del repo.
- El agregado de `Supplier.contact` (String?, opcional) al schema se hace con
  la skill `prisma-migrate` para generar la migración de forma segura.

### Frontend
Dos features (`categories` y `suppliers`) con pantalla de listado (tabla con
nombre, contacto y cantidad de productos) y formulario de alta/edición
(reutilizando el componente de formulario). Rutas protegidas por rol ADMIN en
el router. Alternativa descartada: pantalla única compartida por ambos
recursos — el template es casi idéntico, pero mantener features separadas
sigue la convención "una carpeta por CU" del repo.

## Risks / Trade-offs

- **Condición de carrera en delete** (se valida el count y en el ínterin se
  crea un producto) → Mitigación: no es bloqueante para el TP (concurrencia
  mínima); la FK de `Product.categoryId` impide un delete inconsistente a
  nivel de DB, y el manejo del error de FK (`P2003`) como `409` queda como
  respaldo.
- **Los productos dados de baja también bloquean la eliminación** (el count
  incluye todos los productos, ya que la FK impide el delete físico) →
  Mitigación: es el comportamiento esperado y documentado en la spec; la
  alternativa de borrar físicamente productos dados de baja viola la regla de
  inmutabilidad (`/.instructions.md` §2).
- **Schema ya existente sin módulos**: el modelo `Category`/`Supplier` está
  declarado pero sin código que lo use → Mitigación: verificar con
  `postgres`/Prisma que la tabla exista y esté vacía antes de migrar; la
  migración de `contact` es aditiva y no rompe datos.
- **`contact` nuevo campo**: el seed y e2e existentes no lo referencian, por
  lo que no hay impacto retroactivo.
