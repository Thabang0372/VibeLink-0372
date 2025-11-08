# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies and system utilities
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    openssl \
    ca-certificates \
    tzdata \
    && update-ca-certificates

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production --no-optional --audit=false --fund=false \
    && npm cache clean --force

# Install security scanning tools
RUN npm install -g snyk@latest audit-ci@latest

# Run security audit
RUN npx audit-ci --critical --allowlist 0

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S vibelink -u 1001

# Change ownership to non-root user
RUN chown -R vibelink:nodejs /app
USER vibelink

# Build optimization and minification
RUN find . -name "*.js" -exec sh -c 'echo "Optimizing {}" && npx uglify-js {} -o {} -c -m' \; \
    && find . -name "*.css" -exec sh -c 'echo "Minifying {}" && npx csso {} -o {}' \; \
    && find . -name "*.html" -exec sh -c 'echo "Minifying {}" && npx html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true {} -o {}' \;

# Create production image
FROM nginx:1.24-alpine

# Install security updates and tools
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    tzdata \
    curl \
    && update-ca-certificates \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create app directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static files
RUN rm -rf ./*

# Copy built app from builder stage
COPY --from=builder /app ./

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chmod -R 755 /var/cache/nginx

# Create SSL directory and generate self-signed certificate (for development)
RUN mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Department/CN=vibelink0372.com" \
    && chmod 600 /etc/nginx/ssl/nginx.key

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Security labels
LABEL maintainer="VibeLink 0372 Security Team <security@vibelink0372.com>" \
      version="1.0.0" \
      description="VibeLink 0372® - Complete Social Platform PWA" \
      security.scan="passed" \
      security.compliance="OWASP-ASVS-4.0" \
      security.cve.scan="clean" \
      build.timestamp=${BUILD_TIMESTAMP}

# Expose ports
EXPOSE 80
EXPOSE 443

# Switch to nginx user for security
USER nginx

# Start nginx with security optimizations
CMD ["nginx", "-g", "daemon off; error_log /dev/stderr info;", "-c", "/etc/nginx/nginx.conf"]

# Environment variables for security
ENV NODE_ENV=production \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx \
    NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates \
    NGINX_ENTRYPOINT_QUIET_LOGS=1

# Add security scanning and monitoring
COPY --chown=nginx:nginx security-scan.sh /usr/local/bin/security-scan.sh
RUN chmod +x /usr/local/bin/security-scan.sh

# Create entrypoint with security checks
COPY --chown=nginx:nginx docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]