## Purpose

Define los requisitos transversales de calidad visual y accesibilidad que toda pantalla autenticada de la app SHALL cumplir: estados de carga/vacío/error consistentes, navegación por teclado con foco visible, contraste AA en los componentes tal como se renderizan, comportamiento responsive en pantallas chicas y notificación uniforme de éxito/error tras cada acción.

## ADDED Requirements

### Requirement: Estados de carga, vacío y error consistentes en toda pantalla
Toda pantalla autenticada (Dashboard, Productos, Categorías, Proveedores, Usuarios, Stock, Chat, Búsqueda semántica/Reposición, Órdenes de compra, Showcase) SHALL usar exclusivamente los estados de carga (`Spinner`/skeleton), vacío (estado vacío de `Table`/sección) y error (banner o mensaje dentro del layout) del design-system. En ningún momento del ciclo de vida de una pantalla (carga inicial, sin datos, error de red o del backend) SHALL quedar un área en blanco, negra o visualmente descentrada respecto del contenedor centrado del `AppShell`.

#### Scenario: Carga inicial de cualquier pantalla
- **WHEN** el usuario navega a cualquier pantalla autenticada y los datos todavía no terminaron de cargar
- **THEN** se muestra un `Spinner`/skeleton del design-system dentro del contenedor centrado del `AppShell`, sin ningún área en blanco o negro

#### Scenario: Pantalla sin datos
- **WHEN** una pantalla termina de cargar y no hay datos que mostrar en una sección
- **THEN** esa sección muestra su estado vacío explícito con un mensaje claro, y el resto de la pantalla se sigue renderizando con normalidad

#### Scenario: Error de carga o de red
- **WHEN** la carga inicial de una pantalla falla por un error del backend o de red
- **THEN** la pantalla muestra un mensaje de error dentro del layout normal (nunca una pantalla en blanco o negro), y ofrece al usuario una forma de reintentar o de navegar a otra pantalla

### Requirement: Navegación por teclado y foco visible
Todo control interactivo de la app (ítems de sidebar, botones, inputs, selects, filas accionables de `Table`, controles de paginación, controles del `ChatWidget`) SHALL ser alcanzable y operable exclusivamente con teclado, en un orden de tabulación que sigue el orden visual de la pantalla, y SHALL mostrar un indicador de foco visible y distinguible cuando recibe el foco de teclado.

#### Scenario: Recorrido completo por teclado
- **WHEN** un usuario navega una pantalla usando solo la tecla Tab (y Shift+Tab)
- **THEN** el foco visita todos los controles interactivos de la pantalla en un orden que coincide con el orden visual, sin saltos ni controles inalcanzables

#### Scenario: Foco visible en cualquier control
- **WHEN** un control interactivo (botón, input, ítem de navegación, fila accionable) recibe el foco de teclado
- **THEN** se muestra un anillo o contorno de foco claramente visible sobre ese control, distinto de su estado sin foco

#### Scenario: Modal conserva el atrapado de foco
- **WHEN** un `Modal` está abierto tras los ajustes de este change
- **THEN** el foco de teclado sigue quedando contenido dentro del modal y Escape lo sigue cerrando, igual que especifica `design-system`

### Requirement: Contraste AA en los componentes tal como se renderizan
Todo texto visible en la app, en cualquiera de sus estados (normal, hover, focus, disabled, sobre `Badge`, placeholder), SHALL cumplir como mínimo el contraste WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para texto grande) contra el fondo sobre el que se renderiza en pantalla, no solo en la combinación de tokens base evaluada por el showcase.

#### Scenario: Texto sobre Badge cumple AA
- **WHEN** se mide el contraste del texto de cualquier variante de `Badge` (info, success, warning, danger, neutral) usada en pantalla contra su fondo
- **THEN** la relación de contraste cumple AA para el tamaño de texto usado

#### Scenario: Texto deshabilitado y placeholders cumplen AA
- **WHEN** se mide el contraste de un control deshabilitado o de un placeholder de `Input`/`FormField` contra su fondo
- **THEN** la relación de contraste cumple AA, o el control comunica su estado por un medio adicional al color si no llega a AA por ser intencionalmente de baja énfasis

### Requirement: Responsive verificado por pantalla en viewport chico
Toda pantalla de feature (no solo el `AppShell`/sidebar) SHALL renderizarse sin overflow horizontal de página, sin controles cortados ni superpuestos, en un viewport angosto (<768px): formularios apilan sus campos, tablas anchas quedan con scroll horizontal contenido o un layout alternativo legible, los modales ocupan el ancho disponible sin desbordar, y el panel del `ChatWidget` se adapta al viewport sin quedar cortado.

#### Scenario: Formulario en viewport angosto
- **WHEN** el usuario abre un formulario de alta/edición o de stock en un viewport <768px
- **THEN** los campos se apilan verticalmente, son completamente visibles y operables, y no hay overflow horizontal de la página

#### Scenario: Tabla ancha en viewport angosto
- **WHEN** una `Table` con muchas columnas se muestra en un viewport <768px
- **THEN** la tabla queda contenida con scroll horizontal propio o un layout alternativo legible, sin forzar overflow horizontal de la página completa

#### Scenario: ChatWidget en viewport angosto
- **WHEN** el usuario abre el `ChatWidget` en un viewport <768px
- **THEN** el panel se adapta al ancho disponible, permanece completamente visible y operable, sin quedar cortado por los bordes de la pantalla

### Requirement: Toast de éxito o error tras cada acción de crear, editar o borrar
Toda acción de creación, edición o borrado disparada por el usuario (CRUD de Productos/Categorías/Proveedores/Usuarios, entradas y ventas de Stock, confirmar/cancelar de Órdenes de compra) SHALL notificar su resultado con un `Toast` del design-system: variante success cuando la acción termina con éxito, y variante error cuando falla por un motivo que no quede ya mostrado como error de campo dentro del propio formulario. Un error ya mostrado como error de campo (p. ej. 409 "Stock insuficiente" asociado al campo de cantidad, o un 400/409 de validación de formulario) no SHALL duplicarse además como Toast.

#### Scenario: Acción exitosa siempre notifica
- **WHEN** una acción de creación, edición o borrado se completa con éxito
- **THEN** se muestra un `Toast` de variante success describiendo la acción realizada

#### Scenario: Error sin representación en un campo notifica por Toast
- **WHEN** una acción de creación, edición o borrado falla por un motivo que no está asociado a un campo del formulario (p. ej. error de red, error inesperado del servidor)
- **THEN** se muestra un `Toast` de variante error describiendo el fallo, sin dejar la acción sin ningún tipo de aviso

#### Scenario: Error de campo no se duplica como Toast
- **WHEN** una acción falla con un error que ya se muestra asociado a un campo del formulario (p. ej. 409 "Stock insuficiente", 400 de validación, 409 de duplicado)
- **THEN** no se muestra además un `Toast` de error redundante para el mismo fallo
