FROM node:22.21.1-alpine

WORKDIR /app

COPY packages/coding-agent/package.json ./
COPY pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/coding-agent/src ./src

CMD ["node", "src/index.js"]
