# Panel EVYM — Marketing de contenido

Panel de marketing estilo Apple para gestionar el contenido de
**Entre Vivos y Muertos**, **Antojo** y el **perfil personal** de Isra Granados.
Es un centro de comando de una sola pantalla: al abrirlo ves todo lo que
importa sin desplazarte — qué publico hoy, cómo va la semana, qué funcionó
ayer y qué sigue. Los módulos (métricas, contenido, ideas, giveaway,
pendientes, bitácora, resumen) ya no son páginas: se abren como detalle
desde la tarjeta que les corresponde. La idea es que sea una máquina: cada
día abre el panel y sabe qué producir y qué publicar.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para la versión de producción:

```bash
npm run build
npm run start
```

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Recharts (gráficas) y Lucide (iconos SVG)
- Sin backend: los datos viven en `localStorage` del navegador
  (clave `panel-evym-v1`). Hay un botón al pie del panel para restablecer
  los datos iniciales. La clave no cambió, así que los datos guardados
  en la versión anterior migran solos.

## Qué trae

La vista única cabe en una pantalla (100vh en escritorio, sin scroll de
página). Arriba solo hay un control para cambiar de espacio (EVYM / Antojo
/ Personal): sin sidebar, sin buscador, sin navegación inferior.

- **Hoy (el héroe, lo único grande):** título grande "Hoy" con la
  fecha abajo, y el Reel del día en una sola superficie blanca: su
  estado, su título en grande, el siguiente paso y UNA sola acción
  principal — un botón azul grande y lleno (52pt). Abajo, en texto
  secundario, la racha y lo último publicado. Nada más compite con él.
- **El número:** sin tarjeta ni gráfica que descifrar. Un solo numeral
  dominante (vistas en total, 56–64pt), los secundarios pequeños y en
  gris (seguidores, por red), el veredicto (sube o baja vs la captura
  anterior) y qué toca publicar hoy.
- **La semana:** lista agrupada estilo Ajustes de iOS, una fila de 44pt
  por día con su Reel y su estado. El día de hoy va en azul, lo
  publicado lleva palomita verde, y tocar una fila con Reel abre el
  pipeline. Lo mismo aplica en Resumen y Contenido: el plan semanal es
  la misma lista en los tres sitios.
- **Siguiente tema:** una fila con su puntuación y un botón de texto
  azul para pasarlo a guion (no compite con la acción principal).
- **A continuación:** la cola de publicación como filas (máx. 3) con
  chevron, y una fila final "Ver pipeline".
- **Checklist de hoy:** filas con switch iOS; tocar toda la fila marca
  o desmarca (el objetivo es la fila completa de 44pt, no solo el
  switch). Lo hecho va tachado y en gris.
- **Más:** los módulos (Resumen, Métricas, Contenido, Ideas, Giveaway
  solo en EVYM, Pendientes, Bitácora) son una lista agrupada con icono
  y chevron: se ve que se pueden tocar. Cada uno se abre como detalle
  (overlay grande con su propio scroll). Su contenido y su lógica no
  cambiaron: Métricas sigue con capturas manuales e importar CSV de
  Business Suite, Contenido con el pipeline, Ideas con el banco,
  Giveaway con anécdotas y ganadora, Pendientes con el checklist de
  publicación, Bitácora con el registro y Resumen con KPIs, gráficas y
  pipeline.

En móvil lo que importa (Hoy, el número y la semana) queda arriba del
primer pantallazo y la acción principal es lo primero que se ve, a lo
ancho y con 52pt de alto. En escritorio (1440x900) la página no tiene
scroll: la columna izquierda (héroe + número) nunca se mueve y la
columna derecha (las listas) tiene su propio scroll interno.

## Datos iniciales

Solo los datos reales capturados el 10 nov 2026 están precargados en EVYM:

- Facebook: 281 vistas, 1 seguidor, 5 reacciones, 0 comentarios, 0 compartidos.
- Instagram: 42 seguidores, 3,172 vistas, 13 me gusta, 0 comentarios,
  2 compartidos, 537 interacciones.
- Reels publicados: "Leyenda de La Pascualita" (9 nov, 281 reproducciones)
  y "El Secreto de la Calle Salamanca" (10 nov). Semana: 2 de 7.

