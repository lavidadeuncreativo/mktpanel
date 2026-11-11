# Panel EVYM — Marketing de contenido

Panel de marketing estilo Apple para gestionar el contenido de
**Entre Vivos y Muertos**, **Antojo** y el **perfil personal** de Isra Granados:
qué toca hoy, métricas, pipeline de Reels, banco de ideas, giveaway,
pendientes y bitácora. La idea es que sea una máquina: cada día abre el
panel y sabe qué producir y qué publicar.

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

- **Selector de espacio arriba:** Vista general / Entre Vivos y Muertos /
  Antojo / Personal. Cada espacio guarda sus propios datos por separado.
- **Hoy (pantalla principal):** el Reel del día según el día de la semana
  y el estado del pipeline (guion / imágenes / edición / publicar), con el
  siguiente paso en un botón. Incluye la racha de días consecutivos con un
  Reel publicado, el plan de la semana (7 espacios, uno por día), el
  siguiente tema sugerido desde el banco de Ideas con botón para pasarlo a
  guion, la cola de publicación ordenada y el checklist de hoy.
- **Resumen:** banner, 5 tarjetas KPI, gráficas 2:1 (área de seguidores +
  donut de vistas por red), tres listas (Top Reels, anécdotas, pendientes),
  meta semanal y tabla del pipeline.
- **Métricas:** capturas manuales desde Business Suite (Meta no permite
  conectar la cuenta automáticamente), KPI por red, barras de vistas por
  captura e historial. Además, **importar CSV de Business Suite**: sube el
  archivo exportado, el importador detecta los encabezados y te deja
  mapear cada columna (fecha, vistas/alcance, seguidores, reacciones,
  comentarios, compartidos, red, periodo) y elegir la red. Hay un botón
  para descargar una plantilla CSV de ejemplo con los encabezados que el
  importador reconoce. El formato exacto de Meta no se asume: el mapeo
  manual es lo que hace robusto el importador. Las filas con fecha
  inválida, red no reconocida o captura ya existente se omiten y se
  reportan; cada importación queda anotada en la bitácora.
- **Contenido:** pipeline de los 7 Reels semanales (idea → guion → imágenes
  → edición → publicado) con barra de avance y el plan de la semana
  (toca un día para editar su Reel).
- **Ideas:** banco de temas con puntuación y botón para pasar a guion.
- **Giveaway (solo en EVYM):** registro de anécdotas, finalistas y elección
  de ganadora de una botella de mezcal Los Muertos. Solo mayores de 18 años.
- **Pendientes:** checklist de publicación precargable (incluye verificar el
  destino de publicaciones cruzadas a Facebook y fijar el comentario),
  con switches estilo iOS.
- **Bitácora:** registro de cada captura de métricas con fecha y fuente.

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

Estilo Apple (Human Interface Guidelines), criterio de los skills
`frontend-design` y `ui-ux-pro-max` (guardados en
`~/workspace/custom-skills/`):

- Tipografía grande y limpia con la pila del sistema (aproximación a SF Pro),
  titulares semibold con tracking ajustado, base 16px.
- Mucho aire: secciones con respiración, contenido protagonista, chrome
  mínimo.
- Superficies traslúcidas tipo frosted glass (`backdrop-blur`, blancos al
  70–80% sobre fondo gris muy claro), divisores finos en vez de bordes
  pesados, nada de sombras fuertes.
- Casi nada de color: un solo acento, azul Apple `#0071E3`, para acciones
  y enlaces. Texto casi negro `#1D1D1F`, secundario `#6E6E73`, divisores
  `#D2D2D7`. Verde `#34C759`, rojo `#FF3B30`, ámbar `#FF9500` y violeta
  `#AF52DE` solo para estados.
- Controles refinados: botones cápsula, pills suaves, switches iOS,
  segment control para el selector de espacio. Movimiento suave tipo
  spring (200–300ms, ease-out).
- Sin tells de plantilla: nada de tarjetas idénticas con la misma sombra,
  ni mayúsculas con tracking, ni "A · B", ni flechas en enlaces.
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
