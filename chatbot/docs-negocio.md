# Documentación de negocio — Ferretería/Pinturería

> Este documento es la fuente de conocimiento del asistente conversacional (CU09).
> Todo lo que el asistente responde debe poder justificarse con el contenido de este
> archivo. Editalo libremente: agregá, corregí o ampliá las secciones según las reglas
> reales del negocio. Después de editarlo, volvé a correr `python ingest.py` para
> reindexar los cambios en ChromaDB.

## Políticas de stock

- El stock de cada producto se ajusta únicamente a través de movimientos: **entradas**
  (ingreso de mercadería, por ejemplo una compra a un proveedor) y **ventas** (salida de
  mercadería por una venta al público).
- No se permiten ventas que dejen el stock de un producto en un valor negativo: si la
  cantidad pedida supera el stock disponible, la venta se rechaza y no se descuenta nada.
- Cada producto tiene un **stock mínimo** configurado. Cuando el stock actual queda igual
  o por debajo del stock mínimo, el producto aparece como alerta de reposición en el
  dashboard.
- Los movimientos de stock (entradas y ventas) son **inmutables**: una vez registrados no
  se editan ni se borran. Si hubo un error de carga, se corrige con un movimiento
  compensatorio nuevo (por ejemplo, una entrada adicional o una venta de ajuste), nunca
  modificando el movimiento original.
- Dar de baja un producto no elimina su historial de movimientos ni afecta el stock de
  otros productos; solo lo oculta de los listados y búsquedas activos.

## Roles y permisos

El sistema tiene dos roles: **ADMIN** y **OPERARIO**.

- **ADMIN** puede: gestionar usuarios (alta y baja), gestionar el catálogo de productos
  (alta, edición y baja de productos, categorías y proveedores), confirmar o cancelar
  órdenes de compra, y todo lo que puede hacer un OPERARIO.
- **OPERARIO** puede: registrar entradas y ventas de stock, consultar el listado de
  productos con filtros y búsqueda (incluida la búsqueda semántica), ver el dashboard de
  métricas e historial de movimientos, ver la sugerencia de reposición, y crear borradores
  de orden de compra (a mano o pidiéndoselo al asistente).
- Solo el rol **ADMIN** puede dar de baja un producto o un usuario. Un OPERARIO no tiene
  permiso para hacerlo.
- Solo el rol **ADMIN** puede crear o eliminar categorías y proveedores.
- Solo el rol **ADMIN** puede confirmar o cancelar una orden de compra. Un OPERARIO puede
  crear el borrador, pero no puede pasarlo a confirmado ni cancelarlo.
- Registrar una entrada o una venta de stock puede hacerlo tanto un ADMIN como un
  OPERARIO.

### Preguntas frecuentes sobre roles

**¿Qué diferencia hay entre lo que puede hacer un ADMIN y un OPERARIO?**
El ADMIN tiene todos los permisos del sistema: además de las tareas operativas del día a
día (stock, búsquedas, dashboard), es el único que puede dar de baja productos o usuarios,
crear categorías y proveedores, y confirmar o cancelar una orden de compra. El OPERARIO
está pensado para el trabajo diario de mostrador y depósito: cargar entradas y ventas,
buscar productos, revisar alertas y crear borradores de reposición, pero sin tocar la
estructura del catálogo ni dar la aprobación final de una compra.

**Soy OPERARIO, ¿puedo dar de baja un producto que ya no se vende más?**
No. La baja de un producto es una acción exclusiva del rol ADMIN. Si necesitás que se dé
de baja un producto, tenés que pedírselo a un usuario ADMIN.

**Soy OPERARIO, ¿puedo crear un usuario nuevo para un compañero?**
No. La gestión de usuarios (alta y baja) es exclusiva del rol ADMIN.

**Dejé armado un borrador de orden de compra, ¿lo puedo confirmar yo mismo si soy
OPERARIO?**
No. Cualquier usuario (ADMIN u OPERARIO) puede crear un borrador, pero solo un ADMIN puede
confirmarlo o cancelarlo. Esa es una decisión que siempre queda en manos humanas y con
mayor permiso.

**¿Un OPERARIO puede registrar una venta o una entrada de stock?**
Sí, esa es justamente una de sus tareas principales y no requiere permisos de ADMIN.