Antojo y el perfil personal arrancan vacíos, a propósito. Los deltas y la
curva de crecimiento solo aparecen cuando hay dos capturas por red; con una
sola captura se muestra "Línea base". Nada más está inventado.

## Diseño

Estilo Apple (Human Interface Guidelines) aplicado de verdad, no solo
los colores — el fallo de la versión anterior era una rejilla de
tarjetas idénticas donde todo se veía igual y nada se entendía:

- **Large Title:** "Hoy" en 34pt negrita con la fecha como subtítulo.
  Al abrir se sabe en un segundo en qué pantalla estás.
- **Un héroe, no una rejilla de iguales:** el Reel del día es la única
  superficie grande; cada zona tiene su propio tratamiento y ritmo
  (héroe blanco, número en tipografía desnuda, listas agrupadas). Nada
  de tarjetas idénticas.
- **Listas agrupadas estilo Ajustes de iOS:** filas de 44pt con
  separadores inset, icono en chip, título de 17pt, subtítulo gris de
  15pt y encabezados de sección pequeños en gris (13pt).
- **Affordances claras:** lo tocable lleva chevron, botón lleno o
  switch; lo que no se toca es texto plano. Nadie adivina.
- **Una sola acción principal por pantalla:** el siguiente paso del Reel
  de hoy es el único botón azul grande y lleno. Todo lo demás es texto
  azul o fila con chevron.
- **Color semántico y nada más:** azul = acción, verde = publicado o
  hecho, rojo = necesita atención, gris = secundario. Sin color
  decorativo.
- **Jerarquía tipográfica real:** título grande 34, título 22–30,
  cuerpo 17, secundario 15, pie 13. Objetivos táctiles de 44pt mínimo.
- **Móvil primero:** se revisa en el teléfono, con una mano; la acción
  principal es lo primero que se ve. En escritorio (1440x900) la página
  no tiene scroll.
- Tipografía con la pila del sistema (aproximación a SF Pro), titulares
  semibold con tracking ajustado, base 16px.
- Mucho aire: contenido protagonista, chrome mínimo. Superficies
  traslúcidas tipo frosted glass (`backdrop-blur`, blancos al 70–80%
  sobre fondo gris muy claro), divisores finos en vez de bordes
  pesados, nada de sombras fuertes.
- Texto casi negro `#1D1D1F`, secundario `#6E6E73`, divisores `#D2D2D7`.
  Azul Apple `#0071E3` para acciones. Verde `#34C759`, rojo `#FF3B30`,
  ámbar `#FF9500` y violeta `#AF52DE` solo para estados.
- Controles refinados: botón de acción grande (52pt, esquinas de 14px),
  botones cápsula, switches iOS, segment control para el selector de
  espacio. Movimiento suave tipo spring (200–300ms, ease-out).
- Sin tells de plantilla: nada de tarjetas idénticas con la misma sombra,
  ni mayúsculas con tracking, ni "A · B", ni flechas en enlaces.
- Vista única, criterio Jobs: una pantalla responde qué publico hoy, cómo
  va la semana, qué funcionó ayer y qué sigue. Si hay que hacer scroll
  para entender el día, el diseño falló. Por eso no hay sidebar, ni
  buscador, ni avatar, ni navegación inferior, ni vista "General": un solo
  control de espacio arriba y los módulos como detalle.
- Iconos solo SVG (Lucide), nunca emoji. Contraste 4.5:1, focos visibles,
  objetivos táctiles de 44px, `prefers-reduced-motion` respetado.
  Responsive 375 / 768 / 1024 / 1440 sin scroll horizontal.
- Nota técnica (Next.js 16, Cache Components): la fecha de hoy se lee solo
  en el cliente (`src/components/useToday.ts`, mismo patrón que el Header);
  leer el reloj durante el prerender rompe el build. Las funciones de
  `src/lib/derive.ts` que dependen del día (racha, Reel de hoy) reciben la
  fecha como parámetro y no leen el reloj.

## Medición automática

La medición automática (sincronización directa con Meta) necesita una app
de desarrollador de Meta con permisos, y es un proyecto aparte: no está
prometida. El flujo de medición que sí funciona hoy es: exportar el CSV
desde Business Suite e importarlo en Métricas, o registrar la captura
a mano. La plantilla CSV descargable del importador tiene los encabezados
esperados.
