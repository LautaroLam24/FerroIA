# design-system Specification

## Purpose

Provee la fundación visual del frontend (tokens de diseño, layout base y componentes UI reutilizables) para que todas las pantallas del sistema de inventario compartan una identidad coherente en vez de estilos ad-hoc por pantalla.

## Requirements

### Requirement: Tokens de diseño
El sistema SHALL definir un conjunto único de tokens de diseño (paleta de color, escala tipográfica, escala de espaciado en base 4/8px, radios y sombras) accesible globalmente a toda la aplicación frontend, y estos tokens SHALL ser el único mecanismo para definir color, espaciado, tipografía, radios y sombras en los componentes nuevos de este change (sin valores hardcodeados sueltos).

#### Scenario: Paleta cubre estados semánticos
- **WHEN** un componente necesita expresar un estado de éxito, alerta, error o información
- **THEN** existe un token de color dedicado a cada uno de esos cuatro estados, distinto de los tokens de color primario/secundario/superficie/texto/bordes

#### Scenario: Contraste de texto cumple AA
- **WHEN** se mide el contraste entre cualquier token de texto y el token de superficie/fondo sobre el que se usa en los componentes del showcase
- **THEN** la relación de contraste cumple como mínimo WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para texto grande)

### Requirement: AppShell con layout centrado
El sistema SHALL proveer un layout base (AppShell) con sidebar de navegación, header con datos del usuario autenticado y botón de logout, y un área de contenido cuyo contenido queda dentro de un contenedor centrado de ancho máximo — nunca pegado al borde de la ventana.

#### Scenario: Contenido centrado en pantalla ancha
- **WHEN** la aplicación se ve en una pantalla de ancho grande (p. ej. 1920px)
- **THEN** el área de contenido queda dentro de un contenedor de ancho máximo centrado horizontalmente, con márgenes visibles a ambos lados

#### Scenario: Navegación resalta la ruta activa
- **WHEN** el usuario está en una de las vistas de la navegación (p. ej. "Productos")
- **THEN** el ítem de navegación correspondiente se muestra visualmente distinguido del resto como activo

#### Scenario: Sidebar colapsa en pantalla angosta
- **WHEN** el viewport tiene un ancho angosto (mobile, p. ej. <768px)
- **THEN** la sidebar deja de mostrarse expandida y su navegación queda accesible mediante un menú colapsable

#### Scenario: Header expone usuario y logout
- **WHEN** hay una sesión iniciada
- **THEN** el header muestra el nombre/rol del usuario actual y un control para cerrar sesión que invoca el logout existente

### Requirement: Librería de componentes UI base
El sistema SHALL proveer un set de componentes UI reutilizables y tipados en TypeScript estricto — Button (variantes primary/secondary/ghost/danger, estado loading), Input/Select/FormField (con label y mensaje de error), Card, Table (header, filas zebra, estado vacío), Badge, Modal/Dialog, Toast, y Spinner/skeleton — utilizables por cualquier pantalla de feature sin que esa pantalla defina sus propios estilos base equivalentes.

#### Scenario: Button en estado loading
- **WHEN** un Button recibe la prop de estado loading
- **THEN** el componente muestra un indicador de carga y queda deshabilitado para nuevas interacciones (no dispara `onClick`)

#### Scenario: FormField muestra mensaje de error
- **WHEN** un FormField recibe un mensaje de error
- **THEN** el mensaje se renderiza asociado al control de entrada de forma perceptible por lectores de pantalla (p. ej. `aria-describedby`)

#### Scenario: Table en estado vacío
- **WHEN** una Table recibe una lista de filas vacía
- **THEN** se renderiza un estado vacío explícito en lugar de una tabla sin filas ni mensaje

#### Scenario: Modal atrapa el foco y cierra con Escape
- **WHEN** un Modal/Dialog está abierto
- **THEN** el foco de teclado queda contenido dentro del modal y presionar Escape lo cierra

#### Scenario: Toast se autodescarta
- **WHEN** se dispara un Toast de notificación
- **THEN** el Toast desaparece automáticamente pasado un tiempo, sin requerir interacción del usuario para no quedar acumulado en pantalla

### Requirement: Showcase de componentes
El sistema SHALL proveer una pantalla de showcase accesible dentro de la aplicación autenticada que renderiza todas las variantes de todos los componentes base definidos en este change, permitiendo revisarlos de un vistazo sin navegar pantalla por pantalla.

#### Scenario: Showcase renderiza todas las variantes
- **WHEN** un usuario autenticado navega a la vista de showcase
- **THEN** se muestran en la misma pantalla todas las variantes de Button, Input/Select/FormField, Card, Table, Badge, Modal/Dialog, Toast y Spinner/skeleton definidas en este change

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual y de estructura de layout: no SHALL modificar la lógica de negocio, los hooks de datos, ni el cliente HTTP (`frontend/src/api`), ni ningún contrato de API del backend.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin que se hayan modificado tests ni comportamiento de `frontend/src/api` ni de los hooks de datos existentes
