## 1. Setup: Tailwind + tokens

- [x] 1.1 Agregar Tailwind CSS v4 y `@tailwindcss/vite` como devDependency del frontend, configurar el plugin en `vite.config.ts`
- [x] 1.2 Crear `frontend/src/tokens.css` con las variables CSS de color, tipografía, espaciado, radios y sombras definidas en `design.md` (paleta "Óxido"/"Acero")
- [x] 1.3 Conectar los tokens a Tailwind vía `@theme` (CSS-first config) y confirmar que las utilities generadas usan los valores de `tokens.css`, no la paleta default de Tailwind
- [x] 1.4 Importar `tokens.css` una vez en `main.tsx`
- [x] 1.5 Verificar `npx tsc --noEmit && npm run lint && npm run test` (frontend) siguen en verde antes de tocar componentes

## 2. Componentes base — feedback y forma

- [x] 2.1 `components/ui/Button.tsx`: variantes `primary`/`secondary`/`ghost`/`danger`, estado `loading` (deshabilita interacción y muestra indicador), tipado con union types de props
- [x] 2.2 `components/ui/Spinner.tsx`: spinner + variante skeleton (bloque con animación de carga)
- [x] 2.3 `components/ui/Input.tsx` y `components/ui/Select.tsx`: controles tipados, sin lógica de validación propia (reciben `value`/`onChange` como cualquier input controlado)
- [x] 2.4 `components/ui/FormField.tsx`: envuelve label + control + mensaje de error, asocia el error al control vía `aria-describedby`/`aria-invalid`
- [x] 2.5 `components/ui/Badge.tsx`: variantes por estado semántico (success/warning/error/info) usando los tokens `-soft` (fondo claro + texto oscuro), más variante neutral para roles

## 3. Componentes base — contenedores y overlays

- [x] 3.1 `components/ui/Card.tsx`: contenedor con padding/radius/shadow de los tokens
- [x] 3.2 `components/ui/Table.tsx`: header, filas zebra (alternancia con `--color-surface`/`--color-surface-alt`), estado vacío explícito cuando `rows.length === 0`
- [x] 3.3 `components/ui/Modal.tsx`: implementado sobre `<dialog>` nativo (open/close vía métodos `showModal()`/`close()`, focus trap y Escape provistos por el navegador), reset de estilos default y estilizado del `::backdrop` con tokens
- [x] 3.4 `components/ui/ToastProvider.tsx` + `useToast()` hook: cola de mensajes, variantes success/warning/error/info, auto-dismiss por timeout configurable
- [x] 3.5 `components/ui/Toast.tsx`: componente visual individual usado por `ToastProvider`

## 4. AppShell

- [x] 4.1 `components/layout/AppShell.tsx`: props `navItems`, `activeId`, `onNavigate`, `user`, `onLogout`, `children`; sin conocimiento de roles ni de `RequireRole`
- [x] 4.2 Sidebar de navegación con ítem activo resaltado (token `--color-secondary`/`--color-primary` según corresponda)
- [x] 4.3 Header con nombre/rol del usuario y botón de logout
- [x] 4.4 Área de contenido con contenedor centrado de ancho máximo (sin contenido pegado al borde)
- [x] 4.5 Comportamiento responsive: sidebar colapsa a menú en viewports angostos (breakpoint `md`, <768px), con botón para abrir/cerrar el menú
- [x] 4.6 Verificar contraste AA de cada combinación texto/fondo usada en el AppShell contra la tabla de `design.md`

## 5. Showcase

- [x] 5.1 `features/ui-showcase/UiShowcasePage.tsx`: renderiza todas las variantes de Button, Input/Select/FormField, Card, Table, Badge, Modal, Toast y Spinner/skeleton en una sola pantalla
- [x] 5.2 Agregar `'ui-showcase'` a la union `AdminView` y un ítem de navegación hacia esa vista

## 6. Integración en App.tsx

- [x] 6.1 Montar `ToastProvider` en `App.tsx` (o `main.tsx`) envolviendo la app autenticada
- [x] 6.2 Reemplazar el header/nav manuales de `App.tsx` por `AppShell`, pasando los `navItems` ya filtrados por rol (la lógica de `RequireRole` sobre el contenido de cada vista no cambia)
- [x] 6.3 Confirmar visualmente que ninguna pantalla de feature existente (`ProductsPage`, `StockPage`, `UsersPage`, etc.) cambió de lógica o de llamadas a `src/api` — solo quedó envuelta por el nuevo layout

## 7. Verificación final

- [x] 7.1 Revisar en el showcase que el contraste de texto sobre fondo cumple AA en todas las variantes (checklist manual contra la tabla de `design.md`)
- [x] 7.2 Confirmar en pantalla angosta que la sidebar colapsa y en pantalla ancha que el contenido queda centrado con ancho máximo
- [x] 7.3 Confirmar que la navegación resalta la ruta activa en todas las vistas
- [x] 7.4 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` (frontend) y confirmar que terminan sin errores
