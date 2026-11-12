# ntbk

Cuaderno de notas con cuentas y sincronización en la nube. Interfaz en español, adaptable a escritorio y móvil. La versión web requiere iniciar sesión; la aplicación Tauri sigue en almacenamiento local y aún no tiene autenticación integrada.

## Stack

- **Bun**: dependencias, scripts y lockfile `bun.lock`.
- **React 19 + TypeScript** con comprobación estricta.
- **Vite** para desarrollo y producción.
- **Tauri 2 + Rust** para la aplicación nativa.
- **Tiptap 3 + ProseMirror**: encabezados, listas, tareas, citas, código, negrita, cursiva, subrayado e historial.
- **Recharts 3** (MIT): gráficas de barras, líneas y sectores con datos propios.
- **Univer Sheets 1.4.0** (núcleo Apache-2.0): hojas con fórmulas y pestañas, cargadas solo al abrir su editor. Sin paquetes Pro, conversión remota ni CDN.
- **Tailwind CSS 4** mediante `@tailwindcss/vite`: toda la interfaz y el contenido de Tiptap usan utilidades Tailwind. `src/styles.css` solo importa Tailwind y define los tokens del tema.
- **Iconoir React**: iconos SVG locales con tamaño y accesibilidad unificados en `src/components/icons.tsx`.
- **PostgreSQL** para cuentas y cuadernos en la versión web; **IndexedDB** conserva el cuaderno local como respaldo/importación. Tauri continúa usando **SQLite** sin sincronización.

## Desarrollo web

