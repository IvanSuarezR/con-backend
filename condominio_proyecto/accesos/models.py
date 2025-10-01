from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import random
import string

# =========================
# Nucleo de residentes/visitas
# =========================

class Familia(models.Model):
    nombre = models.CharField(max_length=100)
    departamento = models.CharField(max_length=10)
    torre = models.CharField(max_length=5, null=True, blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Familia {self.nombre} - Dpto. {self.departamento}"

class Residente(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    documento_identidad = models.CharField(max_length=20, unique=True)
    familia = models.ForeignKey(Familia, on_delete=models.CASCADE, related_name='residentes', null=True, blank=True)
    TIPO_CHOICES = [
        ('PRINCIPAL', 'Principal'),
        ('FAMILIAR', 'Familiar'),
    ]
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='FAMILIAR')
    foto_perfil = models.ImageField(upload_to='residentes/', null=True, blank=True)
    datos_biometricos = models.JSONField(null=True, blank=True)  # Almacena datos de reconocimiento facial
    puede_abrir_porton = models.BooleanField(default=True)
    puede_abrir_puerta = models.BooleanField(default=True)
    # Permisos para generar QR de visitas
    puede_generar_qr_peatonal = models.BooleanField(default=True)
    puede_generar_qr_vehicular = models.BooleanField(default=True)
    # Permiso para reservar areas comunes
    puede_reservar_areas = models.BooleanField(default=True, help_text='Puede crear reservas en áreas comunes')
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.documento_identidad}"

class Vehiculo(models.Model):
    TIPO_CHOICES = [
        ('R', 'Residente'),
        ('V', 'Visitante'),
        ('D', 'Delivery'),
    ]
    
    residente = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name='vehiculos')
    matricula = models.CharField(max_length=10, unique=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    tipo = models.CharField(max_length=1, choices=TIPO_CHOICES)
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.matricula} - {self.marca} {self.modelo}"

class Visitante(models.Model):
    TIPO_ACCESO = [
        ('P', 'Peatonal'),
        ('V', 'Vehicular'),
    ]
    
    nombre_completo = models.CharField(max_length=100)
    documento_identidad = models.CharField(max_length=20, null=True, blank=True)
    foto = models.ImageField(upload_to='visitantes/', null=True, blank=True)
    tipo_acceso = models.CharField(max_length=1, choices=TIPO_ACCESO)
    autorizado_por = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name='visitantes_autorizados')
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    activo = models.BooleanField(default=False)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.nombre_completo} - Autorizado por: {self.autorizado_por}"

class Delivery(models.Model):
    TIPO_ACCESO = [
        ('P', 'Peatonal'),
        ('V', 'Vehicular'),
    ]
    
    nombre_completo = models.CharField(max_length=100)
    empresa = models.CharField(max_length=100)
    documento_identidad = models.CharField(max_length=20)
    tipo_acceso = models.CharField(max_length=1, choices=TIPO_ACCESO)
    autorizado_por = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name='deliveries_autorizados')
    fecha_hora = models.DateTimeField()
    tiempo_estimado = models.IntegerField(help_text='Tiempo estimado en minutos')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)
    completado = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nombre_completo} - {self.empresa}"

class AutorizacionVisita(models.Model):
    STATUS_CHOICES = [
        ('ACTIVA', 'Activa'),
        ('VENCIDA', 'Vencida'),
        ('CANCELADA', 'Cancelada'),
        ('UTILIZADA', 'Utilizada'),
    ]

    visitante = models.ForeignKey(Visitante, on_delete=models.CASCADE, related_name='autorizaciones')
    autorizado_por = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name='autorizaciones_otorgadas')
    familia = models.ForeignKey(Familia, on_delete=models.CASCADE, related_name='autorizaciones', null=True, blank=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVA')
    codigo_qr = models.CharField(max_length=100, unique=True)
    qr_image = models.TextField(null=True, blank=True)  # Para almacenar la imagen QR en base64
    # Control de usos
    entradas_permitidas = models.IntegerField(default=1, help_text='Cantidad de ingresos permitidos (cada uno con su salida).')
    entradas_consumidas = models.IntegerField(default=0)
    dentro = models.BooleanField(default=False, help_text='Indica si el visitante se encuentra dentro actualmente')

    def save(self, *args, **kwargs):
        if not self.codigo_qr:
            # Generar un codigo unico usando timestamp y datos del visitante
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            random_string = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.codigo_qr = f"AV-{timestamp}-{random_string}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Autorización para {self.visitante} - {self.get_status_display()}"

class ConfiguracionAcceso(models.Model):
    clave = models.CharField(max_length=50, unique=True)
    valor = models.JSONField()
    descripcion = models.TextField(blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    @classmethod
    def get_valor(cls, clave, default=None):
        try:
            config = cls.objects.get(clave=clave)
            return config.valor
        except cls.DoesNotExist:
            return default

    def __str__(self):
        return f"{self.clave}: {self.valor}"

## Notificacion model moved to 'notificaciones' app

class RegistroAcceso(models.Model):
    TIPO_PERSONA = [
        ('R', 'Residente'),
        ('V', 'Visitante'),
        ('D', 'Delivery'),
    ]
    
    TIPO_VERIFICACION = [
        ('F', 'Facial'),
        ('C', 'Credencial'),
        ('M', 'Manual'),
    ]
    
    fecha_hora = models.DateTimeField(auto_now_add=True)
    tipo_persona = models.CharField(max_length=1, choices=TIPO_PERSONA)
    tipo_verificacion = models.CharField(max_length=1, choices=TIPO_VERIFICACION)
    persona_id = models.IntegerField()  # ID de la persona (residente, visitante o delivery)
    exitoso = models.BooleanField()
    detalles = models.JSONField(null=True, blank=True)  # Almacena detalles adicionales del acceso
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Acceso {self.get_tipo_persona_display()} - {self.fecha_hora}"


# =========================
# Areas comunes y reservas
# =========================

