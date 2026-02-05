FROM node:22.21.1-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

RUN pnpm run build

FROM node:22.21.1-alpine

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /app/dist ./dist

RUN chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
