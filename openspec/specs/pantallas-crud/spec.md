# pantallas-crud Specification

## Purpose

Define el comportamiento de las pantallas frontend de CRUD (Productos,
Categorías, Proveedores y Usuarios) construidas sobre los componentes base del
design-system: listado con Table (estados de carga y vacío), alta y edición en
Modal con FormField y validación visible, confirmación de baja en Modal y Badge
de estado/rol.

## Requirements

### Requirement: Listado con Table y estados de carga y vacío
Toda pantalla de listado de CRUD (Productos, Categorías, Proveedores, Usuarios)
SHALL renderizar sus filas con el componente `Table` del design-system. Mientras
la carga inicial de datos está en curso, la pantalla SHALL mostrar un indicador
de carga explícito. Cuando la carga termina y no hay registros que mostrar,
SHALL renderizar un estado vacío explícito y legible dentro de la tabla.

#### Scenario: Listado en carga
- **WHEN** el usuario navega a una pantalla de listado de CRUD y los datos aún no terminaron de cargar
- **THEN** la pantalla muestra un indicador de carga (spinner/skeleton) en lugar de una tabla vacía o mensajes intermedios

#### Scenario: Listado sin registros
- **WHEN** la carga finaliza y el listado no tiene registros (p. ej. no hay categorías cargadas)
- **THEN** la pantalla muestra dentro de la `Table` un estado vacío explícito con un mensaje claro (p. ej. "No hay datos para mostrar")

#### Scenario: Listado con registros
- **WHEN** la carga finaliza y el listado tiene registros
- **THEN** cada registro se renderiza como una fila de la `Table` y no se muestra el estado vacío

### Requirement: Alta y edición en Modal con FormField y validación visible
Las operaciones de alta y edición de Productos, Categorías y Proveedores, y el
alta de Usuarios, SHALL realizarse en un `Modal` del design-system. Cada campo
del formulario SHALL usar `FormField` con su label asociado. Los errores de
validación del backend (400 con `details`, y 409 por duplicados) SHALL mostrarse
asociados al campo que los origina dentro del formulario, de forma visible y
perceptible (p. ej. `aria-describedby`), y no solo como un mensaje global. El
Modal SHALL abrirse vacío para alta y precargado con los datos del registro para
edición, y SHALL poder cerrarse (incluida la tecla Escape) sin guardar.

#### Scenario: Apertura de alta
- **WHEN** el usuario presiona el botón de "crear/nuevo" en una pantalla de CRUD
- **THEN** se abre un `Modal` con un formulario cuyos campos están vacíos, y el formulario tiene el foco inicial para comenzar a cargar datos

#### Scenario: Apertura de edición con datos precargados
- **WHEN** el usuario presiona "editar" sobre un registro existente
- **THEN** se abre un `Modal` con el formulario precargado con los valores actuales del registro y el título indica que está editando

#### Scenario: Error de validación de campo (400)
- **WHEN** el usuario envía un formulario y el backend responde `400` con `details` de validación
- **THEN** el error se muestra dentro del formulario, asociado al campo correspondiente, y el Modal permanece abierto sin perder los datos ingresados

#### Scenario: Conflicto por duplicado (409)
- **WHEN** el usuario envía un formulario y el backend responde `409` por un valor duplicado (código, nombre o email)
- **THEN** el error se muestra en el formulario asociado al campo duplicado, indicando el motivo, y el Modal permanece abierto

#### Scenario: Guardado exitoso
- **WHEN** el usuario envía un formulario válido y el backend responde con éxito (201/200)
- **THEN** el Modal se cierra, se muestra una notificación de éxito y la tabla se refresca mostrando el registro creado o actualizado

#### Scenario: Cancelación del Modal
- **WHEN** el usuario cierra el Modal (botón de cerrar o tecla Escape) estando en modo alta o edición
- **THEN** el Modal se cierra sin ejecutar ninguna operación y sin modificar datos

### Requirement: Confirmación de baja en Modal
Toda operación de baja/eliminación (Productos, Categorías, Proveedores,
Usuarios) SHALL requerir confirmación explícita en un `Modal` de confirmación
antes de llamar al backend. La confirmación SHALL identificar el registro que se
va a dar de baja. Si el usuario cancela, no se ejecuta ninguna operación. Si el
backend responde error (p. ej. `409` por productos asociados en categorías o
proveedores), el error SHALL mostrarse en pantalla sin perder el estado de la
lista.

#### Scenario: Baja requiere confirmación
- **WHEN** el usuario presiona el botón de "eliminar/dar de baja" sobre un registro
- **THEN** no se ejecuta ninguna operación y se muestra un `Modal` de confirmación que identifica el registro (p. ej. nombre, código o email)

#### Scenario: Cancelación de la baja
- **WHEN** el usuario cancela el `Modal` de confirmación de baja
- **THEN** no se llama al backend y la lista permanece sin cambios

#### Scenario: Baja confirmada exitosa
- **WHEN** el usuario confirma la baja y el backend responde `204`
- **THEN** el registro desaparece de la lista (se refresca la tabla) y se muestra una notificación de éxito

#### Scenario: Baja con error del backend
- **WHEN** el usuario confirma la baja y el backend responde un error (p. ej. `409` "la categoría tiene productos asociados")
- **THEN** el error se muestra claramente en pantalla, la lista no pierde el registro y el usuario puede intentar otra acción

### Requirement: Badge para rol de usuario
En la pantalla de Usuarios, el rol de cada usuario (ADMIN u OPERARIO) SHALL
mostrarse con un `Badge` del design-system en lugar de texto plano.

#### Scenario: Rol ADMIN mostrado con Badge
- **WHEN** la tabla de usuarios renderiza un usuario con rol `ADMIN`
- **THEN** el rol se muestra con un `Badge` con variante visual distintiva

#### Scenario: Rol OPERARIO mostrado con Badge
- **WHEN** la tabla de usuarios renderiza un usuario con rol `OPERARIO`
- **THEN** el rol se muestra con un `Badge` con variante visual distintiva

### Requirement: Indicador de stock bajo mínimo en Productos
En la pantalla de Productos, cada fila cuyo producto tiene `stock <= stockMin`
SHALL mostrar un `Badge` de alerta (variante warning/error) indicando stock bajo
mínimo. Los productos con `stock > stockMin` no SHALL mostrar ese indicador.

#### Scenario: Producto con stock bajo
- **WHEN** la tabla de productos renderiza un producto con `stock <= stockMin`
- **THEN** se muestra junto al stock un `Badge` de alerta indicando "Stock bajo" (o equivalente)

#### Scenario: Producto con stock suficiente
- **WHEN** la tabla de productos renderiza un producto con `stock > stockMin`
- **THEN** no se muestra el indicador de stock bajo para ese producto

### Requirement: Conservación de búsqueda, filtros y paginación
La funcionalidad existente de búsqueda, filtros combinables y paginación de la
pantalla de Productos SHALL seguir funcionando igual que antes de este change:
se mantienen la lógica y los hooks de datos existentes, aplicando solo el estilo
del design-system al input de búsqueda, los selects de filtro y los controles de
paginación.

#### Scenario: Filtros siguen aplicando
- **WHEN** el usuario aplica una búsqueda por nombre o un filtro (categoría, proveedor, stock bajo) en la pantalla de Productos
- **THEN** la tabla muestra únicamente los productos que cumplen los filtros, usando la misma lógica y llamadas de datos que antes del change

#### Scenario: Paginación conservada
- **WHEN** hay más productos que los que caben en una página
- **THEN** los controles de paginación existentes siguen funcionando y el indicador de stock bajo se preserva en las páginas siguientes
