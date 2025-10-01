from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    Residente, Vehiculo, Visitante, Delivery, RegistroAcceso,
    AutorizacionVisita, Familia
)
from notificaciones.models import Notificacion
from notificaciones.serializers import NotificacionSerializer
from .serializers import (
    ResidenteSerializer, VehiculoSerializer, VisitanteSerializer,
    DeliverySerializer, RegistroAccesoSerializer, UserSerializer,
    FamiliaSerializer, AutorizacionVisitaSerializer
)
from .permissions import IsAdminUser, IsResidentePrincipal, IsFamilyMember, CanManageVisitors
from django.utils import timezone as djtz
from base64 import b64encode
from io import BytesIO
import qrcode
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# ===============
# Metricas Admin
# ===============

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def admin_metrics(request):
    """Devuelve métricas agregadas y opcionalmente detalles para el dashboard de Admin.

    Si se pasa ?detail=accesos|visitantes|alertas|usuarios, devuelve lista detallada correspondiente.
    """
    today = djtz.now().date()
    now = djtz.now()
    detail = request.query_params.get('detail')

    if detail == 'accesos':
    # Ultimos accesos de hoy (limit 50) con detalles enriquecidos
        qs = RegistroAcceso.objects.select_related('vehiculo').filter(fecha_hora__date=today).order_by('-fecha_hora')[:50]
        items = []
        MAP_TP = {'R': 'Residente', 'V': 'Visitante', 'D': 'Delivery'}
        MAP_TV = {'F': 'Facial', 'C': 'Credencial', 'M': 'Manual'}
        for r in qs:
            persona = None
            try:
                if r.tipo_persona == 'R':
                    res = Residente.objects.select_related('user', 'familia').get(pk=r.persona_id)
                    persona = {
                        'tipo': 'Residente',
                        'id': res.id,
                        'documento_identidad': res.documento_identidad,
                        'nombre': (res.user.get_full_name() or res.user.username),
                        'familia': {
                            'id': res.familia.id if res.familia else None,
                            'nombre': res.familia.nombre if res.familia else None,
                            'departamento': res.familia.departamento if res.familia else None,
                            'torre': res.familia.torre if res.familia else None,
                        }
                    }
                elif r.tipo_persona == 'V':
                    vis = Visitante.objects.select_related('autorizado_por__user').get(pk=r.persona_id)
                    ap = getattr(vis, 'autorizado_por', None)
                    ap_user = getattr(ap, 'user', None)
                    persona = {
                        'tipo': 'Visitante',
                        'id': vis.id,
                        'nombre_completo': vis.nombre_completo,
                        'documento_identidad': vis.documento_identidad,
                        'tipo_acceso': 'Vehicular' if vis.tipo_acceso == 'V' else 'Peatonal',
                        'autorizado_por': {
                            'id': ap.id if ap else None,
                            'documento_identidad': getattr(ap, 'documento_identidad', None),
                            'nombre': (getattr(ap_user, 'first_name', '') + ' ' + getattr(ap_user, 'last_name', '')).strip() if ap_user else None,
                            'username': getattr(ap_user, 'username', None) if ap_user else None,
                            'familia': {
                                'id': ap.familia.id if ap and ap.familia else None,
                                'nombre': ap.familia.nombre if ap and ap.familia else None,
                                'departamento': ap.familia.departamento if ap and ap.familia else None,
                                'torre': ap.familia.torre if ap and ap.familia else None,
                            }
                        }
                    }
                elif r.tipo_persona == 'D':
                    from .models import Delivery
                    de = Delivery.objects.select_related('autorizado_por__user').get(pk=r.persona_id)
                    ap = getattr(de, 'autorizado_por', None)
                    ap_user = getattr(ap, 'user', None)
                    persona = {
                        'tipo': 'Delivery',
                        'id': de.id,
                        'nombre_completo': de.nombre_completo,
                        'empresa': de.empresa,
                        'documento_identidad': de.documento_identidad,
                        'tipo_acceso': 'Vehicular' if de.tipo_acceso == 'V' else 'Peatonal',
                        'autorizado_por': {
                            'id': ap.id if ap else None,
                            'documento_identidad': getattr(ap, 'documento_identidad', None),
                            'nombre': (getattr(ap_user, 'first_name', '') + ' ' + getattr(ap_user, 'last_name', '')).strip() if ap_user else None,
                            'username': getattr(ap_user, 'username', None) if ap_user else None,
                        }
                    }
            except Exception:
                persona = None

            vehiculo = None
            if r.vehiculo_id:
                try:
                    vehiculo = {
                        'id': r.vehiculo.id,
                        'matricula': r.vehiculo.matricula,
                        'marca': r.vehiculo.marca,
                        'modelo': r.vehiculo.modelo,
                    }
                except Exception:
                    vehiculo = None

            items.append({
                'id': getattr(r, 'id', None),
                'fecha_hora': r.fecha_hora,
                'tipo_persona': r.tipo_persona,
                'tipo_persona_label': MAP_TP.get(r.tipo_persona, r.tipo_persona),
                'tipo_verificacion': r.tipo_verificacion,
                'tipo_verificacion_label': MAP_TV.get(r.tipo_verificacion, r.tipo_verificacion),
                'exitoso': r.exitoso,
                'persona_id': r.persona_id,
                'persona': persona,
                'vehiculo': vehiculo,
                'detalles': r.detalles,
            })
        return Response({'items': items, 'fecha': str(today)})
    if detail == 'visitantes':
        # Expirar autorizaciones vencidas antes de listar
        try:
            AutorizacionVisita.objects.filter(status='ACTIVA', fecha_fin__lt=now).update(status='VENCIDA')
        except Exception:
            pass
        # Autorizaciones activas y vigentes recientes (limit 50) con datos del creador
        qs = AutorizacionVisita.objects.select_related('visitante', 'autorizado_por__user').filter(
            status='ACTIVA', fecha_inicio__lte=now, fecha_fin__gte=now
        ).order_by('-fecha_creacion')[:50]
        items = []
        for a in qs:
            creador = a.autorizado_por
            creador_user = getattr(creador, 'user', None)
            items.append({
                'id': a.id,
                'status': a.status,
                'fecha_inicio': a.fecha_inicio,
                'fecha_fin': a.fecha_fin,
                'visitante': {
                    'id': a.visitante.id if a.visitante_id else None,
                    'nombre_completo': a.visitante.nombre_completo if a.visitante_id else None,
                    'tipo_acceso': a.visitante.tipo_acceso if a.visitante_id else None,
                },
                'autorizado_por': {
                    'id': creador.id if creador else None,
                    'documento_identidad': getattr(creador, 'documento_identidad', None),
                    'nombre': (getattr(creador_user, 'first_name', '') + ' ' + getattr(creador_user, 'last_name', '')).strip() if creador_user else None,
                    'username': getattr(creador_user, 'username', None) if creador_user else None,
                }
            })
        return Response({'items': items})
    if detail == 'alertas':
    # Notificaciones no leidas (limit 50)
        qs = Notificacion.objects.filter(leida=False).order_by('-fecha_creacion')[:50]
        data = NotificacionSerializer(qs, many=True).data
        return Response({'items': data})
    if detail == 'usuarios':
        # Usuarios recientes (limit 50)
        qs = User.objects.order_by('-date_joined')[:50]
        # Serializador ligero inline
        data = [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_staff': u.is_staff,
                'date_joined': getattr(u, 'date_joined', None),
            }
            for u in qs
        ]
        return Response({'items': data})

    # Expirar autorizaciones vencidas antes de contar
    try:
        AutorizacionVisita.objects.filter(status='ACTIVA', fecha_fin__lt=now).update(status='VENCIDA')
    except Exception:
        pass

    total_usuarios = User.objects.count()
    total_residentes = Residente.objects.count()
    accesos_hoy = RegistroAcceso.objects.filter(fecha_hora__date=today).count()
    visitantes_pendientes = AutorizacionVisita.objects.filter(status='ACTIVA').count()
    alertas_no_leidas = Notificacion.objects.filter(leida=False).count()

    return Response({
        'total_usuarios': total_usuarios,
        'total_residentes': total_residentes,
        'accesos_hoy': accesos_hoy,
        'visitantes_pendientes': visitantes_pendientes,
        'alertas': alertas_no_leidas,
        'fecha': str(today),
    })

