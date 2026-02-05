FROM node:22.21.1-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/hr-agent/package.json ./packages/hr-agent/

RUN corepack enable && pnpm install

COPY packages/hr-agent/src ./packages/hr-agent/src
COPY packages/hr-agent/tsconfig.json ./packages/hr-agent/

RUN cd packages/hr-agent && pnpm run build

FROM node:22.21.1-alpine

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/hr-agent/node_modules ./node_modules
COPY --from=builder /app/packages/hr-agent/dist ./dist

RUN chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
