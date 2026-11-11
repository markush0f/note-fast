# ntbk

Un cuaderno local, sin cuentas ni servicios externos. Interfaz en español, adaptable a escritorio y móvil.

## Stack

- **Bun**: dependencias, scripts y lockfile `bun.lock`.
- **React 19 + TypeScript** con comprobación estricta.
- **Vite** para desarrollo y producción.
- **Tauri 2 + Rust** para la aplicación nativa.
- **Tiptap 3 + ProseMirror**: encabezados, listas, tareas, citas, código, negrita, cursiva, subrayado e historial.
- **Tailwind CSS 4** mediante `@tailwindcss/vite`: toda la interfaz y el contenido de Tiptap usan utilidades Tailwind. `src/styles.css` solo importa Tailwind y define los tokens del tema.
- **Iconoir React**: iconos SVG locales con tamaño y accesibilidad unificados en `src/components/icons.tsx`.
- **IndexedDB** en navegador; **SQLite** mediante `tauri-plugin-sql` en Tauri.

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

## Aplicación nativa

Requiere Bun en el PATH, Rust estable y los [prerrequisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/) de cada plataforma. En Windows: Microsoft C++ Build Tools y WebView2; en macOS: Xcode Command Line Tools; en Linux: las bibliotecas de WebKitGTK y demás dependencias indicadas por Tauri.

```sh
bun run desktop:dev
bun run desktop:build
```

El empaquetado se hace en el sistema de destino. Los artefactos se generan en `src-tauri/target/release/bundle/`. Las firmas y certificados de distribución no están configurados.

Tauri también permite Android e iOS. El punto de entrada móvil está preparado; para generar los proyectos nativos hacen falta sus SDK y ejecutar `bun run tauri android init` o `bun run tauri ios init` (iOS requiere macOS). La compilación nativa no se ha verificado en el entorno de creación, que no dispone de Rust.

## Funciones

