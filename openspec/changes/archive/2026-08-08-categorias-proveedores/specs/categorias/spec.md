## Purpose

Administrar el catálogo maestro de categorías (nombre único) para clasificar
los productos del inventario.

## ADDED Requirements

### Requirement: Crear una categoría
El sistema SHALL exponer `POST /api/categories` que recibe `name` (string no
vacío, único) y crea una categoría, devolviendo `201` con la categoría creada.
Si ya existe una categoría con ese nombre SHALL responder `409`; si el body es
inválido (nombre vacío, ausente o no string) SHALL responder `400`.

#### Scenario: Alta exitosa
- **WHEN** un usuario ADMIN envía `POST /api/categories` con `{ "name": "Pinturas" }`
- **THEN** el sistema responde `201` con `{ "data": { "id", "name", "createdAt", "updatedAt" } }` y la categoría queda persistida

#### Scenario: Nombre duplicado
- **WHEN** un usuario ADMIN envía `POST /api/categories` con un `name` que ya existe
- **THEN** el sistema responde `409` con `{ "error": "Ya existe una categoría con ese nombre" }`

#### Scenario: Body inválido
- **WHEN** un usuario ADMIN envía `POST /api/categories` con `name` vacío, ausente o no string
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

### Requirement: Listar categorías
El sistema SHALL exponer `GET /api/categories` que devuelve `200` con el
listado de categorías, cada una con la cantidad de productos activos asociados.

#### Scenario: Listado exitoso
- **WHEN** un usuario ADMIN solicita `GET /api/categories`
- **THEN** el sistema responde `200` con `{ "data": [ { "id", "name", "productCount", "createdAt", "updatedAt" } ] }`

### Requirement: Editar una categoría
El sistema SHALL exponer `PATCH /api/categories/:id` que actualiza `name`,
devolviendo `200` con la categoría actualizada. Si el id no existe SHALL
responder `404`; si el nuevo nombre ya pertenece a otra categoría SHALL
responder `409`; si el body es inválido SHALL responder `400`.

#### Scenario: Edición exitosa
- **WHEN** un usuario ADMIN envía `PATCH /api/categories/:id` con `{ "name": "Esmaltes" }` sobre una categoría existente
- **THEN** el sistema responde `200` con `{ "data": { "id", "name", "createdAt", "updatedAt" } }`

#### Scenario: Categoría inexistente
- **WHEN** un usuario ADMIN envía `PATCH /api/categories/:id` con un id que no existe
- **THEN** el sistema responde `404` con `{ "error": "Categoría no encontrada" }`

#### Scenario: Nombre duplicado al editar
- **WHEN** un usuario ADMIN envía `PATCH /api/categories/:id` con un `name` que ya pertenece a otra categoría
- **THEN** el sistema responde `409` con `{ "error": "Ya existe una categoría con ese nombre" }`

### Requirement: Eliminar una categoría
El sistema SHALL exponer `DELETE /api/categories/:id` que elimina la categoría
y responde `204`. Si la categoría tiene productos asociados (activos o dados
de baja, ya que los productos usan baja lógica y nunca se eliminan
físicamente) SHALL responder `409` sin eliminar nada. Si el id no existe SHALL
responder `404`.

#### Scenario: Baja exitosa
- **WHEN** un usuario ADMIN envía `DELETE /api/categories/:id` sobre una categoría sin productos asociados
- **THEN** el sistema responde `204` sin body y la categoría deja de existir

#### Scenario: Baja con productos asociados
- **WHEN** un usuario ADMIN envía `DELETE /api/categories/:id` sobre una categoría que tiene al menos un producto asociado (activo o dado de baja)
- **THEN** el sistema responde `409` con `{ "error": "No se puede eliminar: la categoría tiene productos asociados" }` y la categoría no se elimina

#### Scenario: Categoría inexistente
- **WHEN** un usuario ADMIN envía `DELETE /api/categories/:id` con un id que no existe
- **THEN** el sistema responde `404` con `{ "error": "Categoría no encontrada" }`

### Requirement: Acceso restringido a ADMIN
El sistema SHALL exigir rol `ADMIN` para todos los endpoints de `/api/categories`. Un usuario autenticado con rol `OPERARIO` SHALL recibir `403` en cualquier operación sobre categorías.

#### Scenario: OPERARIO sin permiso
- **WHEN** un usuario autenticado con rol `OPERARIO` solicita cualquier endpoint de `/api/categories`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

#### Scenario: ADMIN con permiso
- **WHEN** un usuario autenticado con rol `ADMIN` solicita cualquier endpoint de `/api/categories`
- **THEN** el sistema procesa la request normalmente
