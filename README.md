# ntbk

Un cuaderno local, sin cuentas ni servicios externos. Interfaz en español, adaptable a escritorio y móvil.

## Stack

- **Bun**: dependencias, scripts y lockfile `bun.lock`.
- **React 19 + TypeScript** con comprobación estricta.
- **Vite** para desarrollo y producción.
- **Tauri 2 + Rust** para la aplicación nativa.
- **Tiptap 3 + ProseMirror**: encabezados, listas, tareas, citas, código, negrita, cursiva, subrayado e historial.
- **Tailwind CSS 4** mediante `@tailwindcss/vite`, con estilos propios y sin fuentes externas.
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

- Crear, editar y eliminar notas con confirmación.
- Búsqueda por título y contenido, independiente de acentos y mayúsculas.
- Favoritas, orden por última edición y contador de palabras.
- Guardado automático, estado visible de guardado y reintento en caso de error.
- Exportación de la nota activa como HTML desde el botón de descarga.
- `Ctrl/Cmd+K`: buscar; `Ctrl/Cmd+Alt+N`: nueva nota.
- Atajos del editor: `Ctrl/Cmd+B`, `I`, `U`, `Z` y `Shift+Z`.

## Persistencia y privacidad

`src/lib/storage.ts` selecciona el backend con `isTauri()`. En web se usa la clave `ntbk:workspace:v1` de IndexedDB. En Tauri, `sqlite:ntbk.db` se guarda en el directorio de configuración de la aplicación; una migración Rust crea la tabla `workspace`. Cada guardado reemplaza atómicamente un snapshot JSON del cuaderno. Las escrituras se serializan para evitar que una versión antigua sobrescriba otra nueva.

Los datos del navegador y de la aplicación nativa **son independientes**. En web, cada origen (host/puerto) tiene su propio almacén. Borrar los datos del sitio o desinstalar la aplicación puede borrar las notas. No hay sincronización, cifrado, importación ni copias de seguridad automáticas. La exportación HTML permite conservar una copia legible de cada nota; la aplicación no vuelve a importarla. El servidor de desarrollo no equivale a una PWA instalable/offline.

## Estructura

```text
src/
  App.tsx                    Cuaderno, selección y guardado
  components/NoteEditor.tsx  Tiptap y barra de formato
  lib/notes.ts               Modelo, búsqueda y utilidades
  lib/storage.ts             Adaptador IndexedDB / SQLite
  styles.css                 Tailwind 4 y diseño responsive
src-tauri/
  src/lib.rs                 Inicio de Tauri y migración SQLite
  capabilities/default.json Permisos de la ventana principal
  tauri.conf.json            Configuración nativa y CSP
```

Las pruebas cubren el modelo de notas, búsqueda, orden, extracción de texto y persistencia IndexedDB, incluidas escrituras concurrentes. No sustituyen pruebas de integración nativas de SQLite/Tauri.
