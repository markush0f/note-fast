# Chat con Ollama local

El panel **Asistente** de la versión web puede conversar con modelos instalados en Ollama. Incluye selector de modelo, historial en memoria, nueva conversación, reintento y cancelación. Enter envía; Mayús+Enter inserta un salto de línea.

El chat comparte con Ollama el texto de la **página actual** para que pueda preparar propuestas cuando le pidas explícitamente redactarla o cambiarla. No puede buscar otras páginas, cuadernos ni adjuntos. Una propuesta de añadir/reemplazar texto se muestra en el chat y solo se aplica al pulsar **Aplicar propuesta**; puedes descartarla. Si la página cambió desde que se generó la propuesta, no se aplica. El texto propuesto se trata como texto plano y se escapa antes de insertarlo, nunca como HTML ejecutable. Aún no se editan los bloques de hoja de cálculo incrustados. El historial no se guarda en PostgreSQL ni en el navegador: desaparece al recargar o cerrar sesión, pero se conserva al ocultar el panel. Las respuestas se muestran completas al terminar la generación, no token a token.

## Preparar Ollama

1. Instala [Ollama](https://ollama.com/download) y arráncalo. En Windows puede estar ejecutándose desde la bandeja del sistema; si no utilizas la aplicación, ejecuta `ollama serve`.
2. Descarga un modelo de texto adecuado a la memoria disponible, por ejemplo:

   ```sh
   ollama pull llama3.2
   ollama list
   ```

3. Comprueba que `http://127.0.0.1:11434/api/tags` devuelve una lista de modelos.

Usa modelos descargados **locales**, no variantes cloud. Para impedir también que Ollama use sus funciones de nube, configura `OLLAMA_NO_CLOUD=1` en el entorno de **Ollama** y reinícialo. Esta variable no corresponde al backend de ntbk. La primera descarga necesita Internet; conversar con un modelo local ya descargado no requiere un proveedor externo.

## ntbk con Docker Compose

El backend utiliza por defecto:

```text
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

`host.docker.internal` se refiere al equipo que ejecuta Docker, no al dispositivo que abre el navegador. Compose añade la resolución `host-gateway` para Linux. Para aplicar esta configuración a un contenedor ya creado:

```sh
docker compose up --build -d
```

Si el contenedor no puede acceder a Ollama porque este solo escucha en loopback, configura `OLLAMA_HOST=0.0.0.0:11434` en el entorno de Ollama y reinícialo. En Windows: cierra Ollama desde la bandeja, añade la variable en las variables de entorno de tu usuario y vuelve a abrir Ollama. En Linux con systemd configura la variable en el servicio.

**No publiques el puerto 11434 en Internet.** Ollama local no exige autenticación. Al escuchar en `0.0.0.0`, limita el acceso con el cortafuegos a tu equipo/red de Docker; también puedes usar una interfaz más restringida que sea accesible desde el contenedor. No hace falta configurar `OLLAMA_ORIGINS`: el navegador habla con ntbk y solo el backend habla con Ollama.

Para usar otro servidor local, añade en el `.env` de la **raíz** (Compose no lee `server/.env`):

```dotenv
OLLAMA_BASE_URL=http://mi-servidor-local:11434
```

Después recrea el backend con `docker compose up -d backend`. La URL debe ser un origen HTTP(S), sin `/api`, rutas, credenciales ni parámetros. Ollama no se instala ni descarga modelos automáticamente desde ntbk.

## ntbk sin contenedores

En `server/.env`:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Arranca o reinicia el backend (`bun run server:dev`) y el frontend (`bun run dev`). Se requiere la sesión web habitual de ntbk. Esta integración no añade soporte a Tauri.

## Usar el chat

1. Inicia sesión y abre **Asistente**.
2. Elige un modelo instalado; **Actualizar modelos** vuelve a consultar Ollama.
3. Escribe y envía el mensaje. La primera respuesta puede tardar mientras se carga el modelo.
4. **Detener** cancela la petición y recupera el borrador. Una respuesta fallida también recupera el borrador para reenviarlo sin duplicar el mensaje.
5. **Nueva conversación** borra el historial de este panel.

El modelo puede equivocarse. Las respuestas y propuestas se muestran como texto, sin ejecutar HTML ni acciones.

## Límites y problemas frecuentes

- **No se puede conectar:** verifica Ollama, la URL del backend y el acceso desde Docker. `localhost` dentro del contenedor no es tu equipo.
- **Sin modelos:** ejecuta `ollama pull llama3.2` en el servidor Ollama y actualiza la lista.
- **Modelo no instalado:** puede haberse eliminado después de cargar la lista. Actualízala.
- **Respuesta lenta:** carga previamente el modelo o usa uno más pequeño. Cada generación tiene un tiempo máximo de 180 segundos y una salida máxima de 2048 tokens; el proxy Nginx incluido espera hasta 210 segundos. Ajusta también los proxies externos si los utilizas.
- Se admite una generación simultánea por cuenta y hasta cuatro por proceso de backend. Máximo 20 mensajes enviados por petición (10 turnos), 16 000 caracteres por mensaje y 64 000 caracteres acumulados. Inicia una conversación nueva si alcanzas el límite.
- La API exige sesión y `X-Notebook-User` coincidente. POST exige un `Origin` autorizado, igual que el resto de mutaciones. El cliente no puede elegir la URL de destino ni proporcionar herramientas o instrucciones de sistema.
- Un backend desplegado en otra máquina no puede acceder al Ollama de tu portátil mediante `127.0.0.1`: la dirección se resuelve desde el backend. Esta configuración está pensada para ntbk y Ollama ejecutados en el mismo equipo o en una red local de confianza.

Referencia: [API de chat](https://docs.ollama.com/api/chat), [modelos instalados](https://docs.ollama.com/api/tags) y [configuración de Ollama](https://docs.ollama.com/faq).
