FROM node:22.21.1-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/coding-agent/package.json ./packages/coding-agent/

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/coding-agent/src ./packages/coding-agent/src

CMD ["node", "packages/coding-agent/src/index.js"]
