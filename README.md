# Panel EVYM — Marketing de contenido

Panel de marketing para gestionar el contenido de **Entre Vivos y Muertos**,
**Antojo** y el **perfil personal** de Isra Granados — y de las marcas que
vengan después. Es un panel multi-marca: cada marca tiene su propio espacio
con sus métricas, su contenido y sus ideas, y la barra lateral cambia de
uno a otro. La idea es que sea una máquina: cada día abre el panel y sabe
qué producir y qué publicar, con las métricas reales de todo.

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
  en versiones anteriores migran solos. El token de Meta vive aparte, en
  sus propias claves (`panel-evym-meta-token` y `panel-evym-meta-state`).

## Qué trae

Dashboard analítico denso pero refinado (estilo shadcn, "fino"): barra
lateral delgada con iconos y etiquetas, cabecera con buscador, tarjetas
KPI con minigráfica y delta, gráfica de líneas grande, dona por red y
listas organizadas. Tarjetas blancas, bordes sutiles, fondo gris muy
claro, tipografía pulida, color solo para series y estados.

- **Barra lateral:** Hoy, Métricas, Contenido, Ideas, Giveaway (solo
  EVYM), Pendientes, Bitácora y Conexiones. Ítem activo con fondo sutil.
  Abajo, el selector de espacio: EVYM, Antojo, Personal. En móvil la
  barra se convierte en una tira horizontal de secciones.
- **Cabecera:** título de la pantalla actual y buscador global: encuentra
  Reels, ideas y anécdotas del espacio activo (y secciones por nombre);
  tocar un resultado abre la pantalla que le corresponde.
- **Hoy (el dashboard):** fila de 4 tarjetas KPI — vistas totales,
  seguidores, comentarios y racha — cada una con su minigráfica (sparkline)
  y su delta vs la captura anterior; gráfica de líneas de vistas en el
  tiempo (una serie por red); dona de vistas por red; y abajo el Reel de
  hoy con su siguiente paso (la acción principal de la máquina), la
  semana, la cola de publicación y el siguiente tema sugerido.
- **Métricas:** capturas por red con sus deltas, gráfica de vistas por
  captura, curva de seguidores en el tiempo, historial de capturas con su
  origen (Manual, CSV o Meta) y registro manual o importación de CSV de
  Business Suite.
- **Contenido:** el pipeline idea → guion → imágenes → edición →
  publicado, con la meta de 7 Reels por semana.
- **Ideas:** el banco de ideas con puntuación; la mejor pasa a guion.
- **Giveaway:** solo en EVYM: anécdotas, finalistas y elección de ganadora
  (mayores de 18 años).
- **Pendientes:** el checklist de publicación.
- **Bitácora:** el registro de todo lo que pasa (capturas, importaciones,
  sincronizaciones).
- **Conexiones:** sincronización real con Meta (Facebook + Instagram).
  Ver abajo.

## Datos iniciales

Solo los datos reales capturados el 10 nov 2026 están precargados en EVYM:

- Facebook: 281 vistas, 1 seguidor, 5 reacciones, 0 comentarios, 0 compartidos.
- Instagram: 42 seguidores, 3,172 vistas, 13 me gusta, 0 comentarios,
  2 compartidos, 537 interacciones.
- Reels publicados: "Leyenda de La Pascualita" (9 nov, 281 reproducciones)
  y "El Secreto de la Calle Salamanca" (10 nov). Semana: 2 de 7.

Antojo y el perfil personal arrancan vacíos, a propósito. Los deltas, las
minigráficas y las tendencias solo aparecen cuando hay dos capturas por
red; con una sola captura se muestra "Línea base". Nada está inventado.

## Conexiones — sincronizar con Meta

La vista **Conexiones** sincroniza las métricas reales de Facebook e
Instagram con la Graph API de Meta (v21.0). El token lo pega el usuario y
se guarda **solo en localStorage de su navegador**; nunca sale de ahí ni
se guarda en el repo.

**Cómo conseguir el token:**

1. Entra a developers.facebook.com con tu cuenta de Facebook (la que
   administra la Página) y crea una app (tipo "Negocios" u "Otro"). La
   app se puede llamar "Panel EVYM".
2. En la app, abre Herramientas → Explorador de la API Graph, elige tu
   app y pulsa "Generar token de acceso".
