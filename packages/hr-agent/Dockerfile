FROM node:22.21.1-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/hr-agent/package.json ./packages/hr-agent/

RUN corepack enable && pnpm install

COPY packages/hr-agent/src ./packages/hr-agent/src
COPY packages/hr-agent/tsconfig.json ./packages/hr-agent/
COPY packages/hr-agent/prisma ./packages/hr-agent/prisma

RUN cd packages/hr-agent && pnpm exec prisma generate && pnpm run build

FROM node:22.21.1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY packages/hr-agent/package.json ./package.json
COPY packages/hr-agent/prisma ./prisma
COPY pnpm-lock.yaml ./

RUN corepack enable && pnpm install --prod --no-frozen-lockfile --ignore-scripts

RUN pnpm add -D prisma@5.22.0 --ignore-scripts && pnpm exec prisma generate

COPY --from=builder /app/packages/hr-agent/dist ./dist
COPY packages/hr-agent/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chown -R nodeuser:nodejs /app && chmod +x docker-entrypoint.sh

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["./docker-entrypoint.sh"]
