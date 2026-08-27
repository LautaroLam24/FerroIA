## Purpose

Define la presentación frontend de CU06 (entrada) y CU07 (venta): formularios de
entrada y venta de stock construidos con el design-system, con el 409 "Stock
insuficiente" mostrado como error del formulario, y el listado de movimientos con
`Table`, filtros y estados de carga/vacío.

## ADDED Requirements

### Requirement: Formularios de entrada y venta sobre el design-system
La pantalla de Stock SHALL renderizar los formularios de entrada y venta de stock usando
los componentes base del design-system: `Card` para contener cada formulario, `FormField`
con su label para cada campo, `Select` para la selección de producto, `Input` para
cantidad/motivo y `Button` con estado loading durante el envío. Los formularios SHALL
enviar los mismos datos que hoy consume el backend (`productId`, `quantity`, `reason`),
sin modificar el cliente HTTP ni los contratos de API.

#### Scenario: Formularios renderizados con componentes base
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) navega a la pantalla de Stock
- **THEN** se muestran un formulario de entrada y un formulario de venta, cada uno dentro de un `Card`, con `FormField`+`Select` para producto y `FormField`+`Input` para cantidad, y un `Button` de envío

#### Scenario: Botón en estado loading durante el envío
- **WHEN** el usuario envía el formulario de entrada o de venta y la llamada está en curso
- **THEN** el `Button` de envío muestra su estado loading y queda deshabilitado para nuevas interacciones

#### Scenario: Entrada exitosa refresca el listado
- **WHEN** el usuario envía el formulario de entrada y el backend responde `201`
- **THEN** el formulario se limpia, se muestra una notificación de éxito y el listado de movimientos se refresca mostrando el movimiento creado

### Requirement: Error 409 "Stock insuficiente" como error del formulario
Cuando el backend responde `409` con `{ "error": "Stock insuficiente" }` a un envío del
formulario de venta, el sistema SHALL mostrarlo como un error del formulario, visible y
asociado al campo de cantidad (perceptible, p. ej. `aria-describedby`), manteniendo el
formulario abierto con los datos ingresados para que el usuario pueda corregir la cantidad.

#### Scenario: Venta con stock insuficiente muestra error en el formulario
- **WHEN** el usuario envía una venta con `quantity` mayor al stock actual y el backend responde `409` "Stock insuficiente"
- **THEN** el error se muestra asociado al campo de cantidad dentro del formulario, el formulario permanece abierto conservando los datos ingresados, y no se registra ningún movimiento

#### Scenario: Venta exitosa sin error de stock
- **WHEN** el usuario envía una venta con `quantity` menor o igual al stock actual y el backend responde `201`
- **THEN** no se muestra el error de stock, se notifica el éxito y el listado de movimientos se refresca con la venta registrada

### Requirement: Listado de movimientos con Table y estados de carga y vacío
El listado de movimientos de stock SHALL renderizarse con el componente `Table` del
design-system, conservando los filtros existentes (producto, rango de fechas). Mientras
la carga está en curso SHALL mostrar un indicador de carga explícito. Cuando la carga
termina sin movimientos que cumplan los filtros SHALL mostrar el estado vacío de la
`Table` con un mensaje claro.

#### Scenario: Listado en carga
- **WHEN** el usuario navega a la pantalla de Stock y los movimientos aún no terminaron de cargar
- **THEN** el listado muestra un indicador de carga (spinner/skeleton) en lugar de una tabla vacía

#### Scenario: Listado con movimientos
- **WHEN** la carga finaliza y existen movimientos que cumplen los filtros
- **THEN** cada movimiento se renderiza como una fila de la `Table` con fecha, tipo, producto, cantidad y motivo

#### Scenario: Listado sin movimientos
- **WHEN** la carga finaliza y no hay movimientos que cumplan los filtros
- **THEN** la `Table` muestra su estado vacío con un mensaje claro (p. ej. "No hay movimientos para mostrar")

#### Scenario: Filtros siguen aplicando
- **WHEN** el usuario aplica un filtro por producto o por rango de fechas
- **THEN** la `Table` muestra únicamente los movimientos que cumplen los filtros, usando la misma lógica y llamadas de datos que antes del change

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual de la pantalla de Stock: no SHALL modificar
la lógica de negocio, los hooks de datos, el cliente HTTP (`frontend/src/api`) ni ningún
contrato de API del backend.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin que se hayan modificado tests ni comportamiento de `frontend/src/api` ni de los hooks de datos existentes
