FROM node:22.21.1-alpine

WORKDIR /app

COPY package.json ./
COPY ../../pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY src ./src

CMD ["node", "src/index.js"]
