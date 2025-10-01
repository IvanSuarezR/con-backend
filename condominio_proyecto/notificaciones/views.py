from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import transaction
from accesos.models import Residente, Familia
from .models import Notificacion
from .serializers import NotificacionSerializer
from accesos.permissions import IsAdminUser


class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all().order_by('-fecha_creacion')
    serializer_class = NotificacionSerializer

    def get_permissions(self):
        if self.action in ['destroy', 'create', 'update', 'partial_update']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        qs = Notificacion.objects.all().order_by('-fecha_creacion')
        # Filtros comunes: tipo y rango de fechas
        tipo = self.request.query_params.get('tipo')  # AVISO, ACTIVIDAD, etc
        if tipo:
            qs = qs.filter(tipo=tipo)
        desde = self.request.query_params.get('desde')  # ISO date or datetime
        hasta = self.request.query_params.get('hasta')
        if desde:
            qs = qs.filter(fecha_creacion__gte=desde)
        if hasta:
            qs = qs.filter(fecha_creacion__lte=hasta)
        if user.is_staff:
            # Por defecto, mostrar solo las suyas como admin; permitir ?all=true para ver todo
            if self.request.query_params.get('all') == 'true':
                return qs
            return qs.filter(usuario=user)
        try:
            residente = user.residente
            return qs.filter(residente=residente)
        except Exception:
            return Notificacion.objects.none()

    @action(detail=False, methods=['post'], url_path='marcar-leidas')
    def marcar_leidas(self, request):
        ids = request.data.get('ids')
        user = request.user
        # marcar del usuario (residente o admin)
        qs = Notificacion.objects.filter(leida=False)
        if hasattr(user, 'residente'):
            qs = qs.filter(residente=user.residente)
        else:
            qs = qs.filter(usuario=user)
        if isinstance(ids, list):
            qs = qs.filter(id__in=ids)
        updated = qs.update(leida=True, fecha_lectura=timezone.now())
        return Response({'marcadas': updated})

    @action(detail=False, methods=['post'], url_path='enviar')
    def enviar(self, request):
        """Envía notificaciones sin entidad 'campaña'. Targets por flags y listas.
        Body esperado: {
          tipo, titulo, mensaje, datos_extra?, incluir_todos_residentes?, incluir_admins?, familias?:[], residentes?:[]
        }
        Devuelve: { broadcast_id, entregas_creadas }
        """
        data = request.data or {}
        if not request.user.is_staff:
            return Response({'detail': 'Solo administradores'}, status=status.HTTP_403_FORBIDDEN)
        tipo = data.get('tipo')
        titulo = data.get('titulo')
        mensaje = data.get('mensaje')
        datos_extra = data.get('datos_extra')
        incluir_todos = bool(data.get('incluir_todos_residentes'))
        incluir_admins = bool(data.get('incluir_admins'))
        familias_ids = data.get('familias') or []
        residentes_ids = data.get('residentes') or []
        solo_principales = bool(data.get('solo_principales'))

        if not tipo or not mensaje:
            return Response({'detail': 'tipo y mensaje son requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        # determinar destinatarios
        res_qs = Residente.objects.none()
        if incluir_todos:
            res_qs = Residente.objects.filter(user__is_active=True)
        else:
            if familias_ids:
                res_qs = Residente.objects.filter(familia_id__in=familias_ids, user__is_active=True)
            if residentes_ids:
                res_qs = (res_qs | Residente.objects.filter(id__in=residentes_ids, user__is_active=True)).distinct()

        if solo_principales:
            res_qs = res_qs.filter(tipo='PRINCIPAL')

        # generar broadcast_id para agrupar
        import uuid
        bid = str(uuid.uuid4())
        total = 0
        with transaction.atomic():
            for r in res_qs:
                Notificacion.objects.create(
                    broadcast_id=bid,
                    residente=r,
                    tipo=tipo,
                    titulo=titulo,
                    mensaje=mensaje,
                    datos_extra=datos_extra,
                )
                total += 1
            if incluir_admins:
                for admin_user in User.objects.filter(is_staff=True, is_active=True):
                    Notificacion.objects.create(
                        broadcast_id=bid,
                        usuario=admin_user,
                        tipo=tipo,
                        titulo=titulo,
                        mensaje=mensaje,
                        datos_extra=datos_extra,
                    )
                    total += 1

        return Response({'broadcast_id': bid, 'entregas_creadas': total})

    @action(detail=False, methods=['get'], url_path='historial')
    def historial(self, request):
        """Resumen de envíos agrupados por broadcast_id, con filtros de tipo y fecha.
        Devuelve items con: broadcast_id, fecha, tipo, titulo, total, leidas, no_leidas.
        Solo admins."""
        if not request.user.is_staff:
            return Response({'detail': 'Solo administradores'}, status=status.HTTP_403_FORBIDDEN)
    # No usar get_queryset (filtra por usuario admin). Queremos ver TODOS los envios.
        qs = Notificacion.objects.all()
        # Aplicar filtros de tipo/fecha si vienen
        tipo = request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)
        desde = request.query_params.get('desde')
        hasta = request.query_params.get('hasta')
        if desde:
            qs = qs.filter(fecha_creacion__gte=desde)
        if hasta:
            qs = qs.filter(fecha_creacion__lte=hasta)
        qs = qs.exclude(broadcast_id__isnull=True)
        # Agrupar
        from django.db.models import Count, Sum, Case, When, IntegerField, Max
        agg = qs.values('broadcast_id', 'tipo', 'titulo').annotate(
            fecha=Max('fecha_creacion'),
            total=Count('id'),
            leidas=Sum(Case(When(leida=True, then=1), default=0, output_field=IntegerField())),
        ).order_by('-fecha')
        items = []
        for row in agg:
            items.append({
                'broadcast_id': row['broadcast_id'],
                'tipo': row['tipo'],
                'titulo': row['titulo'],
                'fecha': row['fecha'],
                'total': row['total'],
                'leidas': row['leidas'] or 0,
                'no_leidas': (row['total'] - (row['leidas'] or 0)),
            })
        return Response({'items': items})

    @action(detail=False, methods=['get'], url_path='historial/(?P<bid>[^/]+)')
    def historial_detalle(self, request, bid=None):
        """Detalle de un envío (broadcast_id): lista completa de notificaciones, con filtros de búsqueda de residente/familia/documento/username.
        Solo admins.
        Query params:
          search: texto libre
          leida: true|false
        """
        if not request.user.is_staff:
            return Response({'detail': 'Solo administradores'}, status=status.HTTP_403_FORBIDDEN)
        qs = Notificacion.objects.filter(broadcast_id=bid).select_related('residente__user', 'residente__familia', 'usuario').order_by('-fecha_creacion')
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            s = search.strip()
            qs = qs.filter(
                Q(residente__user__first_name__icontains=s) |
                Q(residente__user__last_name__icontains=s) |
                Q(residente__user__username__icontains=s) |
                Q(residente__documento_identidad__icontains=s) |
                Q(residente__familia__nombre__icontains=s) |
                Q(residente__familia__departamento__icontains=s) |
                Q(residente__familia__torre__icontains=s) |
                Q(usuario__username__icontains=s)
            )
        leida = request.query_params.get('leida')
        if leida in ['true', 'false']:
            qs = qs.filter(leida=(leida == 'true'))
        data = NotificacionSerializer(qs, many=True).data
        return Response({'items': data})

    @action(detail=False, methods=['get'], url_path='admins-count')
    def admins_count(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Solo administradores'}, status=status.HTTP_403_FORBIDDEN)
        count = User.objects.filter(is_staff=True, is_active=True).count()
        return Response({'admins': count})
