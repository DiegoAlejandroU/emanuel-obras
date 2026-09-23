# Imagen de producción del frontend: build estático servido por nginx detrás
# de Caddy. VITE_API_URL se deja vacío a propósito — Caddy sirve frontend y
# backend bajo el mismo origen (mismo dominio, /api/* va al backend), así
# que las llamadas del frontend a "/api/..." ya son del mismo origen y no
# necesitan un host absoluto.
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
