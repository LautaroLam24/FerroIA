## Why

La UI actual del frontend (React + Vite) funciona pero no tiene una identidad visual: es blanco y negro, sin paleta ni tipografía definidas, y el layout no está centrado (el contenido queda pegado al borde izquierdo, sin un contenedor de ancho máximo). Cada pantalla nueva (`ProductsPage`, `StockPage`, `PurchaseOrdersPage`, etc.) resuelve sus propios estilos ad-hoc en `App.css`/`index.css`, lo que va a producir inconsistencia a medida que se sigan agregando pantallas. Antes de seguir construyendo features visuales (FE1-FE5 en la rama OpenCode, y cualquier pantalla nueva en Claude Code) hace falta una fundación de diseño reusable: tokens, layout base y un set mínimo de componentes accesibles, para que el resto de las pantallas los reusen en vez de reinventar estilos.

## What Changes

- Se agregan **tokens de diseño** (CSS variables): paleta de color (primario, secundario, superficie, texto, bordes, estados éxito/alerta/error/info) coherente con el rubro ferretería/pinturería, escala tipográfica, escala de espaciado en base 4/8px, radios y sombras. La paleta se documenta y justifica en `design.md` **antes** de aplicarse a componentes, para revisión previa.
- Se agrega un **AppShell**: layout base con sidebar de navegación colapsable, header con usuario + logout, y área de contenido con contenedor centrado de ancho máximo. Responsive: la sidebar colapsa a menú en pantallas angostas.
- Se agrega una **librería de componentes base** reutilizables y tipados en `frontend/src/components/` (ruta ya prevista en `AGENTS.md` como "UI compartida" pero hoy vacía): `Button`, `Input`/`Select`/`FormField`, `Card`, `Table`, `Badge`, `Modal`/`Dialog`, `Toast`, `Spinner`/skeleton.
- Se agrega una **pantalla showcase** (ruta interna, ej. `/ui` dentro del mismo `App.tsx` sin router, gateada solo por sesión iniciada) que renderiza todos los componentes en sus variantes para revisión visual rápida.
- Se elige **UNA estrategia de estilos** (justificada en `design.md`) y se aplica de forma consistente en tokens, AppShell y componentes nuevos.
- **No** se modifica ninguna pantalla de feature existente (`ProductsPage`, `StockPage`, `UsersPage`, etc.) más allá de envolverlas en el nuevo `AppShell` en `App.tsx` — su contenido interno, lógica y llamadas a `src/api` quedan intactos.
- **No** se toca `src/api`, ningún hook de datos, ni ningún endpoint de backend.

## Capabilities

### New Capabilities
- `design-system`: tokens de diseño, AppShell (layout responsive con sidebar/header/contenedor centrado) y librería de componentes UI base reutilizables y accesibles, más una pantalla showcase para revisarlos.

### Modified Capabilities
(ninguna — este change es puramente de capa visual/estructura de layout; no cambia requisitos de negocio de ningún CU existente. `App.tsx` se reorganiza para usar el nuevo `AppShell`, pero eso es un detalle de implementación, no un requisito de spec de otra capability.)

## Impact

- **Alcance:** no cubre un CU específico del TP (CU01-CU10 son de negocio/datos); es una fundación transversal de UI que las pantallas de esos CU van a reusar de acá en adelante. No bloquea ni reabre ningún change ya archivado.
- **Código afectado:** solo `frontend/` — nuevos archivos en `frontend/src/components/` (o `frontend/src/ui/`, a definir en `design.md`), tokens en `frontend/src/index.css` (o equivalente según la estrategia elegida), reorganización de `App.tsx` para montar el `AppShell`, y un nuevo archivo/ruta de showcase.
- **No afectado:** `backend/`, `chatbot/`, `frontend/src/api/`, hooks de datos (`useSession`, etc.), contratos de API, specs de negocio existentes.
- **Dependencias nuevas:** posible librería de estilos/componentes (Tailwind, CSS Modules, o shadcn/ui — se decide y justifica en `design.md`); a evaluar impacto en tooling de build (`vite`) y lint (`oxlint`).
- **Verificación:** `tsc --noEmit`, `oxlint`, `vitest` deben seguir en verde; criterios de aceptación verificables visualmente en el showcase (ver `specs/design-system/spec.md`).

## Non-goals

- Rediseñar el contenido interno de cada pantalla existente (eso corresponde a los changes FE1-FE5 de la rama OpenCode).
- Animaciones complejas o transiciones elaboradas.
- Modo oscuro (se deja la base de tokens preparada para agregarlo después, pero no se implementa en este change).
- Introducir un router (`react-router` u otro) — el AppShell se integra sobre el mecanismo de navegación por estado (`useState<AdminView>`) que ya usa `App.tsx`.
