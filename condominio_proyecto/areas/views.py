from datetime import datetime
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import AreaComun, UnidadArea, TurnoArea, ReservaArea
from .serializers import (
    AreaComunSerializer, UnidadAreaSerializer, TurnoAreaSerializer, ReservaAreaSerializer
)
from accesos.permissions import IsAdminUser, IsResidentePrincipal, IsFamilyMember


class AreaComunViewSet(viewsets.ModelViewSet):
    queryset = AreaComun.objects.all()
    serializer_class = AreaComunSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = AreaComun.objects.all()
        activo = self.request.query_params.get('activo')
        tipo = self.request.query_params.get('tipo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def calendario(self, request, pk=None):
        """
        Devuelve disponibilidad y reservas para el área indicada.
        - Para UNIDADES: lista de reservas por unidad con sus rangos de fechas
        - Para AFORO: lista de turnos con capacidad, ocupados y disponibles
        Opcional: filtrar por rango ?desde=ISO&hasta=ISO
        """
        try:
            area = AreaComun.objects.get(pk=pk)
        except AreaComun.DoesNotExist:
            return Response({'detail': 'Área no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        desde = request.query_params.get('desde')
        hasta = request.query_params.get('hasta')
        try:
            desde_dt = datetime.fromisoformat(desde) if desde else None
            hasta_dt = datetime.fromisoformat(hasta) if hasta else None
        except Exception:
            desde_dt = None
            hasta_dt = None

        if area.tipo == 'UNIDADES':
            reservas = ReservaArea.objects.filter(area=area, estado__in=['PENDIENTE', 'CONFIRMADA'])
            if desde_dt:
                reservas = reservas.filter(fecha_fin__gte=desde_dt)
            if hasta_dt:
                reservas = reservas.filter(fecha_inicio__lte=hasta_dt)
            data = []
            for r in reservas.select_related('unidad', 'residente__user').all():
                data.append({
                    'id': r.id,
                    'unidad_id': r.unidad_id,
                    'unidad_nombre': getattr(r.unidad, 'nombre', None),
                    'fecha_inicio': r.fecha_inicio,
                    'fecha_fin': r.fecha_fin,
                    'estado': r.estado,
                    'creado_en': r.fecha_creacion,
                    'residente': getattr(r.residente.user, 'get_full_name', lambda: None)(),
                })
            return Response({'tipo': 'UNIDADES', 'reservas': data})
        else:
            turnos = TurnoArea.objects.filter(area=area, activo=True)
            if desde_dt:
                turnos = turnos.filter(fecha_fin__gte=desde_dt)
            if hasta_dt:
                turnos = turnos.filter(fecha_inicio__lte=hasta_dt)
            # incluir ocupados/disponibles
            from .serializers import TurnoAreaSerializer
            ser = TurnoAreaSerializer(turnos, many=True)
            return Response({'tipo': 'AFORO', 'turnos': ser.data})


class UnidadAreaViewSet(viewsets.ModelViewSet):
    queryset = UnidadArea.objects.all()
    serializer_class = UnidadAreaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = UnidadArea.objects.all()
        area_id = self.request.query_params.get('area')
        activo = self.request.query_params.get('activo')
        if area_id:
            qs = qs.filter(area_id=area_id)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs


class TurnoAreaViewSet(viewsets.ModelViewSet):
    queryset = TurnoArea.objects.all()
    serializer_class = TurnoAreaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = TurnoArea.objects.all()
        area_id = self.request.query_params.get('area')
        activo = self.request.query_params.get('activo')
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if area_id:
            qs = qs.filter(area_id=area_id)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        try:
            if desde:
                qs = qs.filter(fecha_inicio__gte=datetime.fromisoformat(desde))
            if hasta:
                qs = qs.filter(fecha_fin__lte=datetime.fromisoformat(hasta))
        except Exception:
            pass
        return qs


class ReservaAreaViewSet(viewsets.ModelViewSet):
    queryset = ReservaArea.objects.all()
    serializer_class = ReservaAreaSerializer

    def get_permissions(self):
        if self.action in ['destroy']:
            permission_classes = [IsAdminUser | IsResidentePrincipal]
        elif self.action in ['create', 'update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        qs = ReservaArea.objects.all()
        if not user.is_staff:
            try:
                residente = user.residente
                qs = qs.filter(familia=residente.familia)
            except Exception:
                return ReservaArea.objects.none()
        # Filtros
        params = self.request.query_params
        area_id = params.get('area')
        if area_id:
            qs = qs.filter(area_id=area_id)
        estado = params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        tipo = params.get('tipo')
        if tipo:
            qs = qs.filter(area__tipo=tipo)
        familia_id = params.get('familia')
        if familia_id:
            qs = qs.filter(familia_id=familia_id)
        residente_id = params.get('residente')
        if residente_id:
            qs = qs.filter(residente_id=residente_id)
        desde = params.get('desde')
        hasta = params.get('hasta')
        try:
            desde_dt = datetime.fromisoformat(desde) if desde else None
            hasta_dt = datetime.fromisoformat(hasta) if hasta else None
        except Exception:
            desde_dt = None
            hasta_dt = None
        if desde_dt:
            qs = qs.filter(models.Q(fecha_fin__gte=desde_dt) | models.Q(turno__fecha_fin__gte=desde_dt))
        if hasta_dt:
            qs = qs.filter(models.Q(fecha_inicio__lte=hasta_dt) | models.Q(turno__fecha_inicio__lte=hasta_dt))
        q = params.get('q')
        if q:
            qs = qs.filter(
                models.Q(residente__user__first_name__icontains=q) |
                models.Q(residente__user__last_name__icontains=q) |
                models.Q(residente__user__username__icontains=q) |
                models.Q(residente__user__email__icontains=q) |
                models.Q(familia__nombre__icontains=q) |
                models.Q(area__nombre__icontains=q) |
                models.Q(unidad__nombre__icontains=q) |
                models.Q(turno__titulo__icontains=q)
            )
    # optimizacion
        qs = qs.select_related('residente__user', 'familia', 'area', 'unidad', 'turno')
        return qs

    def _validate_and_normalize(self, data, instance=None):
        area_id = data.get('area') or getattr(instance, 'area_id', None)
        if not area_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'area': 'Requerido'})
        from .models import AreaComun
        try:
            area = AreaComun.objects.get(pk=area_id)
        except AreaComun.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'area': 'No existe'})

        if area.tipo == 'UNIDADES':
            unidad_id = data.get('unidad') or getattr(instance, 'unidad_id', None)
            fi = data.get('fecha_inicio') or getattr(instance, 'fecha_inicio', None)
            ff = data.get('fecha_fin') or getattr(instance, 'fecha_fin', None)
            if not unidad_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'unidad': 'Requerido para áreas por unidades'})
            if not fi or not ff:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'fecha_inicio/fin': 'Requeridos para áreas por unidades'})
            solapes = ReservaArea.objects.filter(
                area=area, unidad_id=unidad_id, estado__in=['PENDIENTE', 'CONFIRMADA']
            )
            if instance:
                solapes = solapes.exclude(pk=instance.pk)
            try:
                fi_dt = datetime.fromisoformat(fi) if isinstance(fi, str) else fi
                ff_dt = datetime.fromisoformat(ff) if isinstance(ff, str) else ff
            except Exception:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'fecha_inicio/fin': 'Formato inválido, use ISO 8601'})
            solapes = solapes.filter(
                models.Q(fecha_inicio__lt=ff_dt) & models.Q(fecha_fin__gt=fi_dt)
            )
            if solapes.exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'solapado': 'Ya existe una reserva en ese rango'})
        else:
            turno_id = data.get('turno') or getattr(instance, 'turno_id', None)
            cupos = int(data.get('cupos', getattr(instance, 'cupos', 1)))
            if not turno_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'turno': 'Requerido para áreas por aforo'})
            from .models import TurnoArea
            try:
                turno = TurnoArea.objects.get(pk=turno_id, activo=True)
            except TurnoArea.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'turno': 'No existe o inactivo'})
            usados_qs = ReservaArea.objects.filter(area=area, turno=turno, estado__in=['PENDIENTE', 'CONFIRMADA'])
            # excluir la propia reserva en actualizacion para no contar doble
            if instance:
                usados_qs = usados_qs.exclude(pk=instance.pk)
            usados = usados_qs.aggregate(total=models.Sum('cupos'))['total'] or 0
            # si el nuevo estado es CANCELADA, no aporta cupos
            nuevo_estado = data.get('estado', getattr(instance, 'estado', 'CONFIRMADA'))
            aporte = cupos if nuevo_estado in ['PENDIENTE', 'CONFIRMADA'] else 0
            if usados + aporte > turno.capacidad:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'cupos': 'Capacidad del turno excedida'})

    def perform_create(self, serializer):
        try:
            residente = self.request.user.residente
        except Exception:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'residente': 'No válido'})
    # Validar permiso para reservar areas comunes (excepto admin)
        if not self.request.user.is_staff:
            if not getattr(residente, 'puede_reservar_areas', False):
                from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
                raise DRFPermissionDenied('No tienes permiso para reservar áreas comunes')
        data = dict(self.request.data)
        for k, v in list(data.items()):
            if isinstance(v, list) and len(v) == 1:
                data[k] = v[0]
        self._validate_and_normalize(data)
        serializer.save(residente=residente, familia=residente.familia)

    def perform_update(self, serializer):
        instance = self.get_object()
        # Si no es admin, validar que conserva permiso para reservar al intentar modificar
        if not self.request.user.is_staff:
            try:
                residente = self.request.user.residente
                if not getattr(residente, 'puede_reservar_areas', False):
                    from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
                    raise DRFPermissionDenied('No tienes permiso para modificar reservas de áreas comunes')
            except Exception:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'residente': 'No válido'})
        data = dict(self.request.data)
        for k, v in list(data.items()):
            if isinstance(v, list) and len(v) == 1:
                data[k] = v[0]
        self._validate_and_normalize(data, instance=instance)
        serializer.save()
