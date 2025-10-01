# Python base image
FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose Django port
EXPOSE 8000

# Run migrations and start the development server
CMD HOME="/root" python manage.py runserver 0.0.0.0:8000 --noreaload
