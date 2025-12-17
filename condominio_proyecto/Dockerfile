# Usar una imagen base oficial de Python
FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2 y otros
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requerimientos e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto en el que correrá la aplicación (Cloud Run usa 8080 por defecto)
EXPOSE 8080

# Comando para correr la aplicación usando gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "condominio_BackendAPI.wsgi:application"]
