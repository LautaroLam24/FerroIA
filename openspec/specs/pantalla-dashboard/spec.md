# pantalla-dashboard Specification

## Purpose

Define la presentación frontend de CU08: el dashboard como home post-login con cards de
métricas (valorización total y alertas de stock mínimo) con números grandes y legibles,
una tabla de últimos movimientos, estados de carga (skeleton) y vacío, y las alertas de
stock bajo destacadas visualmente con `Badge`.

## Requirements

### Requirement: Dashboard como home post-login
El sistema SHALL redirigir a `/dashboard` tras un login exitoso. En `/dashboard` se SHALL
mostrar el resumen de métricas del negocio con una sección de alertas de stock mínimo y
una tabla de últimos movimientos. La navegación SHALL incluir un acceso directo al
dashboard desde el menú principal.

#### Scenario: Redirección tras login
- **WHEN** un usuario (`ADMIN` u `OPERARIO`) completa un login exitoso
- **THEN** el sistema lo redirige a `/dashboard`, que muestra el resumen de métricas, las alertas de stock mínimo y los últimos movimientos

#### Scenario: Acceso directo desde el menú
- **WHEN** el usuario está autenticado en el sistema y abre el menú principal
- **THEN** el menú muestra un ítem "Dashboard" que al hacer clic lleva a `/dashboard`

### Requirement: Cards de métricas con números grandes y legibles
El dashboard SHALL mostrar las métricas del endpoint `/dashboard/metrics` en cards del
design-system con títulos cortos, números grandes y legibles. Cada card SHALL tener la
misma tipografía y tamaño que las demás.

#### Scenario: Cards con métricas del endpoint
- **WHEN** el usuario ve el dashboard cargado
- **THEN** se muestran los cards de métricas (p. ej. valorización total del inventario y alertas de stock mínimo) con números grandes y legibles, cada uno con su título corto

#### Scenario: Consistencia visual entre cards
- **WHEN** el usuario compara las cards de métricas entre sí
- **THEN** todas usan la misma tipografía y tamaño de número, sin que una card se vea distinta al resto

### Requirement: Estados de carga (skeleton) y vacío del Dashboard
Mientras el dashboard carga SHALL mostrar skeletons en lugar de las cards de métricas y
la tabla de movimientos. Si una sección carga sin datos (p. ej. sin últimos movimientos),
SHALL mostrar su estado vacío correspondiente con un mensaje claro, sin que el resto del
dashboard deje de renderizarse.

#### Scenario: Skeleton durante la carga
- **WHEN** el usuario accede al dashboard y las métricas o los movimientos aún están cargando
- **THEN** se muestran skeletons en lugar de los cards de métricas y de la tabla, para indicar carga sin bloquear la pantalla

#### Scenario: Estado vacío de una sección
- **WHEN** el dashboard carga y no existen datos para una sección (p. ej. últimos movimientos)
- **THEN** esa sección muestra su estado vacío con un mensaje claro y el resto de las secciones se siguen mostrando con normalidad

#### Scenario: Dashboard cargado completo
- **WHEN** la carga del dashboard finaliza con datos
- **THEN** se muestran los cards de métricas con sus valores y la tabla de últimos movimientos

### Requirement: Alertas de stock bajo destacadas con Badge
Las alertas de stock mínimo SHALL destacarse visualmente con el componente `Badge` del
design-system, con color y estilo acordes al nivel de riesgo (p. ej. `Badge` con variante
danger). Cada alerta SHALL mostrar el nombre del producto, su stock actual y el stock
mínimo configurado.

#### Scenario: Alerta con Badge de riesgo
- **WHEN** el dashboard muestra una alerta de stock mínimo
- **THEN** la alerta se destaca con un `Badge` de variante danger y muestra nombre de producto, stock actual y stock mínimo

#### Scenario: Sin alertas de stock
- **WHEN** no hay productos por debajo del stock mínimo
- **THEN** la sección de alertas muestra su estado vacío con un mensaje claro (p. ej. "Sin alertas de stock") y no se muestran badges de alerta

### Requirement: Tabla de últimos movimientos con Table
La sección de últimos movimientos del dashboard SHALL renderizarse con el componente
`Table` del design-system.

#### Scenario: Últimos movimientos en Table
- **WHEN** el dashboard carga los últimos movimientos exitosamente
- **THEN** se muestran en una `Table` con columnas de fecha, tipo, producto, cantidad y motivo

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual del dashboard: no SHALL modificar la lógica
de negocio, los hooks de datos, el cliente HTTP (`frontend/src/api`) ni ningún contrato
de API del backend.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin que se hayan modificado tests ni comportamiento de `frontend/src/api` ni de los hooks de datos existentes
