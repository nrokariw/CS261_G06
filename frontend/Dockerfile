FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_PUBLIC_WEB_URL
ARG VITE_API_BASE_PATH=/api
ARG VITE_TU_API_BASE_URL
ARG VITE_API_AUTH_PATH=/api/auth
ARG VITE_API_ITEMS_PATH=/api/items
ARG VITE_API_REQUESTS_PATH=/api/requests
ARG VITE_API_USERS_PATH=/api/users
ARG VITE_API_TRANSACTIONS_PATH=/api/transactions
ARG VITE_API_EVIDENCE_PATH=/api/evidence

RUN npm run build

FROM nginx:alpine

# Restrict nginx envsubst to our custom variable prefixes so internal nginx $variables remain untouched
ENV NGINX_ENVSUBST_FILTER="^(API_|BACKEND_|PUBLIC_|TU_)"
ENV API_BASE_PATH=/api
ENV BACKEND_UPSTREAM=http://backend:8080

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Generate /config.json at container startup so frontend can read central .env routes at runtime without rebuilds
RUN printf '#!/bin/sh\ncat <<EOF > /usr/share/nginx/html/config.json\n{\n  "publicWebUrl": "${PUBLIC_WEB_URL}",\n  "tuApiBaseUrl": "${TU_API_BASE_URL}",\n  "api": {\n    "base": "${API_BASE_PATH}",\n    "auth": "${API_AUTH_PATH}",\n    "items": "${API_ITEMS_PATH}",\n    "requests": "${API_REQUESTS_PATH}",\n    "users": "${API_USERS_PATH}",\n    "transactions": "${API_TRANSACTIONS_PATH}",\n    "evidence": "${API_EVIDENCE_PATH}"\n  }\n}\nEOF\n' > /docker-entrypoint.d/30-runtime-config.sh && chmod +x /docker-entrypoint.d/30-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
