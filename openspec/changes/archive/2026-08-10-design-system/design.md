## Context

Frontend actual: React 19 + Vite + TypeScript, sin router (`App.tsx` usa `useState<AdminView>` para cambiar de vista), sin librería de estilos (solo `App.css`/`index.css` planos), sin dependencias de UI. `AGENTS.md` ya prevé `frontend/src/components/` como carpeta de "UI compartida", hoy vacía. Ver `proposal.md` - Why para la motivación completa; este documento cubre solo el cómo.

## Goals / Non-Goals

**Goals:**
- Definir y mostrar la paleta de color y el resto de los tokens **antes** de aplicarlos a ningún componente, para ajuste por el usuario.
- Elegir una estrategia de estilos única, liviana y de bajo lock-in, y justificarla.
- Definir la arquitectura de `AppShell` y de la librería de componentes de forma que `App.tsx` los adopte sin tocar la lógica de ninguna feature existente.

**Non-Goals:**
- No se decide routing (`react-router`): el `AppShell` se diseña para envolver el patrón actual de navegación por estado, no para reemplazarlo.
- No se decide theming dinámico (modo oscuro) — solo se dejan los tokens en variables CSS para que sea agregable después.

## Decisiones

### 1. Paleta de color propuesta (para revisión antes de aplicar)

Rubro ferretería/pinturería: se elige **"Óxido"** (naranja tierra, evoca herramientas, óxido, madera) como color primario y **"Acero"** (azul-gris oscuro, evoca herramientas metálicas, planos, profesionalismo) como secundario — un contraste cálido/frío típico de identidad de ferretería sin caer en el amarillo/negro genérico de marcas de herramientas.

| Token | Rol | Hex | Contraste con blanco (texto) | Contraste con texto oscuro `#0F172A` |
|---|---|---|---|---|
| `--color-primary` | Acciones principales (Button primary, links activos) | `#C2410C` | 5.18:1 ✅ AA texto normal | — |
| `--color-primary-hover` | Hover/active de primary | `#9A3412` | 6.9:1 ✅ | — |
| `--color-secondary` | Acciones secundarias, sidebar activa | `#334155` | 10.36:1 ✅ | — |
| `--color-surface` | Fondo de página | `#F8FAFC` | — | 17.5:1 ✅ |
| `--color-surface-alt` | Fondo de Card/Table header/filas zebra | `#FFFFFF` | — | 18.7:1 ✅ |
| `--color-border` | Bordes, separadores | `#E2E8F0` | — (no se usa como fondo de texto) |
| `--color-text` | Texto principal | `#0F172A` | — | — |
| `--color-text-muted` | Texto secundario | `#475569` | 7.57:1 ✅ AA sobre blanco | — |
| `--color-success` | Éxito (texto/ícono, solid) | `#047857` | 5.9:1 ✅ | — |
| `--color-success-soft` | Fondo Badge/Toast éxito | `#D1FAE5` | — | texto `#065F46` sobre este fondo: 7.1:1 ✅ |
| `--color-error` | Error (texto/ícono, solid) | `#B91C1C` | 5.9:1 ✅ | — |
| `--color-error-soft` | Fondo Badge/Toast error | `#FEE2E2` | — | texto `#7F1D1D` sobre este fondo: 8.4:1 ✅ |
| `--color-warning-soft` | Fondo Badge/Toast alerta (única variante, ver riesgo) | `#FEF3C7` | — | texto `#78350F` sobre este fondo: 8.9:1 ✅ |
| `--color-info` | Info (texto/ícono, solid) | `#1D4ED8` | 5.2:1 ✅ | — |
| `--color-info-soft` | Fondo Badge/Toast info | `#DBEAFE` | — | texto `#1E3A8A` sobre este fondo: 9.6:1 ✅ |

Todos los pares texto/fondo listados fueron calculados con la fórmula de luminancia relativa WCAG y cumplen ≥4.5:1 (texto normal AA). `warning` no tiene variante "solid" con texto blanco: a la saturación necesaria para leerse como "ferretería" (ámbar, no amarillo puro) un fondo sólido con texto blanco no llega a 4.5:1 de forma confiable, así que **alerta siempre se renderiza en variante "soft"** (fondo claro + texto oscuro), igual que éxito/error/info la ofrecen como alternativa disponible.

**Escala tipográfica** (system font stack, sin fuente web nueva por peso/latencia): `--font-size-xs: 12px`, `-sm: 14px`, `-base: 16px`, `-lg: 18px`, `-xl: 20px`, `-2xl: 24px`, `-3xl: 30px`. Line-height `1.5` para texto de cuerpo, `1.2` para títulos. Pesos: `400` regular, `500` medium (labels), `600` semibold (headings menores), `700` bold (headings mayores).

**Espaciado** (base 4px): `--space-1: 4px` … `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`, `--space-16: 64px`.

**Radios**: `--radius-sm: 4px` (inputs, badges), `--radius-md: 8px` (buttons, cards), `--radius-lg: 12px` (modal), `--radius-full: 9999px` (badges tipo pill, avatar).

**Sombras**: `--shadow-sm` (Card en reposo), `--shadow-md` (Card hover / Dropdown), `--shadow-lg` (Modal, Toast) — escala estándar de elevación con el mismo color de sombra (`rgba(15, 23, 42, .08/.12/.20)`) en distinta difusión/offset.

