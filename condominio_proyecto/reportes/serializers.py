from rest_framework import serializers
from accesos.models import Residente, Familia, RegistroAcceso, AutorizacionVisita, Visitante, Delivery
from areas.models import ReservaArea, AreaComun


class ResidenteReporteSerializer(serializers.ModelSerializer):
    familia_nombre = serializers.CharField(source='familia.nombre', read_only=True)
    torre = serializers.CharField(source='familia.torre', read_only=True)
    departamento = serializers.CharField(source='familia.departamento', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    nombre = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        fn = obj.user.first_name or ''
        ln = obj.user.last_name or ''
        return (fn + ' ' + ln).strip() or obj.user.username

    class Meta:
        model = Residente
        fields = ['id','documento_identidad','username','nombre','tipo','activo','fecha_registro','familia','familia_nombre','torre','departamento']


class FamiliaReporteSerializer(serializers.ModelSerializer):
    residentes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Familia
        fields = ['id','nombre','torre','departamento','activo','fecha_creacion','residentes_count']


class RegistroAccesoReporteSerializer(serializers.ModelSerializer):
    vehiculo_matricula = serializers.CharField(source='vehiculo.matricula', read_only=True)
    tipo_persona_label = serializers.CharField(source='get_tipo_persona_display', read_only=True)
    tipo_verificacion_label = serializers.CharField(source='get_tipo_verificacion_display', read_only=True)
    persona_nombre = serializers.SerializerMethodField()
    persona_documento = serializers.SerializerMethodField()

    def get_persona_nombre(self, obj):
        # Use preloaded maps if provided to avoid N+1
        res_map = self.context.get('res_map') or {}
        vis_map = self.context.get('vis_map') or {}
        del_map = self.context.get('del_map') or {}
        if obj.tipo_persona == 'R':
            r = res_map.get(obj.persona_id)
            if r:
                u = r.user
                return ((u.first_name or '') + ' ' + (u.last_name or '')).strip() or u.username
        elif obj.tipo_persona == 'V':
            v = vis_map.get(obj.persona_id)
            if v:
                return v.nombre_completo
        elif obj.tipo_persona == 'D':
            d = del_map.get(obj.persona_id)
            if d:
                return d.nombre_completo
        return ''

    def get_persona_documento(self, obj):
        res_map = self.context.get('res_map') or {}
        vis_map = self.context.get('vis_map') or {}
        del_map = self.context.get('del_map') or {}
        if obj.tipo_persona == 'R':
            r = res_map.get(obj.persona_id)
            return r.documento_identidad if r else ''
        elif obj.tipo_persona == 'V':
            v = vis_map.get(obj.persona_id)
            return v.documento_identidad if v else ''
        elif obj.tipo_persona == 'D':
            d = del_map.get(obj.persona_id)
            return d.documento_identidad if d else ''
        return ''

    class Meta:
        model = RegistroAcceso
        fields = ['id','fecha_hora','tipo_persona','tipo_persona_label','tipo_verificacion','tipo_verificacion_label','persona_id','persona_nombre','persona_documento','exitoso','vehiculo_matricula','detalles']


class ReservaAreaReporteSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source='area.nombre', read_only=True)
    residente_documento = serializers.CharField(source='residente.documento_identidad', read_only=True)
    residente_nombre = serializers.SerializerMethodField()

    def get_residente_nombre(self, obj):
        u = obj.residente.user
        return ((u.first_name or '') + ' ' + (u.last_name or '')).strip() or u.username

    class Meta:
        model = ReservaArea
        fields = ['id','fecha_creacion','estado','area','area_nombre','residente','residente_documento','residente_nombre','unidad','turno','fecha_inicio','fecha_fin','cupos']


class AutorizacionVisitaReporteSerializer(serializers.ModelSerializer):
    visitante_nombre = serializers.CharField(source='visitante.nombre_completo', read_only=True)
    visitante_doc = serializers.CharField(source='visitante.documento_identidad', read_only=True)
    autorizado_por_documento = serializers.CharField(source='autorizado_por.documento_identidad', read_only=True)

    class Meta:
        model = AutorizacionVisita
        fields = ['id','fecha_creacion','status','fecha_inicio','fecha_fin','visitante_nombre','visitante_doc','autorizado_por_id','autorizado_por_documento','familia_id','codigo_qr','entradas_permitidas','entradas_consumidas','dentro']
