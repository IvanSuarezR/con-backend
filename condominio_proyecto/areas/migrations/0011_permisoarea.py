from django.db import migrations


class Migration(migrations.Migration):
    # This migration was left empty previously and caused a loader error.
    # Define it as a no-op migration that depends on the last valid one.
    dependencies = [
        ('areas', '0003_alter_areacomun_tipo'),
    ]

    operations = []
