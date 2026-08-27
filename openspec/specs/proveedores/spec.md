# proveedores Specification

## Purpose

Administrar el catálogo maestro de proveedores (nombre y contacto opcional)
para registrar el origen de reposición de los productos.

## Requirements

### Requirement: Crear un proveedor
El sistema SHALL exponer `POST /api/suppliers` que recibe `name` (string no
vacío, único) y `contact` (string opcional), crea un proveedor y devuelve
`201` con el proveedor creado. Si ya existe un proveedor con ese nombre SHALL
responder `409`; si el body es inválido (nombre vacío, ausente o no string;
contact no string) SHALL responder `400`.

#### Scenario: Alta exitosa
- **WHEN** un usuario ADMIN envía `POST /api/suppliers` con `{ "name": "Andrés Pinturas", "contact": "andres@mail.com" }`
- **THEN** el sistema responde `201` con `{ "data": { "id", "name", "contact", "createdAt", "updatedAt" } }` y el proveedor queda persistido

#### Scenario: Alta sin contacto
- **WHEN** un usuario ADMIN envía `POST /api/suppliers` con `{ "name": "Ferretería El Tornillo" }` sin `contact`
- **THEN** el sistema responde `201` con el proveedor creado y `contact` nulo

#### Scenario: Nombre duplicado
- **WHEN** un usuario ADMIN envía `POST /api/suppliers` con un `name` que ya existe
- **THEN** el sistema responde `409` con `{ "error": "Ya existe un proveedor con ese nombre" }`

#### Scenario: Body inválido
- **WHEN** un usuario ADMIN envía `POST /api/suppliers` con `name` vacío, ausente o no string (o `contact` no string)
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

### Requirement: Listar proveedores
El sistema SHALL exponer `GET /api/suppliers` que devuelve `200` con el
listado de proveedores, cada uno con la cantidad de productos activos
asociados.

#### Scenario: Listado exitoso
- **WHEN** un usuario ADMIN solicita `GET /api/suppliers`
- **THEN** el sistema responde `200` con `{ "data": [ { "id", "name", "contact", "productCount", "createdAt", "updatedAt" } ] }`

### Requirement: Editar un proveedor
El sistema SHALL exponer `PATCH /api/suppliers/:id` que actualiza `name` y/o
`contact`, devolviendo `200` con el proveedor actualizado. Si el id no existe
SHALL responder `404`; si el nuevo nombre ya pertenece a otro proveedor SHALL
responder `409`; si el body es inválido SHALL responder `400`.

#### Scenario: Edición exitosa
- **WHEN** un usuario ADMIN envía `PATCH /api/suppliers/:id` con `{ "contact": "nuevo@mail.com" }` sobre un proveedor existente
- **THEN** el sistema responde `200` con `{ "data": { "id", "name", "contact", "createdAt", "updatedAt" } }`

#### Scenario: Proveedor inexistente
- **WHEN** un usuario ADMIN envía `PATCH /api/suppliers/:id` con un id que no existe
- **THEN** el sistema responde `404` con `{ "error": "Proveedor no encontrado" }`

#### Scenario: Nombre duplicado al editar
- **WHEN** un usuario ADMIN envía `PATCH /api/suppliers/:id` con un `name` que ya pertenece a otro proveedor
- **THEN** el sistema responde `409` con `{ "error": "Ya existe un proveedor con ese nombre" }`

### Requirement: Eliminar un proveedor
El sistema SHALL exponer `DELETE /api/suppliers/:id` que elimina el proveedor
y responde `204`. Si el proveedor tiene productos asociados (activos o dados
de baja, ya que los productos usan baja lógica y nunca se eliminan
físicamente) SHALL responder `409` sin eliminar nada. Si el id no existe SHALL
responder `404`.

#### Scenario: Baja exitosa
- **WHEN** un usuario ADMIN envía `DELETE /api/suppliers/:id` sobre un proveedor sin productos asociados
- **THEN** el sistema responde `204` sin body y el proveedor deja de existir

#### Scenario: Baja con productos asociados
- **WHEN** un usuario ADMIN envía `DELETE /api/suppliers/:id` sobre un proveedor que tiene al menos un producto asociado (activo o dado de baja)
- **THEN** el sistema responde `409` con `{ "error": "No se puede eliminar: el proveedor tiene productos asociados" }` y el proveedor no se elimina

#### Scenario: Proveedor inexistente
- **WHEN** un usuario ADMIN envía `DELETE /api/suppliers/:id` con un id que no existe
- **THEN** el sistema responde `404` con `{ "error": "Proveedor no encontrado" }`

### Requirement: Acceso restringido a ADMIN
El sistema SHALL exigir rol `ADMIN` para todos los endpoints de `/api/suppliers`. Un usuario autenticado con rol `OPERARIO` SHALL recibir `403` en cualquier operación sobre proveedores.

#### Scenario: OPERARIO sin permiso
- **WHEN** un usuario autenticado con rol `OPERARIO` solicita cualquier endpoint de `/api/suppliers`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

#### Scenario: ADMIN con permiso
- **WHEN** un usuario autenticado con rol `ADMIN` solicita cualquier endpoint de `/api/suppliers`
- **THEN** el sistema procesa la request normalmente
