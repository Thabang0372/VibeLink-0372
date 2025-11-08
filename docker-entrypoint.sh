#!/bin/sh
set -e

echo "🔒 VibeLink 0372® - Security Initialization"

# Security checks
if [ -z "$NODE_ENV" ]; then
    echo "❌ NODE_ENV not set"
    exit 1
fi

if [ "$NODE_ENV" = "production" ]; then
    echo "🚀 Production Mode - Maximum Security Enabled"
    
    # Validate SSL certificates
    if [ ! -f /etc/nginx/ssl/nginx.crt ] || [ ! -f /etc/nginx/ssl/nginx.key ]; then
        echo "❌ SSL certificates missing"
        exit 1
    fi
    
    # Check file permissions
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;
    find /usr/share/nginx/html -type d -exec chmod 755 {} \;
    chmod 600 /etc/nginx/ssl/nginx.key
    
    # Run security scan
    /usr/local/bin/security-scan.sh
fi

# Substitute environment variables in nginx config
envsubst '${SERVER_NAME} ${API_ENDPOINT} ${CDN_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✅ Security checks passed"
echo "🌐 Starting VibeLink 0372® Server..."

exec "$@"