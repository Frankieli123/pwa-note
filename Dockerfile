FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Use a China-friendly npm registry for installing pnpm itself.
RUN npm config set registry https://registry.npmmirror.com/ \
  && npm i -g pnpm@9

FROM base AS deps
WORKDIR /app
ENV PNPM_CONFIG_PRODUCTION=false
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm i --frozen-lockfile --prod=false

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
