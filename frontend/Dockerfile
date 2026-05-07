# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_FRAPPE_BACKEND=https://rcistoc.cronbi.com
ARG VITE_FRAPPE_SOCKETIO=https://rcistoc.cronbi.com
ARG VITE_STOREFRONT_URL=/
ENV VITE_FRAPPE_BACKEND=$VITE_FRAPPE_BACKEND
ENV VITE_FRAPPE_SOCKETIO=$VITE_FRAPPE_SOCKETIO
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
RUN npm run build

# ---- Serve Stage ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/panel
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Runtime backend hedefi: nginx:alpine'in entrypoint'i /etc/nginx/templates/*.template
# dosyalarını envsubst ile işleyip /etc/nginx/conf.d/ altına yazıyor. Default RC;
# BETA/PROD için compose'da override.
ENV BACKEND_DOMAIN=rcistoc.cronbi.com
ENV FRONTEND_DOMAIN=rc.istoc.com
# nginx kendi değişkenlerine ($remote_addr vb.) dokunulmasın diye whitelist.
ENV NGINX_ENVSUBST_FILTER="^(BACKEND_DOMAIN|FRONTEND_DOMAIN)$"

EXPOSE 80
