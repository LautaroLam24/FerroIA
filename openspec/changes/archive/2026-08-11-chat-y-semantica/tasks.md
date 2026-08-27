## 1. Puente chat↔restock (base para las demás tareas)

- [x] 1.1 Crear `frontend/src/features/chatbot/ChatLauncherContext.tsx` con
      provider y hook (`useChatLauncher`) que expone
      `openChatWithMessage(text: string)` y el estado necesario (abierto/
      cerrado, mensaje precargado) para que `ChatWidget` lo consuma
- [x] 1.2 Envolver `<ChatWidget />` (y el resto del árbol que necesite
      disparar el puente) con el provider en `frontend/src/App.tsx`, sin
      mover el estado propio del chat fuera de `ChatWidget`

## 2. ChatWidget (CU09) sobre el design-system

- [x] 2.1 Reestructurar el panel flotante de `ChatWidget.tsx` para usar
      `Card`/tokens de sombra y radio del design-system, manteniendo el
      botón de apertura/cierre existente
- [x] 2.2 Diferenciar visualmente burbujas de usuario vs. asistente
      (alineación + color de fondo con utilities de Tailwind sobre los
      tokens existentes, ver design.md Decisión 2)
- [x] 2.3 Reemplazar el texto "Pensando…" por un indicador "escribiendo…"
      con `Spinner`, deshabilitando input/botón de envío mientras está
      activo
- [x] 2.4 Reemplazar el `role="alert"` genérico por la caja de aviso
      amable con tokens `error-soft`/`error-soft-text` para el caso 502
      (ver design.md Decisión 3), preservando el mensaje de error para
      otros códigos de error
- [x] 2.5 Agregar scroll automático al último mensaje (`ref` + `useEffect`
      sobre cantidad de mensajes y estado de envío, ver design.md
      Decisión 4)
- [x] 2.6 Conectar `ChatWidget` al `ChatLauncherContext`: al recibir
      `openChatWithMessage`, abrir el panel y precargar el input con el
      texto recibido (sin enviarlo automáticamente)
- [x] 2.7 Actualizar/agregar tests de `ChatWidget` (burbujas por rol,
      estado "escribiendo…", aviso de 502, apertura+precarga vía contexto)

## 3. Buscador semántico (CU10, dentro de Productos)

- [x] 3.1 Ajustar `SemanticSearch.tsx` para que el input destacado use
      `FormField`/`Input` con jerarquía visual clara respecto del resto de
      filtros de `ProductsPage`
- [x] 3.2 Confirmar/ajustar el estado de carga del botón de búsqueda
      (`Button` `loading`, deshabilitado durante la búsqueda)
- [x] 3.3 Ajustar el estado vacío de resultados con un mensaje claro
      (reusando `Table` `emptyMessage` si corresponde)
- [x] 3.4 Reemplazar el manejo del error 502 por la misma caja de aviso
      amable usada en `ChatWidget` (mismos tokens, ver design.md
      Decisión 3)
- [x] 3.5 Actualizar/agregar tests de `SemanticSearch` (carga, vacío,
      aviso de 502)

## 4. Panel de reposición (CU10, RestockPage)

- [x] 4.1 Reestructurar `RestockPage.tsx` para agrupar por proveedor con
      `Card` + `Table` del design-system, reemplazando el `table`/`section`
      plano actual
- [x] 4.2 Agregar estado de carga (`Spinner`/`Button` loading) y estado
      vacío ("no hay productos por reponer") consistentes con el resto de
      la app
- [x] 4.3 Reemplazar el manejo del error 502 por la misma caja de aviso
      amable (ver design.md Decisión 3)
- [x] 4.4 Agregar botón "Pedir borrador al asistente" por grupo de
      proveedor que arme el mensaje precargado a partir de
      `RestockSuggestion` y llame a `openChatWithMessage(...)` (ver
      design.md Decisión 5)
- [x] 4.5 Agregar enlace de navegación hacia `PurchaseOrdersPage` (usando
      el mecanismo de navegación por estado ya existente en `App.tsx`, sin
      introducir router)
- [x] 4.6 Actualizar/agregar tests de `RestockPage` (agrupado por
      proveedor, carga/vacío, aviso de 502, botón de borrador dispara el
      contexto, enlace de navegación)

## 5. Verificación final

- [x] 5.1 Revisar manualmente en el navegador: chat con burbujas
      diferenciadas + "escribiendo…" + 502 + scroll; búsqueda semántica con
      carga/vacío/502; reposición agrupada con botón de borrador abriendo
      el chat precargado y enlace a Órdenes de compra
- [x] 5.2 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` en
      `frontend/` y confirmar que las tres verificaciones terminan sin
      errores
