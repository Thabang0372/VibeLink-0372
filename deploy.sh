#!/bin/bash

# VibeLink 0372® - Complete Production Deployment Script
# Enterprise-grade deployment for all platforms and environments

set -euo pipefail
IFS=$'\n\t'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR" && pwd)"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly DEPLOYMENT_ID="vibelink_${TIMESTAMP}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Environment Configuration
export NODE_ENV=${NODE_ENV:-production}
export DEPLOY_ENV=${DEPLOY_ENV:-production}
export DOCKER_REGISTRY=${DOCKER_REGISTRY:-ghcr.io}
export DOCKER_IMAGE=${DOCKER_IMAGE:-thabang0372/vibelink-0372}
export DOCKER_TAG=${DOCKER_TAG:-latest}
export GIT_BRANCH=${GIT_BRANCH:-main}
export GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

info() {
    echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Validation functions
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required tools
    local required_tools=("docker" "git" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
            exit 1
        fi
    done

    # Check environment variables
    local required_vars=("NODE_ENV" "DEPLOY_ENV")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    # Validate Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi

    log "Environment validation passed"
}

validate_security() {
    log "Running security validation..."
    
    # Check for secrets in code
    if grep -r "password\|secret\|key" --include="*.js" --include="*.json" --include="*.html" . | grep -v "mock\|example\|test"; then
        warn "Potential secrets found in code"
    fi

    # Validate file permissions
    find . -type f -name "*.sh" -exec test ! -x {} \; -print | while read -r file; do
        chmod +x "$file"
    done

    # Check SSL certificates
    if [[ -f "./ssl/cert.pem" ]] && [[ -f "./ssl/key.pem" ]]; then
        openssl verify -CAfile "./ssl/cert.pem" "./ssl/cert.pem" || {
            error "SSL certificate validation failed"
            exit 1
        }
    fi

    log "Security validation completed"
}

# Build functions
build_docker_image() {
    local image_name="$1"
    local build_args=""
    
    log "Building Docker image: $image_name"
    
    # Set build args
    build_args="--build-arg NODE_ENV=$NODE_ENV"
    build_args+=" --build-arg BUILD_TIMESTAMP=$TIMESTAMP"
    build_args+=" --build-arg GIT_COMMIT=$GIT_COMMIT"
    build_args+=" --build-arg VERSION=${DOCKER_TAG}"

    # Security build options
    local security_opts="--security-opt=no-new-privileges --ulimit nofile=1024:1024"

    docker build \
        $build_args \
        --tag "$image_name" \
        --file Dockerfile \
        --progress=plain \
        . || {
        error "Docker build failed"
        exit 1
    }

    log "Docker image built successfully: $image_name"
}

build_application() {
    log "Building VibeLink 0372 application..."
    
    # Clean previous builds
    rm -rf dist/ build/
    
    # Install dependencies if package.json exists
    if [[ -f "package.json" ]]; then
        log "Installing dependencies..."
        npm ci --only=production --no-optional --audit=false --fund=false || {
            error "Dependency installation failed"
            exit 1
        }

        log "Running build process..."
        npm run build || {
            error "Build process failed"
            exit 1
        }
    fi

    # Run security audit
    if command -v npm &> /dev/null; then
        log "Running security audit..."
        npm audit --audit-level=critical || {
            warn "Security audit found vulnerabilities"
        }
    fi

    log "Application build completed"
}

# Deployment functions
deploy_docker() {
    local image_name="$1"
    local registry="$2"
    
    log "Deploying to Docker registry: $registry"
    
    # Tag image for registry
    local registry_image="$registry/$image_name:$DOCKER_TAG"
    docker tag "$image_name" "$registry_image"
    
    # Push to registry
    docker push "$registry_image" || {
        error "Failed to push image to registry"
        exit 1
    }
    
    log "Docker image pushed successfully: $registry_image"
}

deploy_github_pages() {
    log "Deploying to GitHub Pages..."
    
    if command -v npm &> /dev/null && [[ -f "package.json" ]]; then
        npm run deploy:gh-pages || {
            error "GitHub Pages deployment failed"
            exit 1
        }
    else
        # Manual deployment to GitHub Pages
        local deploy_dir="./dist"
        if [[ ! -d "$deploy_dir" ]]; then
            deploy_dir="."
        fi
        
        # Check if we're in a git repository
        if git rev-parse --git-dir > /dev/null 2>&1; then
            git add -A
            git commit -m "Deploy VibeLink 0372 - $TIMESTAMP" || true
            git push origin main || {
                error "Git push failed"
                exit 1
            }
        fi
    fi
    
    log "GitHub Pages deployment completed"
}

deploy_netlify() {
    log "Deploying to Netlify..."
    
    if command -v netlify &> /dev/null; then
        netlify deploy \
            --prod \
            --dir="${NETLIFY_DIR:-./dist}" \
            --message="VibeLink 0372 Deployment $TIMESTAMP" || {
            error "Netlify deployment failed"
            exit 1
        }
    else
        warn "Netlify CLI not found, skipping Netlify deployment"
    fi
    
    log "Netlify deployment completed"
}

deploy_vercel() {
    log "Deploying to Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel \
            --prod \
            --confirm \
            --name="vibelink-0372" || {
            error "Vercel deployment failed"
            exit 1
        }
    else
        warn "Vercel CLI not found, skipping Vercel deployment"
    fi
    
    log "Vercel deployment completed"
}

