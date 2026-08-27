## Context

El design-system (`frontend/src/components/ui/*`, `frontend/src/tokens.css`) ya define tokens de color/tipografía/espaciado, `AppShell`, y los componentes base (Button, Input, Select, FormField, Card, Table, Badge, Modal, Toast/ToastProvider, Spinner). `Button`, `Select`, `Input` y `Modal` ya usan `focus-visible:outline` de Tailwind en algunos casos (ver `Button.tsx:39`), pero no hay un patrón único aplicado de forma consistente a todos los controles interactivos (ítems de sidebar, filas de `Table`, controles de paginación, `ChatWidget`). `ToastProvider`/`useToast` ya existen y se usan hoy solo para el camino de éxito de guardado/baja en `pantallas-crud` y de entrada en `pantalla-stock`; los caminos de error de esas mismas pantallas hoy se resuelven como error de campo dentro del formulario (`formErrors.ts`), no como Toast. Ver proposal.md - Why para la motivación completa.

Este es un change transversal (toca todas las pantallas de feature) sin nuevo modelo de datos ni nueva dependencia — por eso amerita design.md, para fijar de antemano cómo se implementa la consistencia sin crear componentes nuevos.

## Goals / Non-Goals

**Goals:**
- Un único patrón de foco visible reusado por todos los controles interactivos, expresado a nivel de token/utilidad compartida (no repetido pantalla por pantalla).
- Un criterio único y verificable para decidir "esto va como Toast" vs "esto va como error de campo", aplicado igual en todas las pantallas de CRUD y Stock.
- Verificación de contraste y de responsive hecha contra las pantallas reales (capturas o inspección en el navegador), no solo argumentada por los tokens.

**Non-Goals:**
- No se define un sistema de theming oscuro/claro nuevo ni se rediseña la paleta de `tokens.css`.
- No se toca `ChatWidget`/`RestockPage` en su manejo de error 502 (ya definido como aviso amable en `pantalla-chat`/`pantalla-restock`) ni se lo reemplaza por Toast — ese patrón queda intacto, solo se le suma foco visible y verificación responsive/contraste.
- No se agregan nuevos componentes al design-system; los ajustes de foco/contraste se hacen dentro de los componentes base existentes.

## Decisions

**Foco visible como utilidad compartida de Tailwind, no CSS ad hoc por componente.** Se extiende el patrón que ya existe en `Button.tsx` (`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`) a `Input`, `Select`, ítems de sidebar/navegación, filas accionables de `Table` y controles de paginación, usando la misma combinación de clases (o una clase utilitaria única si Tailwind permite `@apply` en `tokens.css`) en vez de que cada pantalla de feature defina su propio estilo de foco. Alternativa descartada: un anillo de foco por componente definido inline en cada pantalla — se descarta porque multiplica el mantenimiento y es la causa raíz de la inconsistencia actual.

**Criterio Toast vs. error de campo: por presencia de un campo asociable.** Regla operativa para decidir cómo se notifica un error: si el error del backend trae un `field` identificable (400 `details` de validación, 409 de duplicado, 409 "Stock insuficiente" con campo cantidad), se muestra como error de campo dentro del formulario (patrón ya existente de `formErrors.ts`) y no se duplica como Toast. Si el error no es asociable a un campo (network error, 500, 401/403 inesperado en medio de una acción), se notifica con `Toast` variante error usando el `ToastProvider` ya existente. Esto evita decidir caso por caso pantalla por pantalla y reusa la función `resolveFormError`/`mapConflictField` ya existente en `formErrors.ts` como fuente de verdad de "¿esto tiene campo?".

**Verificación de contraste y responsive: manual dirigida, no una librería de testing nueva.** Dado que el design-system no tiene un axe/lighthouse-ci configurado y agregar uno excede el alcance ("no nuevas features", "reusar design-system"), la verificación de contraste AA y de responsive se hace navegando cada pantalla en el browser (herramientas de desarrollador, modo responsive <768px) contra los estados reales (incluyendo Badge, disabled, hover, focus), documentando el resultado en `ESTADO.md` al cerrar el change. Alternativa descartada: introducir `@axe-core/react` o similar — se prefiere no sumar una dependencia nueva para un pulido final de un TP con alcance ya acotado.

## Risks / Trade-offs

[Cambiar el estilo de foco de `Input`/`Select`/filas de `Table` podría chocar con estilos existentes específicos de alguna pantalla] → revisar visualmente cada pantalla tras el cambio (parte de las tasks de verificación manual), sin tests automáticos de estilo que puedan enmascarar una regresión visual.

[El criterio "Toast si no hay campo asociable" es una regla nueva que no estaba escrita en ningún spec previo; podría interpretarse distinto entre pantallas] → la regla queda codificada en `pulido-accesibilidad`'s spec (Requirement: Toast de éxito o error) con los mismos ejemplos (409 Stock insuficiente, 400/409 de validación) para que la implementación tenga un único criterio de referencia.

[La verificación manual de contraste/responsive no deja rastro automatizado (no hay test que falle si regresa)] → aceptado como trade-off deliberado dado el alcance y el stack actual del TP; queda documentado en `ESTADO.md` como verificación manual, igual que se hizo en `stock-y-dashboard` y `pantallas-crud`.
