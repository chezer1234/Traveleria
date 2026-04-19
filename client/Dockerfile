# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

FROM base AS builder
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_APP_SCHEMA_VERSION=dev
ARG VITE_API_URL
ENV VITE_APP_SCHEMA_VERSION=${VITE_APP_SCHEMA_VERSION}
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
