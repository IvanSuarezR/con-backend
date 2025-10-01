from rest_framework import serializers
from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    residente_nombre = serializers.SerializerMethodField()
    usuario_username = serializers.SerializerMethodField()
    residente_documento = serializers.SerializerMethodField()
    familia_id = serializers.SerializerMethodField()
    familia_nombre = serializers.SerializerMethodField()
    class Meta:
        model = Notificacion
        fields = '__all__'

    def get_residente_nombre(self, obj):
        try:
            return obj.residente.user.get_full_name() or obj.residente.user.username
        except Exception:
            return None

    def get_usuario_username(self, obj):
        try:
            return obj.usuario.username
        except Exception:
            return None

    def get_residente_documento(self, obj):
        try:
            return obj.residente.documento_identidad
        except Exception:
            return None

    def get_familia_id(self, obj):
        try:
            return obj.residente.familia_id
        except Exception:
            return None

    def get_familia_nombre(self, obj):
        try:
            fam = getattr(obj.residente, 'familia', None)
            return getattr(fam, 'nombre', None)
        except Exception:
            return None


## Campanas removidas; usamos broadcast_id en Notificacion
