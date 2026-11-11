# syntax=docker/dockerfile:1
FROM oven/bun:1.3.13 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY server/package.json ./server/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS backend
COPY server/src ./server/src
COPY server/docker ./server/docker
RUN mkdir -p /var/lib/ntbk && chown bun:bun /var/lib/ntbk && chmod 700 /var/lib/ntbk
USER bun
EXPOSE 3000
ENTRYPOINT ["bun", "server/docker/entrypoint.ts"]
CMD ["start"]

FROM dependencies AS frontend-build
COPY index.html vite.config.ts tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN bun --bun run build

FROM nginx:1.28-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
EXPOSE 80
