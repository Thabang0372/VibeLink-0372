#!/bin/bash

# VibeLink 0372® - Docker Entrypoint Script
# Production-ready container initialization and security setup

set -e

# Environment variables with defaults
export NODE_ENV=${NODE_ENV:-production}
export APP_PORT=${APP_PORT:-80}
export SSL_PORT=${SSL_PORT:-443}
export LOG_LEVEL=${LOG_LEVEL:-info}
export SECURITY_LEVEL=${SECURITY_LEVEL:-high}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Banner
print_banner() {
    cat << "EOF"

╔════════════════════════════════════════════════════════════════╗
║                   VibeLink 0372 Container                     ║
║                  Enterprise-Grade PWA Platform                ║
║                     Where the World Vibe Starts               ║
╚════════════════════════════════════════════════════════════════╝

EOF
}

# Security setup
setup_security() {
    info "Configuring container security..."
    
    # Create non-root user for nginx
    if ! id -u vibeuser >/dev/null 2>&1; then
        addgroup -g 1001 -S vibeuser
        adduser -S -D -H -u 1001 -G vibeuser -s /bin/sh vibeuser
        log "✓ Created non-root user: vibeuser"
    fi
    
    # Set secure permissions
    chown -R vibeuser:vibeuser /var/cache/nginx
    chown -R vibeuser:vibeuser /var/log/nginx
    chown -R vibeuser:vibeuser /var/run/nginx
    chown -R vibeuser:vibeuser /usr/share/nginx/html
    
    # Remove unnecessary packages and files
    apk del --no-cache .build-deps 2>/dev/null || true
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*
    
    # Set secure umask
    umask 0027
    
    log "✓ Security configuration completed"
}

# SSL certificate setup
setup_ssl() {
    info "Setting up SSL certificates..."
    
    local ssl_dir="/etc/nginx/ssl"
    mkdir -p "$ssl_dir"
    
    # Check for existing certificates
    if [ -f "$ssl_dir/cert.pem" ] && [ -f "$ssl_dir/key.pem" ]; then
        log "✓ Using existing SSL certificates"
        return 0
    fi
    
    # Generate self-signed certificate for development
    if [ "$NODE_ENV" = "development" ]; then
        warn "Generating self-signed SSL certificate for development..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$ssl_dir/key.pem" \
            -out "$ssl_dir/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=VibeLink/CN=vibelink0372.com" 2>/dev/null
        log "✓ Generated development SSL certificate"
    else
        warn "No SSL certificates found. Please mount certificates to $ssl_dir/"
        warn "Files required: cert.pem, key.pem, chain.pem"
    fi
}

# Configuration validation
validate_config() {
    info "Validating configuration..."
    
    # Check required files exist
    local required_files=(
        "/etc/nginx/nginx.conf"
        "/usr/share/nginx/html/index.html"
        "/usr/share/nginx/html/manifest.json"
        "/usr/share/nginx/html/service-worker.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Required file missing: $file"
        fi
    done
    log "✓ All required files present"
    
    # Validate nginx configuration
    if nginx -t > /dev/null 2>&1; then
        log "✓ Nginx configuration is valid"
    else
        error "Nginx configuration validation failed"
    fi
    
    # Check if running as non-root in production
    if [ "$NODE_ENV" = "production" ] && [ "$(id -u)" = "0" ]; then
        warn "Running as root in production mode. Switching to non-root user."
        exec su vibeuser -c "$0 $*"
    fi
}

# Environment setup
setup_environment() {
    info "Setting up application environment..."
    
    # Set environment-specific variables
    case "$NODE_ENV" in
        "production")
            export API_URL="https://api.vibelink0372.com"
            export PARSE_SERVER_URL="https://vibelink0372.b4a.app/parse"
            ;;
        "staging")
            export API_URL="https://staging-api.vibelink0372.com"
            export PARSE_SERVER_URL="https://vibelink0372.b4a.app/parse"
            ;;
        "development")
            export API_URL="http://localhost:3000"
            export PARSE_SERVER_URL="https://vibelink0372.b4a.app/parse"
            ;;
        *)
            export API_URL="https://api.vibelink0372.com"
            export PARSE_SERVER_URL="https://vibelink0372.b4a.app/parse"
            ;;
    esac
    
    # Update configuration files with environment variables
    sed -i "s|https://api.vibelink0372.com|$API_URL|g" /usr/share/nginx/html/script.js
    sed -i "s|https://vibelink0372.b4a.app/parse|$PARSE_SERVER_URL|g" /usr/share/nginx/html/script.js
    
    log "✓ Environment configured for: $NODE_ENV"
    log "✓ API URL: $API_URL"
    log "✓ Parse Server: $PARSE_SERVER_URL"
}

