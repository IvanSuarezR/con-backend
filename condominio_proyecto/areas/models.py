from django.db import models


class AreaComun(models.Model):
    TIPO_CHOICES = [
        ('UNIDADES', 'Por unidades (ej. churrasqueras)'),
        ('AFORO', 'Por capacidad/turnos'),
    ]

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True)
    reglas = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    horario_inicio = models.TimeField(null=True, blank=True)
    horario_fin = models.TimeField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


class UnidadArea(models.Model):
    area = models.ForeignKey(AreaComun, on_delete=models.CASCADE, related_name='unidades')
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('area', 'nombre')
        ordering = ['area__nombre', 'nombre']

    def __str__(self):
        return f"{self.area.nombre} - {self.nombre}"


class TurnoArea(models.Model):
    area = models.ForeignKey(AreaComun, on_delete=models.CASCADE, related_name='turnos')
    titulo = models.CharField(max_length=120, blank=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    capacidad = models.PositiveIntegerField(default=1)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['fecha_inicio']

    def __str__(self):
        rango = f"{self.fecha_inicio.strftime('%d/%m %H:%M')}-{self.fecha_fin.strftime('%H:%M')}"
        return f"{self.area.nombre} - {self.titulo or 'Turno'} ({rango})"


class ReservaArea(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('CONFIRMADA', 'Confirmada'),
        ('CANCELADA', 'Cancelada'),
    ]

    area = models.ForeignKey(AreaComun, on_delete=models.CASCADE, related_name='reservas')
    residente = models.ForeignKey('accesos.Residente', on_delete=models.CASCADE, related_name='reservas_area')
    familia = models.ForeignKey('accesos.Familia', on_delete=models.CASCADE, related_name='reservas_area', null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='CONFIRMADA')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True)

    # Modalidad UNIDADES
    unidad = models.ForeignKey(UnidadArea, on_delete=models.CASCADE, null=True, blank=True, related_name='reservas')
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)

    # Modalidad AFORO
    turno = models.ForeignKey(TurnoArea, on_delete=models.CASCADE, null=True, blank=True, related_name='reservas')
    cupos = models.PositiveIntegerField(default=1, help_text='Cantidad de asistentes (solo AFORO)')

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        if self.turno_id:
            return f"Reserva {self.area.nombre} (turno)"
        return f"Reserva {self.area.nombre} - {self.unidad and self.unidad.nombre}"
