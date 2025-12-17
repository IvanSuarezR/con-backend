#!/bin/sh

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Creating superuser if it doesn't exist..."
python manage.py createsuperuser --noinput || echo "Superuser already exists or creation failed"

echo "Starting gunicorn..."
exec "$@"
