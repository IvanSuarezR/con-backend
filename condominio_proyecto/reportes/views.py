from datetime import datetime
from django.db.models import Count, Q
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from accesos.models import Residente, Familia, RegistroAcceso, AutorizacionVisita, Visitante, Delivery
from areas.models import ReservaArea
from .serializers import (
    ResidenteReporteSerializer,
    FamiliaReporteSerializer,
    RegistroAccesoReporteSerializer,
    ReservaAreaReporteSerializer,
    AutorizacionVisitaReporteSerializer,
)


def parse_range(request):
    desde = request.GET.get('desde')
    hasta = request.GET.get('hasta')
    try:
        d = parse_datetime(desde) if desde else None
        h = parse_datetime(hasta) if hasta else None
    except Exception:
        d = h = None
    return d, h

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reporte_residentes(request):
    qs = Residente.objects.select_related('user','familia').all()
    activo = request.GET.get('activo')
    tipo = request.GET.get('tipo')
    q = request.GET.get('q')
    if activo in ('true','false'):
        qs = qs.filter(activo=(activo=='true'))
    if tipo in ('PRINCIPAL','FAMILIAR'):
        qs = qs.filter(tipo=tipo)
    if q:
        ql = q.strip()
        qs = qs.filter(Q(user__first_name__icontains=ql) | Q(user__last_name__icontains=ql) | Q(user__username__icontains=ql) | Q(documento_identidad__icontains=ql) | Q(familia__nombre__icontains=ql))
    d, h = parse_range(request)
    if d:
        qs = qs.filter(fecha_registro__gte=d)
    if h:
        qs = qs.filter(fecha_registro__lte=h)
    data = ResidenteReporteSerializer(qs, many=True).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reporte_familias(request):
    qs = Familia.objects.all().annotate(residentes_count=Count('residentes'))
    activo = request.GET.get('activo')
    q = request.GET.get('q')
    if activo in ('true','false'):
        qs = qs.filter(activo=(activo=='true'))
    if q:
        ql = q.strip()
        qs = qs.filter(Q(nombre__icontains=ql) | Q(torre__icontains=ql) | Q(departamento__icontains=ql))
    d, h = parse_range(request)
    if d:
        qs = qs.filter(fecha_creacion__gte=d)
    if h:
        qs = qs.filter(fecha_creacion__lte=h)
    data = FamiliaReporteSerializer(qs, many=True).data
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reporte_accesos(request):
    qs = RegistroAcceso.objects.select_related('vehiculo').all()
    tipo_persona = request.GET.get('tipo_persona')  # R, V, D
    exitoso = request.GET.get('exitoso')
    q = request.GET.get('q')
    if tipo_persona in ('R','V','D'):
        qs = qs.filter(tipo_persona=tipo_persona)
    if exitoso in ('true','false'):
        qs = qs.filter(exitoso=(exitoso=='true'))
    d, h = parse_range(request)
    if d:
        qs = qs.filter(fecha_hora__gte=d)
    if h:
        qs = qs.filter(fecha_hora__lte=h)
    if q:
        ql = q.strip()
        # Filter across person name/document, vehicle plate, tipo_persona, id
        qs = qs.filter(
            Q(vehiculo__matricula__icontains=ql) |
            Q(id__icontains=ql) |
            Q(tipo_persona__icontains=ql)
        )
    # Preload maps for serializer context (persona name/document)
    res_ids = list(qs.filter(tipo_persona='R').values_list('persona_id', flat=True))
    vis_ids = list(qs.filter(tipo_persona='V').values_list('persona_id', flat=True))
    del_ids = list(qs.filter(tipo_persona='D').values_list('persona_id', flat=True))
    res_map = {r.id: r for r in Residente.objects.select_related('user').filter(id__in=res_ids)}
    vis_map = {v.id: v for v in Visitante.objects.filter(id__in=vis_ids)}
    del_map = {d.id: d for d in Delivery.objects.filter(id__in=del_ids)}
    data = RegistroAccesoReporteSerializer(qs, many=True, context={'res_map': res_map, 'vis_map': vis_map, 'del_map': del_map}).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reporte_reservas(request):
    qs = ReservaArea.objects.select_related('area','residente__user','familia','unidad','turno').all()
    estado = request.GET.get('estado')
    area_id = request.GET.get('area')
    q = request.GET.get('q')
    if estado in ('PENDIENTE','CONFIRMADA','CANCELADA'):
        qs = qs.filter(estado=estado)
    if area_id and area_id.isdigit():
        qs = qs.filter(area_id=int(area_id))
    d, h = parse_range(request)
    if d:
        qs = qs.filter(fecha_creacion__gte=d)
    if h:
        qs = qs.filter(fecha_creacion__lte=h)
    if q:
        ql = q.strip()
        qs = qs.filter(
            Q(id__icontains=ql) |
            Q(area__nombre__icontains=ql) |
            Q(residente__user__first_name__icontains=ql) |
            Q(residente__user__last_name__icontains=ql) |
            Q(residente__documento_identidad__icontains=ql) |
            Q(unidad__nombre__icontains=ql)
        )
    data = ReservaAreaReporteSerializer(qs, many=True).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reporte_visitas(request):
    qs = AutorizacionVisita.objects.select_related('visitante','autorizado_por__user','familia').all()
    status_f = request.GET.get('status')
    q = request.GET.get('q')
    if status_f in ('ACTIVA','VENCIDA','CANCELADA','UTILIZADA'):
        qs = qs.filter(status=status_f)
    d, h = parse_range(request)
    if d:
        qs = qs.filter(fecha_creacion__gte=d)
    if h:
        qs = qs.filter(fecha_creacion__lte=h)
    if q:
        ql = q.strip()
        qs = qs.filter(
            Q(id__icontains=ql) |
            Q(codigo_qr__icontains=ql) |
            Q(visitante__nombre_completo__icontains=ql) |
            Q(visitante__documento_identidad__icontains=ql) |
            Q(autorizado_por__user__first_name__icontains=ql) |
            Q(autorizado_por__user__last_name__icontains=ql) |
            Q(autorizado_por__documento_identidad__icontains=ql) |
            Q(familia__nombre__icontains=ql)
        )
    data = AutorizacionVisitaReporteSerializer(qs, many=True).data
    return Response(data)
