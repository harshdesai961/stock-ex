# Production-like image for one app of the monorepo, used by `docker compose --profile full up --build`.
# APP = web | server | ai-worker. M7 will slim this down (pruned deps, standalone Next output).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS build
ARG APP
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH TURBO_TELEMETRY_DISABLED=1 NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# next.config.ts validates env at build time; .env is excluded from the image, so the
# build receives throwaway CI values. Real values arrive at runtime from compose.
RUN cp .github/ci.env .env && pnpm turbo run build --filter=@stock-ex/${APP}... && rm .env

FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP
ENV NODE_ENV=production APP=${APP} PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY --from=build --chown=node:node /repo /repo
USER node
CMD ["sh", "-c", "pnpm --filter @stock-ex/${APP} start"]