## Cómo se registra una entrada de stock

Una **entrada** es un movimiento que suma stock a un producto: normalmente representa
mercadería que llegó de un proveedor. Para registrarla se elige el producto, se indica la
cantidad que ingresó y, opcionalmente, un motivo (por ejemplo, "compra a proveedor" o
"devolución de un cliente"). Al confirmarla, el stock del producto se incrementa
exactamente en esa cantidad y queda un registro permanente del movimiento (fecha, cantidad,
producto y quién lo cargó).

**¿Hay algún límite para cargar una entrada?**
La cantidad tiene que ser un número mayor a cero. No hay un tope máximo: cualquier
cantidad positiva es válida.

**¿Puedo cargar una entrada para un producto que está dado de baja?**
No. Un producto dado de baja no admite nuevos movimientos de stock (ni entradas ni
ventas) hasta que, si corresponde, se vuelva a dar de alta.

## Cómo se registra una venta y qué pasa si no hay stock suficiente

Una **venta** es un movimiento que resta stock a un producto por una salida de mercadería
al público. Para registrarla se elige el producto y la cantidad vendida. Antes de
confirmar la venta, el sistema siempre verifica que haya stock suficiente.

**¿Qué pasa si pido vender más unidades de las que hay en stock?**
La venta se rechaza por completo: no se descuenta stock parcial, no se crea ningún
movimiento, y el sistema avisa que el stock es insuficiente. Hay que corregir la cantidad
o esperar a que ingrese más mercadería con una entrada.

**Dos personas intentan vender la última unidad de un producto al mismo tiempo, ¿qué
pasa?**
El sistema está preparado para eso: solo una de las dos ventas se concreta (la que llega
primero), el stock queda en cero, y la otra persona recibe el mismo aviso de stock
insuficiente. Nunca puede quedar el stock de un producto en un número negativo, ni
duplicarse una venta sobre la última unidad disponible.

**¿Se puede vender un producto que está dado de baja?**
No, igual que con las entradas: un producto dado de baja no admite ventas nuevas.

## Baja lógica de productos: qué es y por qué se conserva el histórico

Dar de baja un producto **no lo borra** de la base de datos. Es lo que se llama una
**baja lógica**: el producto queda marcado como inactivo, deja de aparecer en los
listados, en las búsquedas (literales y semánticas) y en la creación de nuevos movimientos
de stock, pero toda su información y su historial de entradas y ventas se conservan tal
cual quedaron.

**¿Por qué no se borra directamente el producto?**
Porque borrar un producto rompería la trazabilidad de todo lo que pasó con él antes: si
tuvo ventas o entradas registradas, esos movimientos son parte del historial contable y
operativo del negocio y no pueden desaparecer. Conservar la baja lógica permite, por
ejemplo, auditar qué se vendió de ese producto en el pasado aunque hoy ya no se
comercialice.

**Un producto está dado de baja, ¿puedo volver a verlo en el listado de productos o en la
búsqueda?**
No mientras esté dado de baja: los listados y la búsqueda (tanto la de filtros como la
semántica) solo muestran productos activos.

**¿La baja de un producto afecta a otros productos o al stock general?**
No. Dar de baja un producto no modifica el stock de ningún otro producto ni borra
movimientos de otros productos.

## Alertas de stock mínimo

Cada producto tiene configurado un **stock mínimo**: el nivel de stock por debajo del
cual conviene reponer. Cuando el stock actual de un producto queda igual o por debajo de
ese mínimo, el sistema lo marca automáticamente como producto en alerta.

**¿Dónde veo qué productos están con stock bajo?**
En el Dashboard aparece el listado de alertas de stock bajo mínimo. También en el listado
de Productos hay un indicador visual junto a cada producto que está en esa situación.

**¿La alerta se calcula sola o hay que revisarla a mano?**
Se calcula automáticamente cada vez que se consulta el dashboard o el listado de
productos, comparando el stock actual contra el stock mínimo configurado de cada
producto. No hace falta ningún paso manual para que aparezca.

**Un producto está en alerta de stock bajo, ¿qué puedo hacer?**
Podés cargar una entrada de stock para reponerlo, o consultar la sugerencia de reposición
(ver más abajo), que calcula automáticamente una cantidad sugerida a partir del historial
de ventas de ese producto.

## Qué muestra el dashboard

