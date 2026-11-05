FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@12.16.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json tsconfig.base.json ./
COPY apps/desktop/package.json apps/desktop/package.json
COPY apps/server apps/server
COPY apps/web apps/web
COPY packages packages
RUN pnpm install --frozen-lockfile

ARG SERVER_HOST
ARG SERVER_PORT
ARG WEB_HOST
ARG WEB_PORT
RUN pnpm build:web --env-mode=loose

FROM node:24.22.1-bookworm-slim AS server
WORKDIR /app
COPY --from=build /app /app
COPY deploy/script/validate-storage.mjs deploy/script/validate-storage.mjs
ENTRYPOINT ["node", "--import", "./deploy/script/validate-storage.mjs"]
CMD ["apps/server/dist/index.js"]

FROM caddy:2.11.7-alpine AS web
COPY --from=build /app/apps/web/dist /srv
