from django.db import models
from django.contrib.auth.models import User
import uuid


class Notificacion(models.Model):
    TIPO_CHOICES = [
        ('AUTORIZACION_CREADA', 'Nueva Autorización'),
        ('AUTORIZACION_EXTENDIDA', 'Autorización Extendida'),
        ('AUTORIZACION_VENCIDA', 'Autorización Vencida'),
        ('AUTORIZACION_UTILIZADA', 'Autorización Utilizada'),
        ('ACCESO_DENEGADO', 'Acceso Denegado'),
        ('EMERGENCIA', 'Emergencia'),
        ('MULTA', 'Multa'),
        ('ACTIVIDAD', 'Actividad'),
        ('AVISO', 'Aviso General'),
    ]

    # Grupo opcional para identificar un envio masivo
    broadcast_id = models.CharField(max_length=36, null=True, blank=True, db_index=True)
    # Destinatario: puede ser un residente o un usuario admin (usuario.is_staff)
    residente = models.ForeignKey('accesos.Residente', on_delete=models.CASCADE, related_name='notificaciones', null=True, blank=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones_admin', null=True, blank=True)
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=150, blank=True)
    mensaje = models.TextField()
    datos_extra = models.JSONField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)
    fecha_lectura = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_creacion']
        constraints = [
            models.CheckConstraint(
                check=(models.Q(residente__isnull=False) | models.Q(usuario__isnull=False)),
                name='notificacion_destinatario_requerido'
            )
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha_creacion.strftime('%d/%m/%Y %H:%M')}"
