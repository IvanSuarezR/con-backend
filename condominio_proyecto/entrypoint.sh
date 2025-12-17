#!/bin/sh
set -e

echo "=== Starting entrypoint script ==="
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"

echo "=== Running database migrations ==="
python manage.py migrate --noinput || { echo "ERROR: Migrations failed"; exit 1; }
echo "=== Migrations completed successfully ==="

echo "=== Creating superuser if it doesn't exist ==="
python manage.py createsuperuser --noinput || echo "Superuser already exists or creation failed (this is OK if user exists)"

echo "=== Starting gunicorn ==="
exec "$@"
