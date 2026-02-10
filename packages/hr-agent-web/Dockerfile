FROM node:22-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/templates/nginx.conf.template

EXPOSE 80

CMD /bin/sh -c 'export HRA_URL=${HRA_URL:-http://open-hr-agent:3000} && envsubst < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g "daemon off;"'
