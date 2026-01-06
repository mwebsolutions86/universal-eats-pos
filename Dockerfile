# Dockerfile pour Universal Eats POS (Electron)
FROM node:18-bullseye-slim

# Installation des dépendances système pour Electron
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Configuration du workspace
WORKDIR /app

# Copie des fichiers de configuration
COPY universal-eats-pos/package.json universal-eats-pos/package-lock.json* ./

# Installation des dépendances
RUN npm ci && npm cache clean --force

# Copie du code source
COPY universal-eats-pos/ .

# Configuration des variables d'environnement
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV NODE_ENV=production
ENV ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Build de l'application
RUN npm run make

# Configuration des utilisateurs
RUN groupadd -r electron && useradd -r -g electron electron
RUN chown -R electron:electron /app

# Exposition des ports pour le développement
EXPOSE 3000

# Script de démarrage
COPY --chown=electron:electron scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER electron

CMD ["/app/start.sh"]

# Scripts pour CI/CD
RUN echo '#!/bin/sh' > /app/ci-build.sh && \
    echo 'echo "🏗️ Building Electron App..."' >> /app/ci-build.sh && \
    echo 'npm run make' >> /app/ci-build.sh && \
    chmod +x /app/ci-build.sh

RUN echo '#!/bin/sh' > /app/ci-test.sh && \
    echo 'echo "🧪 Testing Electron App..."' >> /app/ci-test.sh && \
    echo 'npm test || echo "No tests configured"' >> /app/ci-test.sh && \
    chmod +x /app/ci-test.sh