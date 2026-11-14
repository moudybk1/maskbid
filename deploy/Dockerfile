# Web app image for a VPS. Build context is the repo root: docker build -f deploy/Dockerfile .
FROM node:22-slim AS build
WORKDIR /repo
COPY . .
RUN npm ci -w web --include-workspace-root
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm -w web run build

FROM node:22-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 METADATA_DIR=/data/metadata
WORKDIR /app/apps/web
COPY --from=build /repo/apps/web/.next/standalone /app
COPY --from=build /repo/apps/web/.next/static ./.next/static
COPY --from=build /repo/apps/web/public ./public
COPY apps/web/metadata-seed /app/seed
# First start fills the volume with the lots that already exist on chain; later starts keep whatever the volume holds.
CMD ["sh", "-c", "mkdir -p $METADATA_DIR && cp -n /app/seed/*.json $METADATA_DIR/ && exec node server.js"]