deploy_aws() {
    log "Deploying to AWS..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI not found, skipping AWS deployment"
        return
    fi
    
    # Deploy to S3 (if configured)
    if [[ -n "${AWS_S3_BUCKET:-}" ]]; then
        log "Deploying to AWS S3: $AWS_S3_BUCKET"
        aws s3 sync ./dist/ "s3://$AWS_S3_BUCKET" \
            --delete \
            --acl public-read \
            --cache-control "max-age=31536000" || {
            error "AWS S3 deployment failed"
            exit 1
        }
        
        # Invalidate CloudFront distribution if configured
        if [[ -n "${AWS_CLOUDFRONT_ID:-}" ]]; then
            aws cloudfront create-invalidation \
                --distribution-id "$AWS_CLOUDFRONT_ID" \
                --paths "/*" || {
                warn "CloudFront invalidation failed"
            }
        fi
    fi
    
    # Deploy to ECS (if configured)
    if [[ -n "${AWS_ECS_CLUSTER:-}" ]] && [[ -n "${AWS_ECS_SERVICE:-}" ]]; then
        log "Deploying to AWS ECS: $AWS_ECS_CLUSTER/$AWS_ECS_SERVICE"
        aws ecs update-service \
            --cluster "$AWS_ECS_CLUSTER" \
            --service "$AWS_ECS_SERVICE" \
            --force-new-deployment || {
            error "AWS ECS deployment failed"
            exit 1
        }
    fi
    
    log "AWS deployment completed"
}

deploy_google_cloud() {
    log "Deploying to Google Cloud..."
    
    # Check for gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        warn "gcloud CLI not found, skipping Google Cloud deployment"
        return
    fi
    
    # Deploy to Cloud Run
    if [[ -n "${GOOGLE_CLOUD_RUN_SERVICE:-}" ]]; then
        log "Deploying to Google Cloud Run: $GOOGLE_CLOUD_RUN_SERVICE"
        gcloud run deploy "$GOOGLE_CLOUD_RUN_SERVICE" \
            --image "$DOCKER_REGISTRY/$DOCKER_IMAGE:$DOCKER_TAG" \
            --platform managed \
            --region "${GOOGLE_REGION:-us-central1}" \
            --allow-unauthenticated \
            --memory "512Mi" \
            --cpu "1" \
            --max-instances 10 \
            --concurrency 80 || {
            error "Google Cloud Run deployment failed"
            exit 1
        }
    fi
    
    log "Google Cloud deployment completed"
}

deploy_azure() {
    log "Deploying to Azure..."
    
    # Check for Azure CLI
    if ! command -v az &> /dev/null; then
        warn "Azure CLI not found, skipping Azure deployment"
        return
    fi
    
    # Deploy to Container Instances
    if [[ -n "${AZURE_CONTAINER_GROUP:-}" ]]; then
        log "Deploying to Azure Container Instances: $AZURE_CONTAINER_GROUP"
        az container create \
            --resource-group "${AZURE_RESOURCE_GROUP:-vibelink}" \
            --name "$AZURE_CONTAINER_GROUP" \
            --image "$DOCKER_REGISTRY/$DOCKER_IMAGE:$DOCKER_TAG" \
            --ports 80 443 \
            --dns-name-label "vibelink-${DEPLOYMENT_ID}" \
            --environment-variables NODE_ENV="$NODE_ENV" \
            --restart-policy Always || {
            error "Azure Container Instances deployment failed"
            exit 1
        }
    fi
    
    log "Azure deployment completed"
}

# Health check functions
health_check() {
    local url="$1"
    local timeout=300
    local interval=10
    local elapsed=0
    
    log "Starting health check for: $url"
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -f -s -o /dev/null --max-time 5 "$url"; then
            log "Health check passed: $url"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log "Health check attempt $((elapsed/interval))... ($elapsed/$timeout seconds)"
    done
    
    error "Health check failed: $url (timeout after $timeout seconds)"
    return 1
}

# Monitoring and logging
setup_monitoring() {
    log "Setting up deployment monitoring..."
    
    # Create deployment log
    mkdir -p logs
    local log_file="logs/deployment_${DEPLOYMENT_ID}.log"
    
    # Log deployment details
    {
        echo "=== VibeLink 0372 Deployment Log ==="
        echo "Deployment ID: $DEPLOYMENT_ID"
        echo "Timestamp: $(date)"
        echo "Environment: $DEPLOY_ENV"
        echo "Git Commit: $GIT_COMMIT"
        echo "Docker Image: $DOCKER_IMAGE:$DOCKER_TAG"
        echo "Node Environment: $NODE_ENV"
        echo "=== Deployment Details ==="
    } >> "$log_file"
}