> Esta paleta y escalas quedan a revisión: si el usuario pide ajustes de tono/saturación, se corrigen en este archivo antes de pasar a `tasks.md`/implementación.

### 2. Estrategia de estilos: Tailwind CSS (v4, plugin de Vite)

**Elegido: Tailwind CSS** sobre CSS Modules y sobre una librería de componentes (shadcn/ui, MUI).

- **Por qué no una librería de componentes (shadcn/ui, MUI):** shadcn/ui igual requiere Tailwind por debajo más Radix UI como dependencia de primitivas — más piezas para un primer design system con ~9 componentes. MUI es una dependencia grande con su propio sistema de theming (lock-in fuerte, estética Material que hay que resetear para no verse "genérica"), contrario al pedido de "liviano y sin lock-in fuerte".
- **Por qué no CSS Modules puro:** es la opción más liviana en dependencias (cero, ya viene con Vite) pero implica escribir a mano cada variante de espaciado/color/breakpoint por componente, repitiendo lógica que Tailwind ya resuelve con utilities — más lento de construir y más fácil de desalinear entre componentes (justo el problema que este change busca resolver).
- **Por qué Tailwind:** es una dependencia de build únicamente (no runtime, no JS extra al bundle), el output final sigue siendo CSS plano y las clases son atributos `className` — si en el futuro se quisiera migrar, el HTML/JSX no queda atado a una API de componentes propietaria. Los tokens de este documento se declaran como variables CSS en `:root` (`frontend/src/tokens.css`) y Tailwind v4 las consume vía `@theme` (CSS-first config, sin `tailwind.config.js` separado) — así el token sigue siendo la fuente de verdad, no la paleta default de Tailwind.
- **Integración:** `@tailwindcss/vite` como plugin de Vite (sin PostCSS separado), agregado a `devDependencies` del frontend. Es la única dependencia nueva de este change.

### 3. Arquitectura de componentes

- `frontend/src/tokens.css`: variables CSS de la sección 1, importado una vez en `main.tsx`.
- `frontend/src/components/ui/`: componentes base sin estado de negocio — `Button.tsx`, `Input.tsx`, `Select.tsx`, `FormField.tsx`, `Card.tsx`, `Table.tsx`, `Badge.tsx`, `Modal.tsx`, `Toast.tsx` (+ `ToastProvider.tsx`/`useToast.ts`), `Spinner.tsx`. Cada uno tipado con su propia interface de props (variantes como union types, no `string` suelto).
- `frontend/src/components/layout/AppShell.tsx`: recibe `navItems`, `activeId`, `onNavigate`, `user`, `onLogout` y `children` — no conoce roles ni `RequireRole`; `App.tsx` sigue siendo dueño de qué vistas existen y quién puede verlas, `AppShell` solo dibuja lo que le pasan. Mantiene el mismo patrón `useState<AdminView>` que ya usa `App.tsx`, no introduce routing.
- **Modal**: implementado sobre el elemento nativo `<dialog>` (soportado en navegadores evergreen) en vez de reimplementar focus-trap/Escape a mano — el navegador ya provee ambos out-of-the-box; se estiliza el `::backdrop` con los tokens de sombra/superficie.
- **Toast**: requiere estado accesible desde cualquier pantalla (se dispara desde una acción, no desde props locales) → `ToastProvider` + `useToast()` por Context de React, montado una vez en `App.tsx`/`main.tsx`. Es estado de UI puro (cola de mensajes a mostrar), no toca `src/api` ni hooks de datos — no cruza el límite marcado como fuera de alcance en `proposal.md`.
- **Showcase**: `frontend/src/features/ui-showcase/UiShowcasePage.tsx`, agregado como un valor más de la union `AdminView` existente (`'ui-showcase'`) y un ítem más de navegación — mismo mecanismo que cualquier otra pantalla, sin infraestructura nueva de ruteo.

## Risks / Trade-offs

- [Tailwind agrega una dependencia de build nueva al frontend] → Mitigación: es la única dependencia nueva de todo el change, dev-only, y su output es CSS estándar sin runtime.
- [Clases utility de Tailwind pueden verse verbosas si se usan directo en las pantallas de feature] → Mitigación: las pantallas de feature siguen usando los componentes de `components/ui/`, no escriben utilities Tailwind sueltas; eso queda para trabajo futuro (FE1-FE5), fuera de este change.
- [`<dialog>` nativo trae estilos de navegador por defecto (posición, borde) que hay que resetear] → Mitigación: reset explícito vía CSS en `Modal.tsx`, cubierto en tasks.
- [Estado de sidebar colapsada no se persiste entre sesiones] → Decisión consciente: queda como estado de componente (no localStorage) para este change; no es un requirement de la spec, se puede agregar después sin romper la API de `AppShell`.

## Migration Plan

No hay migración de datos ni de contrato de API. Orden de implementación seguro (revertible por commit, sin flag de feature necesario):
1. Agregar Tailwind + `tokens.css` (no afecta nada existente todavía).
2. Construir `components/ui/*` de a uno, sin tocar `App.tsx`.
3. Construir `AppShell` y el showcase, verificarlos aislados.
4. Recién al final, adaptar `App.tsx` para montar `AppShell` alrededor de las vistas existentes — un solo commit, fácil de revertir con `git revert` si algo rompe visualmente.
5. Correr `tsc --noEmit && npm run lint && npm run test` (frontend) después de cada paso, no solo al final.
