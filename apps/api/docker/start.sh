#!/bin/sh
set -eu

PORT="${PORT:-8080}"

# Railway injects PORT at runtime; Apache needs a literal Listen directive.
sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Cache after the environment is present (the image is built without secrets).
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec apache2-foreground
