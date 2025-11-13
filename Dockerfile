# Multi-stage build for production-ready VibeLink 0372 PWA
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    && curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine AS production

# Install security updates and necessary packages
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S vibeuser -u 1001

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Create necessary directories
RUN mkdir -p /var/cache/nginx \
    && mkdir -p /var/log/nginx \
    && mkdir -p /var/run/nginx \
    && chown -R vibeuser:nodejs /var/cache/nginx \
    && chown -R vibeuser:nodejs /var/log/nginx \
    && chown -R vibeuser:nodejs /var/run/nginx

# Copy built application from builder stage
COPY --from=builder --chown=vibeuser:nodejs /app/dist /usr/share/nginx/html
COPY --chown=vibeuser:nodejs assets /usr/share/nginx/html/assets

# Create SSL directory (for potential SSL termination)
RUN mkdir -p /etc/nginx/ssl \
    && chown -R vibeuser:nodejs /etc/nginx/ssl

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html \
    && chmod -R 755 /var/cache/nginx \
    && chmod -R 755 /var/log/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80
EXPOSE 443

# Switch to non-root user
USER vibeuser

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Development stage
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    bash \
    && curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000
EXPOSE 9229

# Start development server
CMD ["pnpm", "run", "dev"]

# Testing stage
FROM development AS test

# Install additional test dependencies
RUN pnpm add -D \
    jest \
    @testing-library/jest-dom \
    @testing-library/user-event \
    jest-environment-jsdom

# Copy test files
COPY __tests__ ./__tests__

# Run tests
CMD ["pnpm", "test"]

# Security scan stage
FROM aquasec/trivy:latest AS security-scan

WORKDIR /app

COPY --from=production /usr/share/nginx/html ./

# Run security scan (this would be in CI/CD)
CMD ["--help"]

# Performance optimization stage
FROM node:18-alpine AS optimizer

WORKDIR /app

COPY --from=builder /app ./

# Install optimization tools
RUN npm install -g \
    critters \
    purgecss \
    workbox-build

# Run optimization scripts
COPY optimize.js ./
RUN node optimize.js

# Final production image with optimizations
FROM nginx:alpine AS optimized-production

# Copy optimized build
COPY --from=optimizer --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --from=optimizer --chown=nginx:nginx /app/optimized-assets /usr/share/nginx/html/assets

# Copy nginx config
COPY nginx-optimized.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Environment-specific builds
FROM production AS staging
ENV NODE_ENV=staging
ENV API_URL=https://staging-api.vibelink0372.com
LABEL environment="staging"

FROM production AS production-live
ENV NODE_ENV=production
ENV API_URL=https://api.vibelink0372.com
LABEL environment="production"

# Add metadata
LABEL maintainer="VibeLink 0372 Team <dev@vibelink0372.com>"
LABEL version="1.0.0"
LABEL description="VibeLink 0372® - Complete Social Media PWA Platform"
LABEL vendor="VibeLink Technologies"
LABEL license="Proprietary"

# Build arguments
ARG BUILD_DATE
ARG VERSION
ARG COMMIT_SHA

# Add build metadata as environment variables
ENV APP_BUILD_DATE=${BUILD_DATE}
ENV APP_VERSION=${VERSION}
ENV APP_COMMIT_SHA=${COMMIT_SHA}

# Security scanning result (would be populated by CI/CD)
ENV SECURITY_SCAN_RESULT="pending"

# Add startup script
COPY docker-startup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-startup.sh

ENTRYPOINT ["/usr/local/bin/docker-startup.sh"]