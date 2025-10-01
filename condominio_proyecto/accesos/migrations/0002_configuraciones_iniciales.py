from django.db import migrations

def crear_configuraciones_iniciales(apps, schema_editor):
    ConfiguracionAcceso = apps.get_model('accesos', 'ConfiguracionAcceso')
    
    configuraciones = [
        {
            'clave': 'MAX_AUTORIZACIONES_POR_FAMILIA',
            'valor': 10,
            'descripcion': 'Número máximo de autorizaciones activas que puede tener una familia'
        },
        {
            'clave': 'MAX_HORAS_EXTENSION',
            'valor': 24,
            'descripcion': 'Número máximo de horas que se puede extender una autorización'
        },
        {
            'clave': 'TIEMPO_MAXIMO_VISITA',
            'valor': 12,
            'descripcion': 'Tiempo máximo en horas que puede durar una visita'
        },
        {
            'clave': 'TIEMPO_GRACIA_SALIDA',
            'valor': 30,
            'descripcion': 'Tiempo de gracia en minutos para registrar la salida después del vencimiento'
        }
    ]
    
    for config in configuraciones:
        ConfiguracionAcceso.objects.create(**config)

def eliminar_configuraciones(apps, schema_editor):
    ConfiguracionAcceso = apps.get_model('accesos', 'ConfiguracionAcceso')
    ConfiguracionAcceso.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('accesos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_configuraciones_iniciales, eliminar_configuraciones),
    ]