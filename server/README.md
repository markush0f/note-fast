# Backend de ntbk

API con Bun, Hono, PostgreSQL y Better Auth. Gestiona cuentas, sesiones y el cuaderno completo JSON aislado por usuario. La versión web requiere autenticación; Tauri continúa usando almacenamiento local y no integra estas cuentas. Telegram y recordatorios no están implementados.

## Todo con Docker (recomendado)

Con Docker Desktop abierto y Compose v2, desde la raíz:

```sh
docker compose up --build -d
```

No necesitas Bun, PostgreSQL ni un `.env` en el equipo. Compose:

1. Arranca PostgreSQL y espera a su comprobación de salud.
2. Ejecuta `migrate`, que genera un secreto aleatorio persistente y aplica las migraciones. Si falla, el backend no arranca.
3. Arranca el backend con un watcher por polling (reinicio al cambiar TypeScript) y espera a `/ready`.
4. Sirve el frontend con Vite, hot reload y proxy de `/api/*` al backend.

- **Aplicación:** http://127.0.0.1:1420
- **Backend listo:** http://127.0.0.1:3000/ready
- **Perfil a través del frontend:** http://127.0.0.1:1420/api/me (401 hasta iniciar sesión).
- **Cuaderno autenticado:** `GET`/`PUT http://127.0.0.1:1420/api/workspace`.

La primera vez que una cuenta sin cuaderno inicia sesión, la web importa el cuaderno local existente, si lo hay, sin borrar la copia local. Docker monta `src/` y `server/src/`: los cambios del frontend activan HMR y los del backend reinician el proceso Bun automáticamente mediante polling, compatible con los volúmenes de Docker Desktop. Los cambios de dependencias requieren `docker compose up --build -d`. No ejecutes Vite en paralelo en el puerto 1420.

```sh
docker compose ps -a
docker compose logs -f backend frontend
docker compose logs migrate
docker compose down
```

`down` conserva las cuentas, cuadernos y secreto en los volúmenes `ntbk-postgres` y `ntbk-auth`. **`down -v` borra ambos**, no lo uses para un reinicio normal. El cuaderno local previo se conserva en el navegador; exporta una copia antes de cambiar de origen.

Opcionalmente puedes proporcionar `BETTER_AUTH_SECRET` desde el entorno o un `.env` en la raíz para Compose. Debe ser el mismo en migrador y backend y mantenerse estable; no cambies de estrategia de secreto con sesiones activas. Compose no lee `server/.env` ni lo copia a la imagen. El secreto generado no se imprime en los logs. La configuración HTTP y la contraseña de PostgreSQL incluidas son **solo locales**, y los puertos solo se publican en loopback.

## Desarrollo sin contenedores para la aplicación

Para ejecutar backend y frontend directamente con Bun y usar Docker solo para PostgreSQL, desde la raíz:

```sh
bun install
# Requiere Docker Compose; también puedes usar un PostgreSQL propio.
docker compose up -d db
cp server/.env.example server/.env
bun -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Pega el secreto generado en `BETTER_AUTH_SECRET` dentro de `server/.env`. Después:

```sh
bun run server:migrate
bun run server:dev
```

El servidor escucha en `http://127.0.0.1:3000`. Bun carga `server/.env` porque los scripts se ejecutan desde `server/`. No pongas secretos en variables `VITE_*`. El archivo Compose y su contraseña son **solo para desarrollo**, no una configuración de producción. `docker compose down` conserva los datos; `docker compose down -v` los elimina.

### Configuración

| Variable | Función |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL; en alojamiento remoto configurar TLS según el proveedor, sin desactivar la validación de certificados. |
| `BETTER_AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres; mantener estable entre reinicios. |
| `BETTER_AUTH_URL` | Origen público del backend, sin ruta. |
| `APP_ORIGINS` | Orígenes de frontend permitidos, separados por comas; nunca `*`. |
| `HOST` / `PORT` | Por defecto `127.0.0.1:3000`; en contenedores usar `HOST=0.0.0.0`. |
| `NODE_ENV` | `production` exige HTTPS tanto en backend como en los orígenes del frontend y activa cookies Secure. |

Usa el mismo nombre de host en frontend y backend: no mezclar `localhost` con `127.0.0.1`. En producción servir frontend y API bajo el mismo sitio (por ejemplo `app.example.com` y `api.example.com`) para mantener cookies SameSite. La integración de autenticación con Tauri se implementará por separado; no está habilitada implícitamente.

## Rutas

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/health` | Proceso activo. |
| GET | `/ready` | PostgreSQL accesible; responde 503 si no lo está. No comprueba migraciones. |
| POST | `/api/auth/sign-up/email` | Registro: `{ "name", "email", "password" }`. |
| POST | `/api/auth/sign-in/email` | Acceso: `{ "email", "password" }`. |
| POST | `/api/auth/sign-out` | Invalida la sesión. |
| GET | `/api/auth/get-session` | Consulta de sesión de Better Auth. |
| GET | `/api/me` | Perfil de la cuenta autenticada; 401 si no hay sesión. |
| GET | `/api/workspace` | Lee el cuaderno de la sesión; 401 si no hay sesión. |
| PUT | `/api/workspace` | Guarda el cuaderno completo de la sesión; máximo 5 MiB. |

