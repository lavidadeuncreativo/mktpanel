# Panel EVYM — Marketing de contenido

Panel de marketing estilo CRM premium para gestionar el contenido de
**Entre Vivos y Muertos**, **Antojo** y el **perfil personal** de Isra Granados:
métricas, pipeline de Reels, banco de ideas, giveaway, pendientes y bitácora.

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
- shadcn/ui como criterio de componentes (botones, inputs, pills y diálogos
  propios, con tokens semánticos)
- Sin backend: los datos viven en `localStorage` del navegador
  (clave `panel-evym-v1`). Hay un botón al pie del panel para restablecer
  los datos iniciales.

## Qué trae

- **Selector de espacio arriba:** Vista general / Entre Vivos y Muertos /
  Antojo / Personal. Cada espacio guarda sus propios datos por separado.
- **Resumen:** grid bento editorial — banner, 5 tarjetas KPI, gráficas 2:1
  (área de seguidores + donut con segmentos en patrón), tres listas
  (Top Reels, anécdotas, pendientes), meta semanal en panel oscuro y tabla
  del pipeline.
- **Métricas:** capturas manuales desde Business Suite (Meta no permite
  conectar la cuenta automáticamente), KPI por red, barras de vistas por
  captura e historial.
- **Contenido:** pipeline de los 7 Reels semanales (idea → guion → imágenes
  → edición → publicado) con barra de avance.
- **Ideas:** banco de temas con puntuación y botón para pasar a guion.
- **Giveaway (solo en EVYM):** registro de anécdotas, finalistas y elección
  de ganadora de una botella de mezcal Los Muertos. Solo mayores de 18 años.
- **Pendientes:** checklist de publicación precargable (incluye verificar el
  destino de publicaciones cruzadas a Facebook y fijar el comentario).
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

Criterio de los skills `frontend-design` y `ui-ux-pro-max` (guardados en
`~/workspace/custom-skills/`), más las referencias de Framer (dynamic bento
card, editorial analytics) y el demo shadcn restaurant:

- Flat, sin gradientes ni sombras pesadas. Tarjetas blancas planas
  `rounded-xl` con borde fino sobre fondo gris muy claro.
- Tokens: tinta `#0F172A`, fondo `#F8FAFC`, borde `#E4ECFC`, primario
  `#2563EB`, éxito `#059669`, destructivo `#DC2626`, acento teal `#0D9488`.
- Tipografía Lexend (display) + Source Sans 3 (cuerpo), base 16px.
- La audacia está en un solo elemento: la meta semanal en panel oscuro con
  los 7 días. Lo demás, callado y disciplinado.
- Iconos solo SVG (Lucide), nunca emoji. Contraste 4.5:1, focos visibles,
  objetivos táctiles de 44px, transiciones de 150–200ms, `prefers-reduced-motion`
  respetado. Responsive 375 / 768 / 1024 / 1440 sin scroll horizontal.
