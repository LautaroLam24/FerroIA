## Purpose

Define la presentación frontend de CU08: el dashboard como home post-login con cards de
métricas (valorización total y alertas de stock mínimo) con números grandes y legibles,
una tabla de últimos movimientos, estados de carga (skeleton) y vacío, y las alertas de
stock bajo destacadas visualmente con `Badge`.

## ADDED Requirements

### Requirement: Dashboard como home post-login
El sistema SHALL mostrar el Dashboard como la vista inicial de la aplicación autenticada:
al iniciar sesión (`ADMIN` u `OPERARIO`) la vista activa por defecto es el Dashboard, y
este SHALL ser alcanzable desde el ítem "Dashboard" de la navegación.

#### Scenario: Vista inicial post-login
- **WHEN** un usuario autenticado inicia sesión
- **THEN** la aplicación presenta la vista Dashboard como vista inicial

#### Scenario: Acceso desde la navegación
- **WHEN** el usuario navega desde otra vista al ítem "Dashboard" de la sidebar
- **THEN** la aplicación presenta la vista Dashboard con sus datos actualizados

### Requirement: Cards de métricas con números grandes y legibles
El Dashboard SHALL renderizar una card de métrica para la valorización total del
inventario y una card para las alertas de stock mínimo, usando el componente `Card` del
design-system. El valor principal de cada card SHALL presentarse en un tamaño tipográfico
grande y legible, y la card de alertas SHALL indicar la cantidad de productos bajo el
mínimo.

#### Scenario: Valorización total en card con número grande
- **WHEN** el Dashboard muestra la valorización total del inventario
- **THEN** el valor se muestra dentro de una `Card`, formateado como moneda, en un tamaño tipográfico grande y legible

#### Scenario: Alertas en card con conteo
- **WHEN** el Dashboard muestra las alertas de stock mínimo
- **THEN** la `Card` de alertas muestra la cantidad de productos bajo el mínimo y los datos relevantes (código, nombre, stock y stock mínimo) de forma destacada

### Requirement: Estados de carga (skeleton) y vacío del Dashboard
Mientras la consulta del dashboard está en curso, el sistema SHALL mostrar estados de
carga explícitos (skeleton) en lugar de valores vacíos. Cuando la consulta termina sin
alertas o sin movimientos, SHALL mostrar estados vacíos explícitos y legibles.

#### Scenario: Dashboard en carga con skeleton
- **WHEN** el usuario navega al Dashboard y los datos aún no terminaron de cargar
- **THEN** las cards de métricas y las tablas muestran skeleton de carga en lugar de valores vacíos o mensajes intermedios

#### Scenario: Sin alertas de stock bajo
- **WHEN** la consulta termina y no existen productos con `stock <= stockMin`
- **THEN** el Dashboard muestra un estado vacío explícito (p. ej. "Sin alertas de stock") y la card de alertas indica cero productos bajo el mínimo

#### Scenario: Sin movimientos recientes
- **WHEN** la consulta termina y no existen movimientos de stock
- **THEN** la tabla de movimientos recientes muestra su estado vacío con un mensaje claro (p. ej. "Sin movimientos registrados")

### Requirement: Alertas de stock bajo destacadas con Badge
Cada alerta de stock bajo (`stock <= stockMin`) en el Dashboard SHALL mostrarse destacada
visualmente con un `Badge` de alerta (variante warning/error) indicando el estado, de modo
que el usuario identifique de un vistazo los productos críticos.

#### Scenario: Alerta de stock bajo con Badge
- **WHEN** el Dashboard renderiza una alerta de stock bajo
- **THEN** la fila o el stock de la alerta muestra un `Badge` de alerta indicando "Stock bajo" (o equivalente)

#### Scenario: Movimientos sin Badge de alerta
- **WHEN** el Dashboard renderiza la tabla de movimientos recientes
- **THEN** los movimientos no muestran el `Badge` de alerta de stock, que es exclusivo del listado de alertas

### Requirement: Tabla de últimos movimientos con Table
La sección de movimientos recientes del Dashboard SHALL renderizarse con el componente
`Table` del design-system, mostrando fecha, tipo, cantidad, producto y usuario de cada
movimiento, con su estado de carga (skeleton) y vacío.

#### Scenario: Movimientos recientes en Table
- **WHEN** el Dashboard tiene movimientos recientes para mostrar
- **THEN** cada movimiento se renderiza como una fila de la `Table` con fecha, tipo, cantidad, producto y usuario

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual del Dashboard: no SHALL modificar la lógica
de negocio, los hooks de datos, el cliente HTTP (`frontend/src/api`) ni ningún contrato de
API del backend.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin que se hayan modificado tests ni comportamiento de `frontend/src/api` ni de los hooks de datos existentes
