# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
RUN mkdir -p /app/data
ENV PORT=3001
EXPOSE 3001
CMD ["node", "--watch", "src/index.js"]

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-alpine AS prod
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data
ARG APP_SCHEMA_VERSION=dev
ENV APP_SCHEMA_VERSION=${APP_SCHEMA_VERSION}
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "src/index.js"]