El Dashboard es la pantalla de inicio y da una foto general del estado del inventario.
Muestra tres cosas: la **valorización total** del inventario activo (la suma del precio
por el stock de todos los productos activos), el listado de **alertas de stock bajo
mínimo**, y los **últimos movimientos de stock** registrados (entradas y ventas más
recientes, con fecha, producto y quién los cargó). Está disponible tanto para ADMIN como
para OPERARIO.

**¿El dashboard muestra datos de productos dados de baja?**
No. La valorización y las alertas solo consideran productos activos.

## Búsqueda semántica de productos

Además del buscador tradicional (que filtra por nombre exacto o parcial, código,
categoría o proveedor), el sistema tiene un **buscador semántico**: permite escribir una
consulta en lenguaje natural, describiendo lo que se busca, y encuentra los productos más
relevantes aunque el texto no coincida literalmente con el nombre del producto. Por
ejemplo, describir el uso o las características de lo que se necesita puede encontrar un
producto cuyo nombre no contiene esas mismas palabras.

**¿En qué se diferencia de la búsqueda normal?**
La búsqueda normal encuentra productos por coincidencia de texto (nombre, código,
categoría, proveedor). La búsqueda semántica entiende el significado de la consulta y
busca productos relacionados por similitud, no por coincidencia literal de palabras.

**¿Qué pasa si busco algo que no tiene ningún producto relacionado en el catálogo?**
El sistema devuelve una lista vacía junto con un mensaje que indica que no se encontraron
productos relevantes para esa búsqueda; no inventa ni sugiere productos que no existen en
el catálogo.

**¿Un producto dado de baja puede aparecer en una búsqueda semántica?**
No. Igual que en el listado y la búsqueda normal, los productos dados de baja quedan
excluidos.

**¿Cuándo queda disponible un producto nuevo para la búsqueda semántica?**
En cuanto se da de alta o se edita un producto, el sistema lo indexa automáticamente para
que quede disponible en la búsqueda semántica en poco tiempo; no hace falta ningún paso
manual.

**¿Quién puede usar la búsqueda semántica?**
Tanto ADMIN como OPERARIO.

## Sugerencia de reposición

El sistema puede calcular automáticamente una **sugerencia de reposición**: identifica los
productos activos que están con stock igual o por debajo del mínimo, calcula una cantidad
sugerida para cada uno en base al historial de ventas (consumo promedio reciente) y al
stock mínimo configurado, y agrupa el resultado por proveedor para facilitar armar una
compra. Un resumen en texto acompaña el resultado, explicando en palabras simples lo que
ya se calculó.

**¿La sugerencia de reposición modifica el stock o hace una compra automáticamente?**
No, nunca. Es puramente informativa: no cambia el stock de ningún producto ni crea ningún
movimiento ni ninguna orden de compra por sí sola. Es un punto de partida para que una
persona decida qué reponer.

**¿Quién decide las cantidades de la sugerencia, el asistente de IA?**
No. Las cantidades se calculan siempre con una fórmula fija a partir de datos reales del
sistema (stock actual, stock mínimo, historial de ventas). El asistente de IA, si
participa, únicamente redacta en lenguaje natural un resumen de ese cálculo ya hecho;
nunca decide ni inventa las cantidades.

**¿Qué pasa si ningún producto está bajo el mínimo?**
La sugerencia devuelve una respuesta vacía e informativa, indicando que no hay productos
que requieran reposición en ese momento.

## Órdenes de compra: qué es un borrador y quién lo confirma

Una **orden de compra** representa una propuesta de compra a un proveedor: qué productos y
en qué cantidad se querría pedirle. Toda orden de compra nace siempre en estado
**borrador**: un estado revisable que todavía no representa una compra real ni afecta el
stock de ningún producto.

**¿Cómo se crea un borrador de orden de compra?**
De dos formas: a mano, eligiendo un proveedor y cargando los productos y cantidades, o
pidiéndoselo al asistente conversacional, que puede armar un borrador a partir de una
sugerencia de reposición ya calculada. En ambos casos el resultado es el mismo tipo de
borrador; lo único que cambia es su "origen" (manual o sugerido por el asistente), que
queda registrado para saber cómo se generó.

