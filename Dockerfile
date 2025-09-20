# Build stage
FROM node:18-alpine as build-stage

# Set security-related environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_PRODUCTION=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Install security updates and create non-root user
RUN apk update && apk upgrade --no-cache && \
    addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with security checks
RUN npm ci --only=production --no-optional --ignore-scripts && \
    npm audit --omit=dev --audit-level=moderate || true

# Copy source code with proper ownership
COPY --chown=appuser:appgroup . .

# Build the app
RUN npm run build && \
    # Remove development files and reduce image size
    npm prune --production && \
    rm -rf /root/.npm /tmp/*

# Switch to non-root user for security
USER appuser

# Production stage
FROM nginx:stable-alpine as production-stage

# Install security updates
RUN apk update && apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create app directory and set proper permissions
RUN mkdir -p /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Copy built app from build stage
COPY --from=build-stage --chown=nginx:nginx /app /usr/share/nginx/html

# Create health check endpoint
RUN echo '{"status": "OK", "service": "VibeLink 0372"}' > /usr/share/nginx/html/health.json

# Switch to nginx user for security
USER nginx

# Expose port 80 (HTTP) and 443 (HTTPS)
EXPOSE 80 443

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health.json || exit 1

# Start nginx with debug logging if needed
CMD ["nginx", "-g", "daemon off;"]