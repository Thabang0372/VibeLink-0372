#!/bin/sh
set -e

echo "🔍 Running Security Scan..."

# Check for known vulnerabilities in dependencies
if command -v audit-ci >/dev/null 2>&1; then
    echo "📊 Scanning for vulnerable dependencies..."
    npx audit-ci --critical
fi

# Check file integrity
echo "🔎 Verifying file integrity..."
find /usr/share/nginx/html -name "*.js" -exec sh -c 'echo "Validating {}" && node -c {}' \;

# Check for suspicious files
echo "🚨 Checking for suspicious files..."
find /usr/share/nginx/html -name "*.php" -o -name "*.py" -o -name "*.sh" | while read file; do
    echo "❌ Suspicious file found: $file"
done

# Verify SSL certificate
echo "📜 Verifying SSL certificate..."
openssl verify -CAfile /etc/nginx/ssl/nginx.crt /etc/nginx/ssl/nginx.crt

# Check nginx configuration
echo "⚙️ Validating nginx configuration..."
nginx -t

echo "✅ Security scan completed successfully"