3. Agrega estos permisos: `pages_show_list`, `pages_read_engagement`,
   `instagram_basic`, `instagram_manage_insights`. Como eres el dueño de
   la app, funcionan sin revisión de Meta.
4. En el mismo Explorador, abre el token en el "Depurador de tokens" y
   pulsa "Ampliar token de acceso": así dura unos 60 días en lugar de
   una hora.
5. Copia el token ampliado y pégalo en Conexiones. Pulsa "Probar
   conexión": deberías ver tu Página "Entre vivos y muertos" y la cuenta
   @entrevivosymuertos666. Si administras más Páginas (Antojo, etc.),
   también aparecen: elige la que quieres sincronizar y el espacio donde
   guardar sus capturas.

**Qué trae la sincronización:**

- Facebook: seguidores actuales (`fan_count`) e impresiones y
  participaciones de los últimos 28 días (`page_impressions`,
  `page_post_engagements`).
- Instagram: seguidores actuales y vistas (impresiones) y alcance
  sumados de los últimos 28 días.
- Cada sincronización crea una captura por red con la fecha de hoy y el
  periodo "Últimos 28 días (Meta)". Si ya existe una captura de Meta
  para esa red y ese día, se reemplaza, no se duplica. Cada sincronización
  queda anotada en la Bitácora.
- **Lo que la API no devuelve se marca como no disponible, nunca se
  inventa:** Meta no desglosa reacciones, comentarios y compartidos a
  nivel de página, así que esos campos se guardan vacíos y se muestran
  como "Sin datos".
- Errores en español claro: token inválido o caducado, permiso faltante
  (con el nombre del permiso), Página o Instagram no encontrados, límite
  de peticiones. Si una red falla, la otra igual se sincroniza y el fallo
  queda en el reporte.
- El token de larga duración caduca (~60 días): cuando la sincronización
  falle con "token inválido o caducó", repite los pasos 2–5 y pega el
  nuevo. El token de la Página que usa el panel no caduca mientras el
  token de usuario siga vigente.

TikTok y YouTube todavía no se sincronizan: necesitan su propia app de
desarrollador (TikTok para Empresas, Google Cloud + API de YouTube). Por
ahora, sus métricas se registran a mano en Métricas. La vista Conexiones
lo dice así, sin prometerlo.

## Diseño

Dashboard analítico premium, no minimalista vacío: la herramienta es de
datos y se tiene que ver como tal — densa, pero ordenada y legible.

- Barra lateral delgada (240px) con icono + etiqueta, activo con fondo
  sutil; cabecera blanca con buscador en píldora.
- Tarjetas blancas sólidas, bordes finos, sombra mínima, fondo gris muy
  claro (`#f5f5f7`); rejilla densa con ritmo (KPIs, gráficas 2:1, listas).
- Tipografía refinada con la pila del sistema (aproximación a SF Pro),
  titulares semibold con tracking ajustado: título de vista 24, KPIs 30,
  cuerpo 14–15, pie 12–13.
- Color con moderación: azul `#0071e3` para acciones y la serie de
  Facebook, violeta para Instagram, verde para lo publicado o en alza,
  rojo para lo que baja. Sin color decorativo.
- Affordances claras: lo tocable lleva chevron, botón o fila con hover;
  lo que no se toca es texto plano. Objetivos táctiles de 44px en móvil.
- Responsive 375 / 768 / 1024 / 1440 sin scroll horizontal. En móvil la
  navegación es una tira horizontal y el dashboard se apila.
- Iconos solo SVG (Lucide), nunca emoji. Contraste 4.5:1, focos visibles,
  `prefers-reduced-motion` respetado.
- Nota técnica (Next.js 16, Cache Components): la fecha de hoy se lee solo
  en el cliente (`src/components/useToday.ts`); leer el reloj durante el
  prerender rompe el build. Las funciones de `src/lib/derive.ts` que
  dependen del día (racha, Reel de hoy) reciben la fecha como parámetro
  y no leen el reloj.

## Medición

Tres formas de meter métricas, en orden de comodidad: sincronizar con
Meta en Conexiones (Facebook + Instagram, últimos 28 días), importar el
CSV de Business Suite en Métricas, o registrar la captura a mano. Con la
segunda captura por red aparecen los deltas, las minigráficas y las
tendencias reales.