## Notificaciones ahora se gestionan en la app 'notificaciones'

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})

def _can_open_gate(user, tipo='PORTON'):
    if not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    try:
        residente = user.residente
        if residente.tipo == 'PRINCIPAL':
            return True
        if tipo == 'PORTON':
            return bool(residente.puede_abrir_porton)
        if tipo == 'PUERTA':
            return bool(residente.puede_abrir_puerta)
        return False
    except Exception:
        return False

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def abrir_porton(request):
    if not _can_open_gate(request.user, 'PORTON'):
        return Response({'detail': 'No autorizado para abrir el portón'}, status=status.HTTP_403_FORBIDDEN)
    modo = request.data.get('modo', 'PEATONAL').upper()
    placa = request.data.get('placa')
    # Aqui integrariamos con el hardware/PLC del porton
    # Por ahora devolvemos exito simulado
    return Response({'status': 'ok', 'accion': 'abierto', 'modo': modo, 'placa': placa}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cerrar_porton(request):
    if not _can_open_gate(request.user, 'PORTON'):
        return Response({'detail': 'No autorizado para cerrar el portón'}, status=status.HTTP_403_FORBIDDEN)
    modo = request.data.get('modo', 'PEATONAL').upper()
    return Response({'status': 'ok', 'accion': 'cerrado', 'modo': modo}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def abrir_puerta_peatonal(request):
    if not _can_open_gate(request.user, 'PUERTA'):
        return Response({'detail': 'No autorizado para abrir la puerta peatonal'}, status=status.HTTP_403_FORBIDDEN)
    return Response({'status': 'ok', 'accion': 'abierta', 'puerta': 'PEATONAL'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cerrar_puerta_peatonal(request):
    if not _can_open_gate(request.user, 'PUERTA'):
        return Response({'detail': 'No autorizado para cerrar la puerta peatonal'}, status=status.HTTP_403_FORBIDDEN)
    return Response({'status': 'ok', 'accion': 'cerrada', 'puerta': 'PEATONAL'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reconocimiento_facial(request):
    # Endpoint para camaras/IA: recibiria features/imagenes y retornaria match de residente.
    # MVP: aceptar documento_identidad como simulacion
    documento = request.data.get('documento_identidad')
    if not documento:
        return Response({'detail': 'documento_identidad requerido'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        residente = Residente.objects.get(documento_identidad=documento, user__is_active=True)
        return Response({'match': True, 'residente_id': residente.id, 'nombre': residente.user.get_full_name()})
    except Residente.DoesNotExist:
        return Response({'match': False}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reconocimiento_placa(request):
    # Endpoint para camara LPR: en produccion validariamos con la lista de vehiculos autorizados
    placa = request.data.get('placa')
    if not placa:
        return Response({'detail': 'placa requerida'}, status=status.HTTP_400_BAD_REQUEST)
    # MVP: devolver exito simulado
    return Response({'match': True, 'placa': placa})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if username is None or password is None:
        return Response({'error': 'Please provide both username and password'},
                      status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if not user:
        return Response({'error': 'Invalid Credentials'},
                      status=status.HTTP_401_UNAUTHORIZED)
    
    login(request, user)
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    user = request.user
    payload = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
    }
    # Adjuntar info de residente/familia si existe
    try:
        residente = user.residente
        payload['residente'] = {
            'id': residente.id,
            'documento_identidad': residente.documento_identidad,
            'tipo': residente.tipo,
            'puede_abrir_porton': residente.puede_abrir_porton,
            'puede_abrir_puerta': residente.puede_abrir_puerta,
            'puede_generar_qr_peatonal': getattr(residente, 'puede_generar_qr_peatonal', False),
            'puede_generar_qr_vehicular': getattr(residente, 'puede_generar_qr_vehicular', False),
            'familia_id': residente.familia.id if residente.familia else None,
        }
        # Incluir URL absoluta de foto de perfil si existe
        try:
            if residente.foto_perfil and hasattr(residente.foto_perfil, 'url'):
                payload['residente']['foto_perfil_url'] = request.build_absolute_uri(residente.foto_perfil.url)
        except Exception:
            pass
        if residente.familia:
            familia = residente.familia
            payload['familia'] = {
                'id': familia.id,
                'nombre': familia.nombre,
                'departamento': familia.departamento,
                'torre': familia.torre,
            }
    except Exception:
        pass
    return Response(payload)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

class ResidenteViewSet(viewsets.ModelViewSet):
    queryset = Residente.objects.all()
    serializer_class = ResidenteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Residente.objects.all()
        activo = self.request.query_params.get('activo', None)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Vehiculo.objects.all()
        tipo = self.request.query_params.get('tipo', None)
        activo = self.request.query_params.get('activo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset

class VisitanteViewSet(viewsets.ModelViewSet):
    queryset = Visitante.objects.all()
    serializer_class = VisitanteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Visitante.objects.all()
        activo = self.request.query_params.get('activo', None)
        tipo_acceso = self.request.query_params.get('tipo_acceso', None)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        if tipo_acceso:
            queryset = queryset.filter(tipo_acceso=tipo_acceso)
        return queryset

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Delivery.objects.all()
        completado = self.request.query_params.get('completado', None)
        tipo_acceso = self.request.query_params.get('tipo_acceso', None)
        if completado is not None:
            queryset = queryset.filter(completado=completado.lower() == 'true')
        if tipo_acceso:
            queryset = queryset.filter(tipo_acceso=tipo_acceso)
        return queryset

class FamiliaViewSet(viewsets.ModelViewSet):
    queryset = Familia.objects.all()
    serializer_class = FamiliaSerializer

    def get_permissions(self):
        if self.action in ['create']:
            # Admin o Residente Principal pueden crear familias
            permission_classes = [IsAdminUser | IsResidentePrincipal]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        qs = Familia.objects.all()
        if user.is_staff:
            # Admin puede buscar por nombre/departamento/torre
            search = self.request.query_params.get('search')
            if search:
                s = search.strip()
                qs = qs.filter(
                    models.Q(nombre__icontains=s) | models.Q(departamento__icontains=s) | models.Q(torre__icontains=s)
                )
            return qs
        try:
            residente = user.residente
            return qs.filter(id=residente.familia.id)
        except:
            return Familia.objects.none()

class ResidenteViewSet(viewsets.ModelViewSet):
    queryset = Residente.objects.all()
    serializer_class = ResidenteSerializer

    def get_permissions(self):
        if self.action in ['destroy']:
            permission_classes = [IsAdminUser]
        elif self.action in ['create']:
            # Admin o Residente Principal pueden crear
            permission_classes = [IsAdminUser | IsResidentePrincipal]
        elif self.action in ['update', 'partial_update']:
            # Admin puede editar a cualquiera; Principal solo dentro de su familia
            permission_classes = [IsAdminUser | (IsResidentePrincipal & IsFamilyMember)]
        else:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Residente.objects.all()
        try:
            residente = user.residente
            # Mostrar a todos los miembros de la familia para PRINCIPAL y FAMILIAR
            if getattr(residente, 'familia_id', None):
                return Residente.objects.filter(familia=residente.familia)
            # Si por alguna razn no tiene familia asociada, devolver slo su propio registro
            return Residente.objects.filter(id=residente.id)
        except:
            return Residente.objects.none()

    def _validate_permission_changes(self, request, instance, data):
        """
        Principales no pueden modificar permisos de otro PRINCIPAL.
        Solo staff puede hacerlo.
        """
        if request.user.is_staff:
            return
        # Si el target es principal y se intenta tocar flags, rechazar
        target_is_principal = getattr(instance, 'tipo', None) == 'PRINCIPAL'
        touching_flags = any(k in data for k in ['puede_abrir_porton', 'puede_abrir_puerta', 'puede_generar_qr_peatonal', 'puede_generar_qr_vehicular', 'puede_reservar_areas'])
        if target_is_principal and touching_flags:
            raise PermissionDenied('No puedes modificar permisos de un residente principal')
    # No permitir a un PRINCIPAL desactivar a otro PRINCIPAL (via is_active del User)
        user_payload = data.get('user') or {}
        if target_is_principal and ('is_active' in user_payload):
            raise PermissionDenied('No puedes desactivar a un residente principal')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self._validate_permission_changes(request, instance, request.data)
        # Principales no pueden cambiar familia ni tipo
        if not request.user.is_staff:
            data = request.data.copy()
            # Forzar misma familia
            if 'familia' in data:
                data.pop('familia')
            # Evitar cambio de tipo
            if 'tipo' in data:
                data.pop('tipo')
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().update(request, *args, partial=partial, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._validate_permission_changes(request, instance, request.data)
    # Reusar la misma logica que update para saneo de campos
        return self.update(request, partial=True, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def me(self, request):
        try:
            residente = request.user.residente
            serializer = self.get_serializer(residente)
            return Response(serializer.data)
        except:
            return Response(
                {"detail": "No se encontró el perfil de residente"},
                status=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        """Restringe creación a familia del principal y tipo FAMILIAR para no-staff."""
        user = self.request.user
        if user.is_staff:
            serializer.save()
            return
        try:
            creador = user.residente
        except Exception:
            raise PermissionDenied('Solo residentes principales pueden crear familiares')
        if creador.tipo != 'PRINCIPAL':
            raise PermissionDenied('Solo residentes principales pueden crear familiares')
        if not creador.familia_id:
            raise PermissionDenied('No tienes una familia asociada')
        # Forzar asociar a su familia y como FAMILIAR
        serializer.save(familia=creador.familia, tipo='FAMILIAR')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
    # Si es residente y esta inactivo, bloquear login
        # Bloquear por usuario inactivo a nivel User
        if not user.is_active:
            raise AuthenticationFailed('Tu acceso fue desactivado. Contacta al administrador.')
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class VisitanteViewSet(viewsets.ModelViewSet):
    queryset = Visitante.objects.all()
    serializer_class = VisitanteSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [CanManageVisitors]
        else:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            qs = Residente.objects.select_related('user', 'familia').all()
            # Admin: filtros de busqueda y tipo
            search = self.request.query_params.get('search')
            if search:
                s = search.strip()
                qs = qs.filter(
                    models.Q(user__first_name__icontains=s) |
                    models.Q(user__last_name__icontains=s) |
                    models.Q(user__username__icontains=s) |
                    models.Q(documento_identidad__icontains=s) |
                    models.Q(familia__nombre__icontains=s) |
                    models.Q(familia__departamento__icontains=s) |
                    models.Q(familia__torre__icontains=s)
                )
            tipo = self.request.query_params.get('tipo')  # 'PRINCIPAL' o 'FAMILIAR'
            if tipo in ['PRINCIPAL', 'FAMILIAR']:
                qs = qs.filter(tipo=tipo)
            familia_id = self.request.query_params.get('familia')
            if familia_id:
                qs = qs.filter(familia_id=familia_id)
            activo = self.request.query_params.get('activo')
            if activo is not None:
                qs = qs.filter(activo=(str(activo).lower() == 'true'))
            return qs
        try:
            residente = user.residente
            return Visitante.objects.filter(
                autorizacionvisita__familia=residente.familia
            ).distinct()
        except:
            return Visitante.objects.none()

class AutorizacionVisitaViewSet(viewsets.ModelViewSet):
    queryset = AutorizacionVisita.objects.all()
    serializer_class = AutorizacionVisitaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'cancelar', 'generar_qr']:
            permission_classes = [CanManageVisitors]
        else:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            qs = AutorizacionVisita.objects.select_related('visitante', 'autorizado_por', 'familia')
        else:
            try:
                residente = user.residente
                qs = AutorizacionVisita.objects.select_related('visitante', 'autorizado_por', 'familia').filter(familia=residente.familia)
            except:
                qs = AutorizacionVisita.objects.none()

        # Refrescar estados vencidos al consultar (si siguen marcadas ACTIVA pero ya pasaron)
        now = djtz.now()
        try:
            AutorizacionVisita.objects.filter(
                id__in=qs.values('id'), status='ACTIVA', fecha_fin__lt=now
            ).update(status='VENCIDA')
        except Exception:
            pass

        # Filtros opcionales
        familia_id = self.request.query_params.get('familia_id')
        status_f = self.request.query_params.get('status')
        vigente = self.request.query_params.get('vigente')
        search_q = self.request.query_params.get('q')
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')

        if familia_id:
            qs = qs.filter(familia_id=familia_id)
        if status_f:
            qs = qs.filter(status=status_f)
        if vigente is not None:
            # vigente=true => now between inicio and fin; vigente=false => fuera del rango
            if vigente.lower() == 'true':
                qs = qs.filter(fecha_inicio__lte=now, fecha_fin__gte=now)
            elif vigente.lower() == 'false':
                qs = qs.exclude(fecha_inicio__lte=now, fecha_fin__gte=now)
        if search_q:
            s = search_q.strip()
            qs = qs.filter(
                models.Q(visitante__nombre_completo__icontains=s) |
                models.Q(visitante__documento_identidad__icontains=s) |
                models.Q(autorizado_por__user__first_name__icontains=s) |
                models.Q(autorizado_por__user__last_name__icontains=s) |
                models.Q(autorizado_por__documento_identidad__icontains=s)
            )
        # Rango de fechas (por fecha_creacion o vigencia)
        from datetime import datetime as _dt
        def _parse_date(d):
            try:
                return _dt.fromisoformat(d)
            except Exception:
                return None
        if desde:
            d = _parse_date(desde)
            if d:
                qs = qs.filter(fecha_creacion__gte=d)
        if hasta:
            h = _parse_date(hasta)
            if h:
                qs = qs.filter(fecha_creacion__lte=h)

        return qs

    def perform_create(self, serializer):
        serializer.save(autorizado_por=self.request.user.residente)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        autorizacion = self.get_object()
        if autorizacion.status not in ['USADA', 'VENCIDA', 'CANCELADA']:
            autorizacion.status = 'CANCELADA'
            autorizacion.save()
            return Response({'status': 'Autorización cancelada'})
        return Response(
            {'error': 'No se puede cancelar esta autorización'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['post'], url_path='generar-qr')
    def generar_qr(self, request):
        """Crear visitante + autorización con QR y límites de uso/tiempo."""
        try:
            residente = request.user.residente
        except Exception:
            return Response({'error': 'Residente no válido'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data or {}
        nombre = data.get('nombre_completo')
        documento = data.get('documento_identidad')  # opcional
        tipo_acceso = (data.get('tipo_acceso') or 'P').upper()
        entradas = int(data.get('entradas_permitidas', 1))
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        duracion_min = data.get('duracion_min')

        if not nombre:
            return Response({'error': 'nombre_completo es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        # documento_identidad es opcional; no generamos temporales

        # Validar permisos por tipo
        if residente.tipo != 'PRINCIPAL':
            if tipo_acceso == 'P' and not getattr(residente, 'puede_generar_qr_peatonal', False):
                return Response({'error': 'No autorizado a generar QR peatonal'}, status=status.HTTP_403_FORBIDDEN)
            if tipo_acceso == 'V' and not getattr(residente, 'puede_generar_qr_vehicular', False):
                return Response({'error': 'No autorizado a generar QR vehicular'}, status=status.HTTP_403_FORBIDDEN)

        # Crear o usar visitante temporal
        visitante = Visitante.objects.create(
            nombre_completo=nombre,
            documento_identidad=documento or None,
            tipo_acceso=tipo_acceso,
            autorizado_por=residente,
            fecha_inicio=djtz.now(),
            fecha_fin=djtz.now(),
            activo=False,
        )

        # Rango de validez
        def _parse_iso_local(s):
            try:
                dt = datetime.fromisoformat(s)
                # Asumimos hora local; hacerla timezone-aware
                return djtz.make_aware(dt) if djtz.is_naive(dt) else dt
            except Exception:
                return None

        inicio = djtz.now() if not fecha_inicio else _parse_iso_local(fecha_inicio)
        if inicio is None:
            return Response({'error': 'fecha_inicio inválida'}, status=status.HTTP_400_BAD_REQUEST)

        if duracion_min and not fecha_fin:
            fin = inicio + timedelta(minutes=int(duracion_min))
        else:
            fin = djtz.now() + timedelta(hours=4) if not fecha_fin else _parse_iso_local(fecha_fin)
        if fin is None:
            return Response({'error': 'fecha_fin inválida'}, status=status.HTTP_400_BAD_REQUEST)
        if fin <= inicio:
            return Response({'error': 'fecha_fin debe ser mayor a fecha_inicio'}, status=status.HTTP_400_BAD_REQUEST)

        auth = AutorizacionVisita.objects.create(
            visitante=visitante,
            autorizado_por=residente,
            familia=residente.familia,
            fecha_inicio=inicio,
            fecha_fin=fin,
            status='ACTIVA',
            entradas_permitidas=max(1, entradas),
        )
    # Generar imagen PNG del QR con el codigo unico de autorizacion
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(auth.codigo_qr)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format='PNG')
        png_b64 = b64encode(buf.getvalue()).decode('utf-8')
        auth.qr_image = f"data:image/png;base64,{png_b64}"
        auth.save(update_fields=['qr_image'])

        return Response(AutorizacionVisitaSerializer(auth).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def validar_qr(request):
    """Validación/consumo de QR por cámaras o guardia. Gestiona entrada/salida y uso."""
    codigo_qr = request.data.get('codigo_qr')
    evento = request.data.get('evento', 'ENTRADA')  # ENTRADA | SALIDA
    modalidad = request.data.get('modalidad', 'PEATONAL')  # PEATONAL | VEHICULAR

    if not codigo_qr:
        return Response({'error': 'codigo_qr requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        auth = AutorizacionVisita.objects.select_related('visitante').get(codigo_qr=codigo_qr)
    except AutorizacionVisita.DoesNotExist:
        return Response({'match': False, 'reason': 'QR no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    now = djtz.now()
    if auth.status != 'ACTIVA':
        return Response({'match': False, 'reason': f'Estado {auth.status}'}, status=status.HTTP_400_BAD_REQUEST)
    if not (auth.fecha_inicio <= now <= auth.fecha_fin):
        auth.status = 'VENCIDA'
        auth.save(update_fields=['status'])
        return Response({'match': False, 'reason': 'Vencida'}, status=status.HTTP_400_BAD_REQUEST)

    # Logica de entrada/salida por turnos, consumiendo entradas
    if evento == 'ENTRADA':
        if auth.dentro:
            return Response({'match': False, 'reason': 'QR ya está dentro'}, status=status.HTTP_400_BAD_REQUEST)
        if auth.entradas_consumidas >= auth.entradas_permitidas:
            return Response({'match': False, 'reason': 'Usos agotados'}, status=status.HTTP_400_BAD_REQUEST)
        auth.dentro = True
        auth.entradas_consumidas += 1
        auth.save(update_fields=['dentro', 'entradas_consumidas'])
        # Registrar acceso
        RegistroAcceso.objects.create(
            tipo_persona='V', tipo_verificacion='C', persona_id=auth.visitante.id,
            exitoso=True, detalles={'codigo_qr': auth.codigo_qr}, vehiculo=None
        )
        return Response({'match': True, 'accion': 'ENTRADA', 'restantes': auth.entradas_permitidas - auth.entradas_consumidas})
    elif evento == 'SALIDA':
        if not auth.dentro:
            return Response({'match': False, 'reason': 'No está dentro'}, status=status.HTTP_400_BAD_REQUEST)
        auth.dentro = False
    # Si ya no quedan entradas por consumir y salio, marcar utilizada
        if auth.entradas_consumidas >= auth.entradas_permitidas:
            auth.status = 'UTILIZADA'
        auth.save(update_fields=['dentro', 'status'])
        RegistroAcceso.objects.create(
            tipo_persona='V', tipo_verificacion='C', persona_id=auth.visitante.id,
            exitoso=True, detalles={'codigo_qr': auth.codigo_qr, 'evento': 'SALIDA'}, vehiculo=None
        )
        return Response({'match': True, 'accion': 'SALIDA', 'status': auth.status})
    else:
        return Response({'error': 'Evento inválido'}, status=status.HTTP_400_BAD_REQUEST)

class RegistroAccesoViewSet(viewsets.ModelViewSet):
    queryset = RegistroAcceso.objects.all()
    serializer_class = RegistroAccesoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated, IsFamilyMember]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return RegistroAcceso.objects.all()
        try:
            residente = user.residente
            return RegistroAcceso.objects.filter(
                models.Q(residente=residente) |
                models.Q(autorizacion__familia=residente.familia)
            )
        except:
            return RegistroAcceso.objects.none()

    def perform_create(self, serializer):
        serializer.save(verificado_por=self.request.user)

    @action(detail=False, methods=['post'])
    def registrar_acceso(self, request):
        try:
            tipo_acceso = request.data.get('tipo_acceso')
            modalidad = request.data.get('modalidad')
            codigo_qr = request.data.get('codigo_qr')
            
            if not all([tipo_acceso, modalidad]):
                return Response(
                    {'error': 'Tipo de acceso y modalidad son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Si se proporciona codigo QR, buscar autorizacion
            if codigo_qr:
                try:
                    autorizacion = AutorizacionVisita.objects.get(
                        codigo_qr=codigo_qr,
                        status='ACTIVA'
                    )
                    # Verificar que la autorizacion este vigente
                    if timezone.now() > autorizacion.fecha_fin:
                        autorizacion.status = 'VENCIDA'
                        autorizacion.save()
                        return Response(
                            {'error': 'La autorización ha vencido'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Crear registro de acceso para visitante
                    registro = RegistroAcceso.objects.create(
                        visitante=autorizacion.visitante,
                        autorizacion=autorizacion,
                        tipo_acceso=tipo_acceso,
                        modalidad=modalidad,
                        verificado_por=request.user
                    )
                    
                    # Si es salida, marcar la autorizacion como usada
                    if tipo_acceso == 'SALIDA':
                        autorizacion.status = 'USADA'
                        autorizacion.save()
                    
                    return Response(
                        RegistroAccesoSerializer(registro).data,
                        status=status.HTTP_201_CREATED
                    )
                    
                except AutorizacionVisita.DoesNotExist:
                    return Response(
                        {'error': 'Autorización no encontrada o inválida'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Si no hay codigo QR, debe ser un residente
            residente_id = request.data.get('residente_id')
            try:
                residente = Residente.objects.get(id=residente_id, user__is_active=True)
                registro = RegistroAcceso.objects.create(
                    residente=residente,
                    tipo_acceso=tipo_acceso,
                    modalidad=modalidad,
                    verificado_por=request.user
                )
                return Response(
                    RegistroAccesoSerializer(registro).data,
                    status=status.HTTP_201_CREATED
                )
            except Residente.DoesNotExist:
                return Response(
                    {'error': 'Residente no encontrado o inactivo'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# =========================
# Areas comunes
# =========================


    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        try:
            fecha_inicio = request.query_params.get('fecha_inicio', timezone.now().date())
            fecha_fin = request.query_params.get('fecha_fin', timezone.now().date())
            
            if isinstance(fecha_inicio, str):
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            if isinstance(fecha_fin, str):
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            
            # Obtener registros del periodo
            registros = self.get_queryset().filter(
                fecha_hora__date__range=[fecha_inicio, fecha_fin]
            )
            
            stats = {
                'total_accesos': registros.count(),
                'entradas': registros.filter(tipo_acceso='ENTRADA').count(),
                'salidas': registros.filter(tipo_acceso='SALIDA').count(),
                'accesos_residentes': registros.filter(residente__isnull=False).count(),
                'accesos_visitantes': registros.filter(visitante__isnull=False).count(),
                'por_modalidad': {
                    'peatonal': registros.filter(modalidad='PEATONAL').count(),
                    'vehicular': registros.filter(modalidad='VEHICULAR').count(),
                },
                'por_hora': {}
            }
            
            # Calcular accesos por hora
            for hora in range(24):
                count = registros.filter(fecha_hora__hour=hora).count()
                stats['por_hora'][f"{hora:02d}:00"] = count
            
            return Response(stats)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
