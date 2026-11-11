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

- **Hoy (lo único grande):** el Reel del día según el día de la semana y el
  estado del pipeline (guion / imágenes / edición / publicar), con el
  siguiente paso en un botón y la racha de días consecutivos con un Reel
  publicado. Abajo, lo último publicado con sus reproducciones.
- **El número:** vistas y seguidores en grande, por red, con veredicto:
  cuánto subieron o bajaron vs la captura anterior (o "Línea base" si solo
  hay una captura) y qué toca publicar hoy. El panel dice qué hacer, no
  solo muestra datos.
- **La semana:** los 7 espacios en celdas, con el día de hoy marcado y el
  avance (x de 7). Tocar un día abre el pipeline.
- **Siguiente tema:** el tema más fuerte del banco de Ideas con botón para
  pasarlo a guion.
- **A continuación:** la cola de publicación ordenada.
- **Checklist de hoy:** lo que falta para que el Reel de hoy salga bien,
  con switches estilo iOS.
- **Los módulos, en una línea discreta al pie:** Resumen, Métricas,
  Contenido, Ideas, Giveaway (solo EVYM), Pendientes y Bitácora. Cada uno
  se abre como detalle (overlay grande con su propio scroll) desde su
  tarjeta o desde esa línea. Su contenido y su lógica no cambiaron: Métricas
  sigue con capturas manuales e importar CSV de Business Suite, Contenido
  con el pipeline, Ideas con el banco, Giveaway con anécdotas y ganadora,
  Pendientes con el checklist de publicación, Bitácora con el registro y
  Resumen con KPIs, gráficas y pipeline.

En móvil lo que importa (Hoy, el número y la semana) queda arriba del
primer pantallazo; lo secundario (siguiente tema, cola, checklist) se
colapsa detrás de su título y se abre al tocarlo. En escritorio todo está
siempre abierto: es la rejilla de una pantalla.

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
