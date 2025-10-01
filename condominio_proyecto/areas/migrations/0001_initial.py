from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accesos', '0007_residente_puede_generar_qr_peatonal_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AreaComun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('tipo', models.CharField(choices=[('UNIDADES', 'Por unidades (ej. churrasqueras)'), ('AFORO', 'Por aforo/turnos (ej. piscina)')], max_length=10)),
                ('descripcion', models.TextField(blank=True)),
                ('reglas', models.TextField(blank=True)),
                ('activo', models.BooleanField(default=True)),
                ('horario_inicio', models.TimeField(blank=True, null=True)),
                ('horario_fin', models.TimeField(blank=True, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['nombre']},
        ),
        migrations.CreateModel(
            name='TurnoArea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(blank=True, max_length=120)),
                ('fecha_inicio', models.DateTimeField()),
                ('fecha_fin', models.DateTimeField()),
                ('capacidad', models.PositiveIntegerField(default=1)),
                ('activo', models.BooleanField(default=True)),
                ('area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='turnos', to='areas.areacomun')),
            ],
            options={'ordering': ['fecha_inicio']},
        ),
        migrations.CreateModel(
            name='UnidadArea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True)),
                ('activo', models.BooleanField(default=True)),
                ('area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='unidades', to='areas.areacomun')),
            ],
            options={'ordering': ['area__nombre', 'nombre']},
        ),
        migrations.AlterUniqueTogether(
            name='unidadarea',
            unique_together={('area', 'nombre')},
        ),
        migrations.CreateModel(
            name='ReservaArea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('CONFIRMADA', 'Confirmada'), ('CANCELADA', 'Cancelada')], default='CONFIRMADA', max_length=10)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('notas', models.TextField(blank=True)),
                ('fecha_inicio', models.DateTimeField(blank=True, null=True)),
                ('fecha_fin', models.DateTimeField(blank=True, null=True)),
                ('cupos', models.PositiveIntegerField(default=1, help_text='Cantidad de asistentes (solo AFORO)')),
                ('area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservas', to='areas.areacomun')),
                ('familia', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reservas_area', to='accesos.familia')),
                ('residente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservas_area', to='accesos.residente')),
                ('turno', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reservas', to='areas.turnoarea')),
                ('unidad', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reservas', to='areas.unidadarea')),
            ],
            options={'ordering': ['-fecha_creacion']},
        ),
    ]