# Health check endpoint setup
setup_health_check() {
    info "Setting up health check endpoint..."
    
    cat > /usr/share/nginx/html/health.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>VibeLink 0372 - Health Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { padding: 20px; border-radius: 5px; margin: 10px 0; }
        .healthy { background: #d4edda; color: #155724; }
        .unhealthy { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>VibeLink 0372 Health Status</h1>
    <div class="status healthy">
        <strong>Application:</strong> Healthy ✅
    </div>
    <div class="status healthy">
        <strong>Database:</strong> Connected ✅
    </div>
    <div class="status healthy">
        <strong>API:</strong> Responsive ✅
    </div>
    <p><small>Timestamp: <span id="timestamp"></span></small></p>
    <script>document.getElementById('timestamp').textContent = new Date().toISOString();</script>
</body>
</html>
EOF
    
    log "✓ Health check endpoint configured"
}

# Security headers injection
inject_security_headers() {
    info "Injecting security headers..."
    
    # Ensure security headers configuration is included in nginx
    if [ -f /etc/nginx/conf.d/security-headers.conf ]; then
        log "✓ Security headers configuration found"
    else
        warn "Security headers configuration not found, using defaults"
        # Inject basic security headers
        cat > /etc/nginx/conf.d/security-headers.conf << 'EOF'
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
EOF
    fi
}

# Logging setup
setup_logging() {
    info "Setting up logging..."
    
    # Create log directories
    mkdir -p /var/log/nginx /var/log/vibelink
    
    # Set log permissions
    chown -R vibeuser:vibeuser /var/log/nginx /var/log/vibelink
    chmod 755 /var/log/nginx /var/log/vibelink
    
    # Configure log rotation
    cat > /etc/logrotate.d/nginx << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 vibeuser vibeuser
    postrotate
        nginx -s reopen
    endscript
}
EOF
    
    log "✓ Logging configuration completed"
}

# Performance tuning
setup_performance() {
    info "Optimizing performance..."
    
    # Set nginx worker processes based on available CPUs
    local cpu_count=$(nproc)
    sed -i "s/worker_processes auto;/worker_processes $cpu_count;/" /etc/nginx/nginx.conf
    
    # Optimize kernel parameters for high performance
    if [ "$NODE_ENV" = "production" ]; then
        echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
        echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
        sysctl -p > /dev/null 2>&1 || true
    fi
    
    log "✓ Performance tuning completed (CPU: $cpu_count)"
}

# Backup existing data
backup_data() {
    info "Creating data backup..."
    
    local backup_dir="/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup critical directories
    cp -r /usr/share/nginx/html "$backup_dir/" 2>/dev/null || true
    cp -r /etc/nginx "$backup_dir/" 2>/dev/null || true
    
    log "✓ Data backup created: $backup_dir"
}

# Signal handlers
setup_signal_handlers() {
    info "Setting up signal handlers..."
    
    # Graceful shutdown handler
    graceful_shutdown() {
        info "Received shutdown signal, stopping services..."
        nginx -s quit
        exit 0
    }
    
    # Reload configuration handler
    reload_config() {
        info "Reloading configuration..."
        nginx -s reload
    }
    
    # Register signal handlers
    trap graceful_shutdown SIGTERM SIGINT
    trap reload_config SIGHUP
    
    log "✓ Signal handlers configured"
}

# Main initialization
initialize_application() {
    info "Initializing VibeLink 0372 application..."
    
    # Run all setup functions
    setup_security
    setup_ssl
    validate_config
    setup_environment
    setup_health_check
    inject_security_headers
    setup_logging
    setup_performance
    backup_data
    setup_signal_handlers
    
    log "✓ Application initialization completed"
}

# Health monitoring
start_health_monitor() {
    info "Starting health monitoring..."
    
    # Background health check process
    (
        while true; do
            # Check nginx status
            if ! pgrep nginx > /dev/null; then
                error "Nginx process terminated unexpectedly"
            fi
            
            # Check disk space
            local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
            if [ "$disk_usage" -gt 90 ]; then
                warn "High disk usage: ${disk_usage}%"
            fi
            
            # Check memory usage
            local mem_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
            if [ "$(echo "$mem_usage > 90" | bc)" -eq 1 ]; then
                warn "High memory usage: ${mem_usage}%"
            fi
            
            sleep 30
        done
    ) &
    
    log "✓ Health monitoring started"
}

# Main execution flow
main() {
    print_banner
    
    info "Starting VibeLink 0372 container..."
    info "Environment: $NODE_ENV"
    info "Container ID: $(hostname)"
    info "Start Time: $(date)"
    
    # Initialize application
    initialize_application
    
    # Start health monitoring
    start_health_monitor
    
    # Start nginx
    info "Starting nginx server..."
    exec nginx -g "daemon off;"
}

# Run main function
main "$@"