- Crear, editar y eliminar notas con confirmación. Lo eliminado va a la papelera durante 30 días; desde ahí se puede restaurar o borrar de forma definitiva.
- Botón `Ajustes` al pie del panel izquierdo: abre un modal con `Apariencia` → `Claro` / `Oscuro`, y con `Copia de seguridad` para exportar o importar el cuaderno completo en JSON. Importar sustituye las notas de este dispositivo, previa confirmación. Los colores del editor, menús y diálogos usan los mismos tokens del tema.
- Carpetas y subcarpetas anidadas, con notas en cualquier nivel. Los ficheros son notas del editor, no archivos arbitrarios del sistema.
- Selecciona una carpeta y usa los botones superiores para crear dentro de ella; selecciona `Notas` para crear en la raíz. El menú `…` de cada carpeta permite crear contenido, renombrarla o eliminarla junto con su contenido, previa confirmación.
- Lista compacta de notas en una sola línea; la vista previa aparece al pasar el cursor.
- Arrastra una nota a una carpeta o a `Notas` para devolverla a la raíz. La carpeta de destino se resalta y se abre al soltar. Al arrastrar desde la búsqueda o favoritas se muestran las carpetas de destino sin perder los resultados.
- Alternativa para teclado y pantallas táctiles: menú `…` de la nota → `Mover a…`.
- La búsqueda y las favoritas recorren todas las carpetas y muestran la ruta de cada resultado.
- Búsqueda por título y contenido, independiente de acentos y mayúsculas.
- Vista de dos paneles: lista de notas y editor, sin navegación ni información decorativa.
- Favoritas mediante el filtro de estrella y orden por última edición.
- Barra flotante con posición libre: arrastra el asa con ratón, lápiz o pantalla táctil y suéltala en cualquier punto del editor, sin ajuste automático a esquinas. Escape cancela el arrastre; las flechas del teclado desplazan el asa (Shift para pasos mayores). El menú de posición mantiene las esquinas como atajos. La ubicación se guarda en IndexedDB o SQLite y se adapta al tamaño de la ventana para que la barra siga accesible. Al flotar puede superponerse al texto: muévela donde te resulte más cómoda.
- Barra vertical compacta: negrita, cursiva, encabezado, lista, enlace y color quedan a la vista. Tachado (`Ctrl/Cmd+Shift+S`), subrayado y el resto del formato se abren en un panel lateral. Los enlaces aceptan `http`, `https` y `mailto`; el color usa una paleta o un valor hexadecimal.
- Tamaño de texto en el botón numérico de la barra. Al abrirlo: valor entero entre 8 y 200 px (Enter o salir del campo), `−` / `+`, tamaños predefinidos y restauración del tamaño del párrafo o encabezado. Se aplica a la selección o a lo que escribas después y se conserva al guardar y exportar. `Tamaño` indica selecciones mixtas; Escape descarta la entrada. No se aplica dentro de código.
- Cada herramienta muestra su nombre y atajo al pasar el ratón o enfocarla con el teclado (Ctrl en Windows/Linux, Cmd en Mac). Las ayudas se adaptan al borde de la ventana, se cierran con Escape y no interfieren con el arrastre.
- Enlaces entre notas: escribe `[[` y elige un título. El enlace abre esa nota. No incluye la nota actual.
- Contador discreto de palabras y caracteres al pie del editor. Solo aparece mientras escribes el título o el contenido.
- Guardado automático, estado visible de guardado y reintento en caso de error.
- Menú `…` de la nota para marcar como favorita, exportar HTML o eliminar.
- Icono personalizable por nota y carpeta: menú `…` → `Cambiar icono`. Catálogo de más de 100 iconos Iconoir, con búsqueda por nombre y sinónimos, filtros por categoría y opción de restaurar el predeterminado. La elección se guarda localmente y se conserva al renombrar carpetas o mover notas; los cuadernos anteriores siguen siendo compatibles.
- Los cuadernos nuevos empiezan con una nota vacía; las notas existentes se conservan.
- `Ctrl/Cmd+K`: buscar; `Ctrl/Cmd+Alt+N`: nueva nota.
- Atajos del editor: `Ctrl/Cmd+B`, `I`, `U`, `Z` y `Shift+Z`.

## Persistencia y privacidad

`src/lib/storage.ts` selecciona el backend con `isTauri()`. En web se usa la clave `ntbk:workspace:v1` de IndexedDB. En Tauri, `sqlite:ntbk.db` se guarda en el directorio de configuración de la aplicación; una migración Rust crea la tabla `workspace`. Cada guardado reemplaza atómicamente un snapshot JSON del cuaderno. Las escrituras se serializan para evitar que una versión antigua sobrescriba otra nueva.

La ventana de Tauri tiene `dragDropEnabled: false` para permitir el arrastre HTML5 interno en Windows. No se importan archivos arrastrados desde el sistema.

La apariencia se guarda en el snapshot del cuaderno. `public/theme-init.js` aplica una caché mínima de la preferencia (`ntbk:theme` en localStorage) antes de cargar React para evitar un destello claro al abrir en oscuro; después, el dato del cuaderno es el que se aplica.

El snapshot de versión 2 incluye notas y carpetas. Las notas del formato anterior se migran automáticamente a la raíz, conservando identificadores y contenido. Se mantiene la clave de almacenamiento original y la misma tabla SQLite: no hace falta cambiar la migración SQL. Los datos con un formato no compatible o una jerarquía inválida no se sobrescriben.

Los datos del navegador y de la aplicación nativa **son independientes**. En web, cada origen (host/puerto) tiene su propio almacén. Borrar los datos del sitio o desinstalar la aplicación puede borrar las notas. No hay sincronización ni cifrado. La copia JSON de Ajustes sirve para guardar el cuaderno o pasarlo entre el navegador y la aplicación nativa; no es automática. La exportación HTML permite conservar una copia legible de cada nota; la aplicación no vuelve a importarla. El servidor de desarrollo no equivale a una PWA instalable/offline.

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
