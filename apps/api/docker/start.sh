#!/bin/sh
set -eu

PORT="${PORT:-8080}"

# Railway injects PORT at runtime; Apache needs a literal Listen directive.
sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# mod_php only runs on the prefork MPM. Some base-image rebuilds re-enable
# mpm_event, which makes Apache exit with AH00534 ("More than one MPM loaded")
# and the container restart forever. Normalise here as well, then prove it.
a2dismod -f mpm_event mpm_worker mpm_itk >/dev/null 2>&1 || true
a2enmod mpm_prefork >/dev/null 2>&1 || true
MPMS="$(ls /etc/apache2/mods-enabled/mpm_*.load 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ' ' || true)"
echo "Enabled MPMs: ${MPMS:-none}"
apache2ctl -t

# Cache after the environment is present (the image is built without secrets).
# Migrate first: Railway's config-as-code no longer applies preDeployCommand for
# this service, so the container owns the schema step. It is idempotent.
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# The caches above are written as root while the container boots, but Apache
# serves as www-data. BladeCompiler touches a compiled view on every render, so
# root-owned files make the admin pages fail with:
#   touch(): Utime failed: Operation not permitted
# Hand the writable trees back to the runtime user before dropping privileges.
chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
