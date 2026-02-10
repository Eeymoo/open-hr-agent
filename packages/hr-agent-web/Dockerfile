FROM node:22-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/hr-agent-web/package.json ./packages/hr-agent-web/
RUN npm install -g pnpm@9.15.1
RUN pnpm install

COPY packages/hr-agent-web ./packages/hr-agent-web
RUN cd packages/hr-agent-web && pnpm run build

FROM nginx:alpine

COPY --from=builder /app/packages/hr-agent-web/dist /usr/share/nginx/html

COPY --from=builder /app/packages/hr-agent-web/nginx.conf /etc/nginx/templates/nginx.conf.template

EXPOSE 80

CMD /bin/sh -c 'export HRA_URL=${HRA_URL:-http://open-hr-agent:3000} && sed "s|\${HRA_URL}|$HRA_URL|g" /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g "daemon off;"'
