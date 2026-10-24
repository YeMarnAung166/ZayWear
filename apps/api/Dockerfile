# Production image for the ZayWear API (Laravel + Apache/mod_php).
# Railway builds this file with the service root set to `apps/api`.
FROM php:8.4-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libonig-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        mbstring \
        zip \
        intl \
        bcmath \
        opcache \
    && rm -rf /var/lib/apt/lists/*

# mod_php only works with the prefork MPM. The base image normally ships prefork
# alone, but some rebuilds leave mpm_event enabled too, which Apache rejects with
# AH00534 "More than one MPM loaded" and the container crash-loops. Normalise it.
RUN a2dismod -f mpm_event mpm_worker mpm_itk >/dev/null 2>&1 || true; \
    a2enmod mpm_prefork rewrite headers

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependency layer: only invalidated when the manifests change.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .

RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-zaywear.ini
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Fail the build (with the real Apache error) instead of crash-looping in production.
RUN apache2ctl -t

EXPOSE 8080

CMD ["/usr/local/bin/start.sh"]
