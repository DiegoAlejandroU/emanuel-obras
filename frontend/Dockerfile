# Imagen del frontend: build estático de Vite servido por nginx.
#
# VITE_API_URL se fija al construir (Vite la incrusta en el JS):
#   - vacío (por defecto): el frontend llama a "/api/..." en el mismo origen,
#     como en docker-compose.prod.yml, donde Caddy enruta /api al backend.
#   - http://localhost:8000: lo que usa docker-compose.yml para correr todo
#     el sistema en local.

# ---- Etapa 1: compilar ----
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# npm ci instala exactamente lo del package-lock.json (build reproducible);
# copiarlo antes que el código deja esta capa en cache entre builds.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Etapa 2: servir ----
# La imagen final solo lleva nginx y los archivos compilados: sin Node, sin
# node_modules y sin el código fuente.
FROM nginx:1.27-alpine

ARG APP_VERSION=local
LABEL org.opencontainers.image.title="emanuel-obras-frontend" \
      org.opencontainers.image.version="${APP_VERSION}"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
