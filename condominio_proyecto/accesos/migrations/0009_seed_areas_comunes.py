from django.db import migrations
from django.utils import timezone
from datetime import timedelta


def seed_areas(apps, schema_editor):
    AreaComun = apps.get_model('accesos', 'AreaComun')
    UnidadArea = apps.get_model('accesos', 'UnidadArea')
    TurnoArea = apps.get_model('accesos', 'TurnoArea')

    # Piscina (AFORO)
    piscina, _ = AreaComun.objects.get_or_create(
        nombre='Piscina', defaults=dict(tipo='AFORO', descripcion='Piscina principal', activo=True)
    )
    now = timezone.now()
    for i in range(3):
        fi = (now + timedelta(days=i)).replace(hour=9, minute=0, second=0, microsecond=0)
        ff = (now + timedelta(days=i)).replace(hour=12, minute=0, second=0, microsecond=0)
        TurnoArea.objects.get_or_create(area=piscina, fecha_inicio=fi, fecha_fin=ff, defaults=dict(titulo='Mañana', capacidad=20, activo=True))
        fi2 = (now + timedelta(days=i)).replace(hour=14, minute=0, second=0, microsecond=0)
        ff2 = (now + timedelta(days=i)).replace(hour=18, minute=0, second=0, microsecond=0)
        TurnoArea.objects.get_or_create(area=piscina, fecha_inicio=fi2, fecha_fin=ff2, defaults=dict(titulo='Tarde', capacidad=20, activo=True))

    # Churrasqueras (UNIDADES)
    churras, _ = AreaComun.objects.get_or_create(
        nombre='Churrasqueras', defaults=dict(tipo='UNIDADES', descripcion='Zona de parrillas', activo=True)
    )
    for n in ['Churra 1', 'Churra 2', 'Churra 3']:
        UnidadArea.objects.get_or_create(area=churras, nombre=n, defaults=dict(descripcion='Parrilla', activo=True))

    # Cancha Sintética (UNIDADES)
    cancha, _ = AreaComun.objects.get_or_create(
        nombre='Cancha Sintética', defaults=dict(tipo='UNIDADES', descripcion='Fútbol 7', activo=True)
    )
    UnidadArea.objects.get_or_create(area=cancha, nombre='Cancha A', defaults=dict(descripcion='Cancha', activo=True))


def unseed_areas(apps, schema_editor):
    AreaComun = apps.get_model('accesos', 'AreaComun')
    AreaComun.objects.filter(nombre__in=['Piscina', 'Churrasqueras', 'Cancha Sintética']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accesos', '0008_areas_comunes'),
    ]

    operations = [
        migrations.RunPython(seed_areas, reverse_code=unseed_areas),
    ]