**¿Un borrador de orden de compra modifica el stock?**
No, nunca. Crear un borrador —ya sea a mano o por el asistente— no toca el stock de
ningún producto ni crea ningún movimiento de stock.

**¿Quién puede confirmar una orden de compra?**
Únicamente un usuario con rol ADMIN. Confirmar una orden es una decisión humana explícita:
cambia el estado del borrador a confirmado, pero tampoco esa confirmación modifica el
stock por sí sola. El ingreso real de la mercadería al inventario sigue siendo siempre un
paso aparte: hay que registrarlo como una entrada de stock cuando la mercadería llega
efectivamente.

**¿Por qué confirmar la orden no ingresa el stock directamente?**
Porque son dos momentos distintos del negocio: confirmar una orden es aceptar la
propuesta de compra, e ingresar el stock es reconocer que la mercadería llegó
físicamente. Pueden pasar días o semanas entre una cosa y la otra, y el sistema no
asume que llegó algo que todavía no se recibió.

**¿Una orden de compra en borrador se puede cancelar?**
Sí, un ADMIN puede cancelarla. Tanto confirmar como cancelar solo se pueden hacer sobre
una orden que todavía esté en borrador; una orden ya confirmada o ya cancelada no se
puede volver a modificar.

**¿El asistente conversacional puede confirmar una orden de compra si se lo pido?**
No, bajo ninguna circunstancia. El asistente solo tiene la capacidad de crear borradores;
no tiene ninguna forma de confirmar ni cancelar una orden, ni de modificar stock, sin
importar cómo se lo pida en la conversación. Confirmar o cancelar siempre requiere que un
ADMIN lo haga explícitamente desde el sistema.

## Cómo usar el sistema

- Para consultar el estado general del inventario (alertas de stock bajo, valorización
  total y últimos movimientos), usá el **Dashboard**.
- Para buscar un producto por nombre, código, categoría o proveedor, usá la sección
  **Productos** con sus filtros combinables, o el buscador semántico dentro de esa misma
  sección si preferís describir lo que buscás en lenguaje natural.
- Para registrar una entrada o una venta de stock, usá la sección **Stock**, eligiendo el
  producto y la cantidad correspondiente.
- Para ver qué productos conviene reponer, usá la sección **Reposición**.
- Para ver o crear órdenes de compra, usá la sección **Órdenes de compra**.
- Este asistente responde preguntas sobre las políticas del negocio, los roles y el uso
  del sistema descriptos en este documento. No tiene acceso a los datos en tiempo real
  del inventario (stock actual, ventas del día, etc.); para eso hay que consultar el
  Dashboard, el listado de Productos o la búsqueda semántica.

## Glosario del rubro ferretería/pinturería

- **SKU / código de producto**: identificador único de cada producto en el catálogo.
- **Stock mínimo**: umbral configurado por producto; por debajo de ese nivel el sistema
  genera una alerta de reposición.
- **Entrada de stock**: movimiento que incrementa el stock disponible de un producto (por
  ejemplo, mercadería recibida de un proveedor).
- **Venta**: movimiento que decrementa el stock disponible de un producto.
- **Baja lógica**: dar de baja un producto o usuario sin borrarlo físicamente de la base
  de datos; deja de aparecer en listados activos pero su historial se conserva.
- **Proveedor**: empresa o persona a quien se le compra la mercadería que ingresa como
  entrada de stock.
- **Categoría**: agrupación de productos con características similares (por ejemplo,
  "Pinturas", "Herramientas manuales", "Tornillería", "Electricidad").
- **Latex / esmalte sintético**: tipos de pintura habituales en el rubro pinturería; el
  látex es a base de agua y el esmalte sintético a base de solvente.
- **Diluyente**: producto usado para bajar la viscosidad de una pintura antes de
  aplicarla.
- **Búsqueda semántica**: búsqueda por significado en lenguaje natural, en vez de por
  coincidencia literal de texto.
- **Sugerencia de reposición**: cálculo automático (nunca hecho por el asistente de IA) de
  qué productos conviene reponer y en qué cantidad, agrupado por proveedor.
- **Orden de compra**: propuesta de compra a un proveedor. Nace en estado borrador y solo
  un ADMIN puede confirmarla o cancelarla.
- **Borrador (de orden de compra)**: estado inicial de toda orden de compra; todavía no es
  una compra real y no afecta el stock.
