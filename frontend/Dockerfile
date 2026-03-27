# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_FRAPPE_BACKEND=https://rcistoc.cronbi.com
ARG VITE_FRAPPE_SOCKETIO=https://rcistoc.cronbi.com
ARG VITE_STOREFRONT_URL=https://rc.istoc.com
ENV VITE_FRAPPE_BACKEND=$VITE_FRAPPE_BACKEND
ENV VITE_FRAPPE_SOCKETIO=$VITE_FRAPPE_SOCKETIO
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
RUN npm run build

# ---- Serve Stage ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/panel
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
