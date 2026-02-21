# Base
FROM node:20.10.0-bullseye-slim AS base

ENV PORT 8080

WORKDIR /usr/src/app

COPY package*.json ./


# Production Deps
FROM base AS deps

ENV NODE_ENV production

RUN apt-get update && \
    apt-get install -y node-gyp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN npm ci --fetch-timeout=300000


# Build Dockerfile
FROM base AS builder

RUN apt-get update && \
    apt-get install -y node-gyp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN npm ci --fetch-timeout=300000

COPY . ./
RUN npm run build


# Main Dockerfile
FROM base

ENV NODE_ENV production

EXPOSE 8080

COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=deps --chown=node:node /usr/src/app/node_modules ./node_modules

USER node

CMD ["node", "./dist/main.js"]