Instala [Bun](https://bun.sh) y ejecuta:

```sh
bun install
bun run dev
```

Abre **http://127.0.0.1:1420**.

```sh
bun run typecheck
bun run test
bun run build
bun run preview
```

Si Bun no está en el PATH, puedes usar `npx --yes bun@1.3.13 install` y `npx --yes bun@1.3.13 run dev` para la versión web.

## Backend y cuentas

`server/` contiene la API **Bun + Hono + PostgreSQL + Better Auth**. La web exige crear cuenta o iniciar sesión; el cuaderno se guarda en PostgreSQL por usuario. En el primer acceso, si esa cuenta aún no tiene cuaderno, importa el cuaderno local existente sin borrarlo. Puedes exportar una copia desde Ajustes. Tauri todavía funciona localmente y no puede acceder a las cuentas.

### Arrancar todo con Docker

Con Docker Desktop abierto, desde la raíz del proyecto:

```sh
docker compose up --build -d
```

Abre **http://127.0.0.1:1420**. Compose arranca PostgreSQL, genera y conserva el secreto de autenticación, aplica las migraciones y levanta backend y frontend con hot reload. Los cambios en `src/` y `server/src/` se reflejan sin reconstruir imágenes. No necesitas crear un `.env` ni instalar Bun para esta opción.

- Estado: `docker compose ps -a`
- Logs: `docker compose logs -f backend frontend`
- Detener conservando los datos: `docker compose down`

Para cambios en dependencias o Dockerfile, reconstruye con `docker compose up --build -d`. **`docker compose down -v` elimina las cuentas y el secreto guardados**, no lo uses para detener la aplicación normalmente.

Consulta **[server/README.md](server/README.md)** para desarrollo y pruebas. Telegram y recordatorios aún no están implementados.

## Aplicación nativa

Requiere Bun en el PATH, Rust estable y los [prerrequisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/) de cada plataforma. En Windows: Microsoft C++ Build Tools y WebView2; en macOS: Xcode Command Line Tools; en Linux: las bibliotecas de WebKitGTK y demás dependencias indicadas por Tauri.

```sh
bun run desktop:dev
bun run desktop:build
```

El empaquetado se hace en el sistema de destino. Los artefactos se generan en `src-tauri/target/release/bundle/`. Las firmas y certificados de distribución no están configurados.

Tauri también permite Android e iOS. El punto de entrada móvil está preparado; para generar los proyectos nativos hacen falta sus SDK y ejecutar `bun run tauri android init` o `bun run tauri ios init` (iOS requiere macOS). La compilación nativa no se ha verificado en este entorno: hay Rust y WebView2, pero faltan Visual Studio Build Tools con MSVC y el SDK de Windows.

## Funciones

- Crear, editar y eliminar notas con confirmación. Lo eliminado va a la papelera durante 30 días; desde ahí se puede restaurar o borrar de forma definitiva.
- Botón `Ajustes` al pie del panel izquierdo: abre un modal con `Apariencia` → `Claro` / `Oscuro`, y con `Copia de seguridad` para exportar o importar el cuaderno completo en JSON. Importar sustituye el cuaderno de la cuenta activa, previa confirmación. Los colores del editor, menús y diálogos usan los mismos tokens del tema.
- Carpetas y subcarpetas anidadas, con notas en cualquier nivel. Los ficheros son notas del editor, no archivos arbitrarios del sistema.
- Selecciona una carpeta y usa los botones superiores para crear dentro de ella; selecciona `Notas` para crear en la raíz. El menú `…` de cada carpeta permite crear contenido, renombrarla o eliminarla junto con su contenido, previa confirmación.
- Lista compacta de notas en una sola línea; la vista previa aparece al pasar el cursor.
- Arrastra una nota a una carpeta o a `Notas` para devolverla a la raíz. La carpeta de destino se resalta y se abre al soltar. Al arrastrar desde la búsqueda o favoritas se muestran las carpetas de destino sin perder los resultados.
- Alternativa para teclado y pantallas táctiles: menú `…` de la nota → `Mover a…`.
- La búsqueda y las favoritas recorren todas las carpetas y muestran la ruta de cada resultado.
- Búsqueda por título y contenido, independiente de acentos y mayúsculas.
- Vista de dos paneles: lista de notas y editor, sin navegación ni información decorativa.
- Favoritas mediante el filtro de estrella y orden por última edición.
- Barra flotante con posición libre: arrastra el asa con ratón, lápiz o pantalla táctil y suéltala en cualquier punto del editor, sin ajuste automático a esquinas. Escape cancela el arrastre; las flechas del teclado desplazan el asa (Shift para pasos mayores). El menú de posición mantiene las esquinas como atajos. La ubicación se guarda con el cuaderno de la cuenta web (o en SQLite en Tauri) y se adapta al tamaño de la ventana para que la barra siga accesible. Al flotar puede superponerse al texto: muévela donde te resulte más cómoda.
- Barra vertical compacta: negrita, cursiva, encabezado, lista, enlace y color quedan a la vista. Tachado (`Ctrl/Cmd+Shift+S`), subrayado y el resto del formato se abren en un panel lateral. Los enlaces aceptan `http`, `https` y `mailto`; el color usa una paleta o un valor hexadecimal.
- Tamaño de texto en el botón numérico de la barra. Al abrirlo: valor entero entre 8 y 200 px (Enter o salir del campo), `−` / `+`, tamaños predefinidos y restauración del tamaño del párrafo o encabezado. Se aplica a la selección o a lo que escribas después y se conserva al guardar y exportar. `Tamaño` indica selecciones mixtas; Escape descarta la entrada. No se aplica dentro de código.
- Cada herramienta muestra su nombre y atajo al pasar el ratón o enfocarla con el teclado (Ctrl en Windows/Linux, Cmd en Mac). Las ayudas se adaptan al borde de la ventana, se cierran con Escape y no interfieren con el arrastre.
- Enlaces entre notas: escribe `[[` y elige un título. El enlace abre esa nota. No incluye la nota actual.
- Contador discreto de palabras y caracteres al pie del editor. Solo aparece mientras escribes el título o el contenido.
- Guardado automático, estado visible de guardado y reintento en caso de error.
- Menú `…` de la nota para marcar como favorita, exportar HTML o eliminar.
- Icono personalizable por nota y carpeta: menú `…` → `Cambiar icono`. Catálogo de más de 100 iconos Iconoir, con búsqueda por nombre y sinónimos, filtros por categoría y opción de restaurar el predeterminado. La elección se guarda con el cuaderno de la cuenta web o localmente en Tauri; los cuadernos anteriores siguen siendo compatibles.
- Los cuadernos nuevos empiezan con una nota vacía; las notas existentes se conservan.
- `Ctrl/Cmd+K`: buscar; `Ctrl/Cmd+Alt+N`: nueva nota.
- Atajos del editor: `Ctrl/Cmd+B`, `I`, `U`, `Z` y `Shift+Z`.

## Gráficas y hojas de cálculo

En la barra del editor, **Insertar (+)** → **Gráfica** o **Hoja de cálculo**. Se editan en un diálogo ampliado; **Aplicar** actualiza la nota y activa su guardado automático. **Cancelar** descarta el borrador (con confirmación si hay cambios). Cada bloque tiene **Editar** y **Eliminar** y puede copiarse entre notas. Deshacer/rehacer de la nota revierte aplicaciones completas; dentro de la hoja se utiliza el historial del motor.

- Las gráficas admiten barras, líneas y sectores; su tabla de datos es independiente de las hojas. Máximo 500 filas y 8 series. Sectores requiere una serie con valores no negativos y alguno positivo. Se aceptan decimales con coma o punto, sin separadores de miles.
- Cada hoja comienza con 100 filas, 26 columnas y `Hoja 1`. Admite más pestañas y las fórmulas del preset libre (por ejemplo `=SUM(A1:A3)`), sin garantizar equivalencia completa con Excel. La interfaz del motor está en español. La nota muestra una vista previa parcial de hasta 10 filas × 6 columnas de la pestaña activa.
- Máximo 1 MiB de datos JSON por bloque y 5 MiB por cuaderno. Si una edición supera el límite, se conserva el borrador para reducirlo.
- No incluye XLSX/CSV, colaboración ni gráficas enlazadas a hojas. Los snapshots de una versión distinta del motor se conservan, pero no se abren para edición con esta versión.
- La copia JSON conserva los libros y gráficas editables. Exportar HTML crea un documento estático con SVG y tabla para gráficas y una tabla parcial para hojas; no incluye los snapshots editables ni scripts.
- Univer tiene un bundle considerable, diferido hasta editar una hoja. No se ha ampliado la CSP de Tauri para permitir scripts externos o `unsafe-eval`.

### Verificación de la integración

Pruebas de tipos, suite Vitest y build de producción comprobados. También se verificaron en navegador (API simulada) los tres tipos de gráfica, fórmulas y recálculo al cambiar valores, varias pestañas, recarga, copiar/pegar entre notas con nuevos IDs, copias JSON, exportación SVG/HTML, tema oscuro, móvil y reintento tras un error de guardado. El upsert que protege v3 se probó con PostgreSQL real en un contenedor desechable, incluidas peticiones concurrentes. El editor de hojas se descarga solo al abrirlo; su chunk sigue siendo grande (~6,7 MB sin comprimir, ~1,8 MB gzip). La verificación nativa queda pendiente por los prerrequisitos de Windows indicados arriba.

## Persistencia y privacidad

La web exige sesión y guarda un snapshot JSON del cuaderno en PostgreSQL, asociado exclusivamente al usuario autenticado. Las escrituras se serializan para evitar que una versión anterior reemplace una reciente. En el primer acceso sin cuaderno en la cuenta, se importa una sola vez el cuaderno previo de IndexedDB y se conserva la copia local. Tauri sigue guardando en `sqlite:ntbk.db` mediante la tabla `workspace`; la autenticación nativa todavía no está integrada.

La ventana de Tauri tiene `dragDropEnabled: false` para permitir el arrastre HTML5 interno en Windows. No se importan archivos arrastrados desde el sistema.

La apariencia se guarda en el snapshot del cuaderno. `public/theme-init.js` aplica una caché mínima de la preferencia (`ntbk:theme` en localStorage) antes de cargar React para evitar un destello claro al abrir en oscuro; después, el dato del cuaderno es el que se aplica.

El snapshot de versión 3 incluye notas, carpetas y bloques de gráficas/hojas serializados en el HTML de cada nota. Los cuadernos v2 y las notas del formato anterior se migran automáticamente, conservando identificadores y contenido (las notas antiguas quedan en la raíz). Desplegar el backend antes que el frontend: una escritura v2 no puede reemplazar atómicamente un cuaderno que ya sea v3; devuelve `409 workspace_upgrade_required`. Los clientes antiguos rechazan v3 al cargar para evitar que borren bloques desconocidos. El snapshot previo en IndexedDB se conserva como respaldo local. Los datos con formato incompatible o jerarquía inválida no se sobrescriben.

Las cuentas web guardan sus notas en el servidor; el respaldo previo de IndexedDB y el cuaderno Tauri son independientes y no se sincronizan. La copia JSON de Ajustes permite exportar o importar el cuaderno activo. La exportación HTML permite conservar una copia legible de cada nota; la aplicación no vuelve a importarla. El servidor de desarrollo no equivale a una PWA instalable/offline.

## Estructura

```text
src/
  App.tsx                    Cuaderno, selección y guardado
  components/NoteEditor.tsx  Documento, Tiptap y zona de herramientas
  components/EditorToolbar.tsx Riel vertical de formato y paneles laterales
  components/ToolbarPopover.tsx Paneles anclados que no ensanchan la barra
  components/FloatingToolbar.tsx Posición libre, límites y adaptación de tamaño
  components/useToolbarDrag.ts Arrastre con Pointer Events y cancelación
  components/FileExplorer.tsx Carpetas y notas anidadas
  components/Dialog.tsx      Modal accesible con gestión de foco
  components/ui.tsx          Botones y menús reutilizables con Tailwind
  components/icons.tsx       Iconoir y configuración común de SVG
  lib/notes.ts               Modelo, búsqueda y utilidades
  lib/editor-layout.ts       Posiciones de la barra y preferencia predeterminada
  lib/workspace.ts           Jerarquía, migración y eliminación recursiva
  lib/storage.ts             Adaptador IndexedDB / SQLite
  styles.css                 Importación de Tailwind 4 y tokens del tema
src-tauri/
  src/lib.rs                 Inicio de Tauri y migración SQLite
  capabilities/default.json Permisos de la ventana principal
  tauri.conf.json            Configuración nativa y CSP
```

Las pruebas cubren notas, búsqueda, orden, extracción de texto, jerarquías de carpetas, eliminación recursiva, migración de notas antiguas y persistencia IndexedDB, incluidas escrituras concurrentes. No sustituyen pruebas de integración nativas de SQLite/Tauri.
