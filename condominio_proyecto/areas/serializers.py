from rest_framework import serializers
from .models import AreaComun, UnidadArea, TurnoArea, ReservaArea


class AreaComunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaComun
        fields = '__all__'


class UnidadAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadArea
        fields = '__all__'


class TurnoAreaSerializer(serializers.ModelSerializer):
    ocupados = serializers.SerializerMethodField()
    disponibles = serializers.SerializerMethodField()

    class Meta:
        model = TurnoArea
        fields = '__all__'

    def get_ocupados(self, obj):
        try:
            from django.db.models import Sum
            total = obj.reservas.filter(estado__in=['PENDIENTE', 'CONFIRMADA']).aggregate(total=Sum('cupos'))['total'] or 0
            return total
        except Exception:
            return 0

    def get_disponibles(self, obj):
        try:
            ocupados = self.get_ocupados(obj)
            disp = obj.capacidad - (ocupados or 0)
            return disp if disp > 0 else 0
        except Exception:
            return 0


class ReservaAreaSerializer(serializers.ModelSerializer):
    turno_detalle = serializers.SerializerMethodField()
    unidad_nombre = serializers.SerializerMethodField()
    area_nombre = serializers.SerializerMethodField()
    creado_en = serializers.DateTimeField(source='fecha_creacion', read_only=True)
    residente_nombre = serializers.SerializerMethodField()
    familia_nombre = serializers.SerializerMethodField()
    class Meta:
        model = ReservaArea
        fields = '__all__'
        # residente y familia se asignan desde el backend (usuario autenticado)
        read_only_fields = ('fecha_creacion', 'residente', 'familia')

    def get_turno_detalle(self, obj):
        try:
            t = obj.turno
            if not t:
                return None
            return {
                'id': t.id,
                'titulo': t.titulo,
                'fecha_inicio': t.fecha_inicio,
                'fecha_fin': t.fecha_fin,
                'capacidad': t.capacidad,
                # campos dinamicos para mostrar ocupacion actual
                'ocupados': t.reservas.filter(estado__in=['PENDIENTE', 'CONFIRMADA']).aggregate(total=__import__('django').db.models.Sum('cupos'))['total'] or 0,
            }
        except Exception:
            return None

    def get_unidad_nombre(self, obj):
        try:
            return obj.unidad.nombre if obj.unidad_id else None
        except Exception:
            return None

    def get_area_nombre(self, obj):
        try:
            return obj.area.nombre if obj.area_id else None
        except Exception:
            return None

    def get_residente_nombre(self, obj):
        try:
            u = obj.residente.user
            full = u.get_full_name()
            return full or u.username or u.email
        except Exception:
            return None

    def get_familia_nombre(self, obj):
        try:
            return obj.familia.nombre if obj.familia_id else None
        except Exception:
            return None