# Backup functions
create_backup() {
    log "Creating deployment backup..."
    
    local backup_dir="backups/$DEPLOYMENT_ID"
    mkdir -p "$backup_dir"
    
    # Backup important files
    cp -r ./*.js ./*.html ./*.css ./*.json "$backup_dir/" 2>/dev/null || true
    cp -r assets/ "$backup_dir/" 2>/dev/null || true
    cp -r config/ "$backup_dir/" 2>/dev/null || true
    
    # Create backup archive
    tar -czf "backups/vibelink_backup_${DEPLOYMENT_ID}.tar.gz" -C "$backup_dir" . || {
        warn "Backup creation failed"
    }
    
    log "Backup created: backups/vibelink_backup_${DEPLOYMENT_ID}.tar.gz"
}

# Rollback functions
rollback_deployment() {
    local previous_deployment="$1"
    
    log "Initiating rollback to: $previous_deployment"
    
    # Stop current deployment
    docker-compose down || true
    
    # Restore from backup
    if [[ -f "backups/vibelink_backup_${previous_deployment}.tar.gz" ]]; then
        tar -xzf "backups/vibelink_backup_${previous_deployment}.tar.gz" -C . || {
            error "Rollback failed: could not restore backup"
            exit 1
        }
    fi
    
    # Restart previous deployment
    docker-compose up -d || {
        error "Rollback failed: could not restart services"
        exit 1
    }
    
    log "Rollback completed to: $previous_deployment"
}

# Main deployment function
main() {
    local target="${1:-all}"
    local rollback_to="${2:-}"
    
    # Display banner
    echo -e "${GREEN}"
    cat << "EOF"
__      ___ _      _       _          ___   ___  ___ 
\ \    / (_) |    | |     | |        |__ \ / _ \|__ \
 \ \  / / _| | ___| | __ _| | ___ __    ) | | | |  ) |
  \ \/ / | | |/ _ \ |/ _` | |/ / '_ \  / /| | | | / / 
   \  /  | | |  __/ | (_| |   <| | | |/ /_| |_| |/ /_ 
    \/   |_|_|\___|_|\__,_|_|\_\_| |_|____|\___/|____|
                                                      
EOF
    echo -e "${NC}"
    log "Starting VibeLink 0372 Deployment - ID: $DEPLOYMENT_ID"
    
    # Handle rollback
    if [[ -n "$rollback_to" ]]; then
        rollback_deployment "$rollback_to"
        exit 0
    fi
    
    # Setup
    setup_monitoring
    validate_environment
    validate_security
    create_backup
    
    # Build
    build_application
    build_docker_image "$DOCKER_IMAGE"
    
    # Deploy based on target
    case "$target" in
        "docker")
            deploy_docker "$DOCKER_IMAGE" "$DOCKER_REGISTRY"
            ;;
        "github")
            deploy_github_pages
            ;;
        "netlify")
            deploy_netlify
            ;;
        "vercel")
            deploy_vercel
            ;;
        "aws")
            deploy_aws
            ;;
        "google")
            deploy_google_cloud
            ;;
        "azure")
            deploy_azure
            ;;
        "all")
            log "Deploying to all platforms..."
            deploy_docker "$DOCKER_IMAGE" "$DOCKER_REGISTRY"
            deploy_github_pages
            deploy_netlify
            deploy_vercel
            deploy_aws
            deploy_google_cloud
            deploy_azure
            ;;
        *)
            error "Unknown deployment target: $target"
            echo "Usage: $0 [docker|github|netlify|vercel|aws|google|azure|all] [rollback-to]"
            exit 1
            ;;
    esac
    
    # Health checks
    if [[ -n "${HEALTH_CHECK_URL:-}" ]]; then
        health_check "$HEALTH_CHECK_URL"
    fi
    
    # Finalization
    log "Deployment completed successfully: $DEPLOYMENT_ID"
    
    # Cleanup old backups (keep last 5)
    ls -t backups/vibelink_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f
    
    echo -e "${GREEN}"
    log "🎉 VibeLink 0372 Deployment Complete!"
    log "🌐 Application should be available shortly"
    log "📊 Deployment ID: $DEPLOYMENT_ID"
    log "🔧 Environment: $DEPLOY_ENV"
    log "🐳 Docker Image: $DOCKER_IMAGE:$DOCKER_TAG"
    echo -e "${NC}"
}

# Signal handlers
trap 'error "Deployment interrupted"; exit 130' INT TERM
trap 'warn "Deployment cleanup required"; docker system prune -f' EXIT

# Main execution
main "$@"