Better Auth gestiona sus rutas bajo `/api/auth/*`, el hash de contraseñas y las cookies de sesión HttpOnly. Contraseñas entre 12 y 128 caracteres; sesiones de siete días. `/api/me` no admite elegir usuario mediante parámetros.

**Todas las mutaciones `/api/*` requieren una cabecera `Origin` autorizada**, también si se usa curl. En navegador usar `credentials: 'include'`:

```ts
await fetch('http://127.0.0.1:3000/api/auth/sign-up/email', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', password: 'una-clave-larga-y-unica' }),
})
```

El navegador añade `Origin` automáticamente. Prueba manual desde terminal:

```sh
curl -i -c cookies.txt http://127.0.0.1:3000/api/auth/sign-up/email \
  -H 'Origin: http://127.0.0.1:1420' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Ana","email":"ana@example.com","password":"una-clave-larga-y-unica"}'
curl -b cookies.txt http://127.0.0.1:3000/api/me
```

## Migraciones

`bun run server:migrate` aplica el esquema requerido por la versión instalada de Better Auth, incluida la tabla de límites de peticiones, mediante su migrador oficial. Al ejecutar Bun directamente no se aplica automáticamente al arrancar; Compose sí lo hace mediante el servicio `migrate`, antes del backend. El lockfile fija las versiones; revisar las actualizaciones y realizar copia de seguridad antes de migrar. Ejecutar un único migrador antes de desplegar las réplicas. La migración crea también `user_workspace`, con un cuaderno JSONB por cuenta y borrado en cascada al eliminarla.

## Pruebas

```sh
bun run server:typecheck
bun run server:test
bun run test
bun run build
```

Con Node 26, Vitest 3 puede tomar el `localStorage` experimental de Node en las pruebas jsdom existentes. En ese entorno ejecutar `NODE_OPTIONS=--no-experimental-webstorage bun run test` (Bash), o utilizar Node 22 LTS.

Las pruebas HTTP usan Better Auth real con su adaptador en memoria: registro, acceso, cierre de sesión, separación de perfiles, validación, CORS, orígenes y límites de peticiones.

La suite PostgreSQL **se omite** salvo que se proporcione `TEST_DATABASE_URL`. Usar una base desechable, nunca producción: crea tablas y registros de prueba. Ejemplo Bash:

```sh
docker compose exec db createdb -U ntbk ntbk_test
TEST_DATABASE_URL=postgresql://ntbk:ntbk_dev_only@127.0.0.1:5432/ntbk_test bun run server:test
```

## Antes de publicar

- Configurar envío de correo, verificación de direcciones y recuperación de contraseña. Actualmente se permite registro sin verificación para desarrollo; no hay recuperación funcional.
- Configurar HTTPS, secretos del alojamiento, copias de seguridad y monitorización. No registrar cookies, contraseñas ni tokens.
- La limitación de intentos usa PostgreSQL y la IP del socket de Bun, sobrescribiendo cualquier cabecera del cliente. Detrás de un proxy las peticiones compartirán el límite de la IP del proxy. Adaptar únicamente con una cadena de proxies de confianza que elimine y reescriba las cabeceras, y aplicar límites también en el borde. No confiar directamente en `X-Forwarded-For`.
- Al añadir recursos, derivar siempre `userId` de la sesión y filtrar **cada** consulta por propietario. Tener cuentas no aísla automáticamente futuras tablas.
- La web importa el cuaderno local solo cuando la cuenta aún no tiene uno; para cambiar de usuario, cierra sesión e inicia otra. Las notas locales no se borran. Tauri todavía no admite sesión ni sincronización.
