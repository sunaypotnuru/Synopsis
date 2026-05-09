# syntax=docker/dockerfile:1
# ─────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────
FROM node:20-slim AS build

# Declare all build-time args BEFORE any COPY/RUN (fixes ARG-after-COPY warning)
ARG VITE_API_URL=""
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_LIVEKIT_URL=""
ARG VITE_BYPASS_AUTH="false"
ARG VITE_GOOGLE_MAPS_API_KEY=""

# Set as environment vars so Vite picks them up during build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL \
    VITE_BYPASS_AUTH=$VITE_BYPASS_AUTH \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

WORKDIR /app

# Install deps first (cache layer) — then copy source
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production (nginx)
# ─────────────────────────────────────────
FROM nginx:stable-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Install curl for health checks
RUN apk add --no-cache curl

# SPA-friendly nginx config (try_files fallback so React Router works)
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
        add_header Cache-Control "no-store, no-cache, must-revalidate";\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {\n\
        expires 30d;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check so Docker knows when nginx is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
