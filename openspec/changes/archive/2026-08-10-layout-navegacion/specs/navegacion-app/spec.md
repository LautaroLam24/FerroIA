## Purpose

Define la navegación de la aplicación sobre el `AppShell` del design-system: sidebar con los ítems canónicos del sistema de inventario, resaltado de la vista activa, filtrado de ítems por rol y header con usuario/rol + logout.

## ADDED Requirements

### Requirement: Sidebar con ítems canónicos de navegación
El sistema SHALL mostrar en la sidebar del `AppShell` el set canónico de ítems de navegación en orden fijo: Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Reposición y Órdenes de compra. La vista de showcase de UI SHALL NO aparecer como ítem de navegación de la aplicación.

#### Scenario: Ítems en orden fijo
- **WHEN** un usuario con rol `ADMIN` inicia sesión
- **THEN** la sidebar muestra los ítems Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Reposición y Órdenes de compra, en ese orden

#### Scenario: Showcase fuera del menú
- **WHEN** un usuario autenticado (cualquier rol) navega la aplicación
- **THEN** la sidebar NO presenta un ítem "UI showcase"

### Requirement: Resaltado de la ruta activa
El sistema SHALL distinguir visualmente en la sidebar el ítem correspondiente a la vista actual, de forma consistente para que el usuario siempre sepa en qué pantalla está.

#### Scenario: Ítem de la vista actual resaltado
- **WHEN** el usuario navega a la vista "Stock"
- **THEN** el ítem "Stock" se muestra visualmente distinguido del resto y queda marcado como activo (`aria-current="page"`)

#### Scenario: El resaltado sigue a la navegación
- **WHEN** el usuario hace clic en un ítem de navegación distinto
- **THEN** la vista cambia y el ítem recién seleccionado queda resaltado, dejando de estarlo el anterior

### Requirement: Filtrado de ítems por rol
El sistema SHALL derivar el rol del estado de sesión existente y SHALL ocultar de la sidebar los ítems solo-ADMIN (Usuarios, Categorías, Proveedores, Productos) cuando el rol del usuario autenticado es `OPERARIO`, dejando visibles para ambos roles Dashboard, Stock, Reposición y Órdenes de compra. El filtrado SHALL recalcularse a partir de la sesión actual, sin estado duplicado ni lógica de sesión modificada.

#### Scenario: OPERARIO no ve ítems solo-ADMIN
- **WHEN** un usuario con rol `OPERARIO` inicia sesión
- **THEN** la sidebar muestra Dashboard, Stock, Reposición y Órdenes de compra, y NO muestra Usuarios, Categorías, Proveedores ni Productos

#### Scenario: ADMIN ve todos los ítems
- **WHEN** un usuario con rol `ADMIN` inicia sesión
- **THEN** la sidebar muestra los ocho ítems canónicos

#### Scenario: El filtrado refleja el rol de la sesión actual
- **WHEN** un usuario cierra sesión y luego inicia sesión con otro rol
- **THEN** la sidebar de la nueva sesión refleja los ítems del rol entrante y no mantiene ninguno de la sesión anterior

### Requirement: Header con usuario, rol y logout
El sistema SHALL mostrar en el header el nombre y el rol del usuario autenticado, junto con un control para cerrar sesión que invoca el `logout` existente y devuelve a la pantalla de login.

#### Scenario: Header expone nombre y rol
- **WHEN** hay una sesión iniciada
- **THEN** el header muestra el nombre del usuario y su rol

#### Scenario: Logout devuelve al login
- **WHEN** el usuario hace clic en "Cerrar sesión"
- **THEN** la sesión se cierra, la app deja de mostrar el layout y presenta la pantalla de login

#### Scenario: Logout con fallo de red
- **WHEN** el usuario hace clic en "Cerrar sesión" y la llamada de logout al backend falla por red
- **THEN** la sesión local se limpia igualmente (sin token residual en el cliente) y la app presenta la pantalla de login

### Requirement: Contenedor de contenido centrado
El sistema SHALL renderizar el contenido de todas las vistas dentro de un contenedor centrado de ancho máximo, de modo que en pantallas anchas nunca quede pegado al borde de la ventana.

#### Scenario: Contenido centrado en pantalla ancha
- **WHEN** la aplicación se muestra en una pantalla de ancho grande (p. ej. 1920px)
- **THEN** el contenido de la vista activa queda dentro de un contenedor de ancho máximo centrado horizontalmente, con márgenes visibles a ambos lados

### Requirement: Sidebar responsive
El sistema SHALL adaptar la navegación al ancho del viewport: en pantallas angostas la sidebar no se muestra expandida y los ítems quedan accesibles mediante un menú colapsable.

#### Scenario: Sidebar colapsa en pantalla angosta
- **WHEN** el viewport tiene un ancho menor a 768px
- **THEN** la sidebar expandida no se muestra y la navegación queda accesible a través de un menú colapsable, cuyo ítem activo también se resalta
