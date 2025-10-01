from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ResidenteViewSet, VehiculoViewSet,
    VisitanteViewSet, DeliveryViewSet, RegistroAccesoViewSet,
    FamiliaViewSet, AutorizacionVisitaViewSet, me_view,
    abrir_porton, cerrar_porton, reconocimiento_facial, reconocimiento_placa,
    abrir_puerta_peatonal, cerrar_puerta_peatonal, validar_qr, admin_metrics
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'residentes', ResidenteViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'visitantes', VisitanteViewSet)
router.register(r'deliveries', DeliveryViewSet)
router.register(r'registros-acceso', RegistroAccesoViewSet)
router.register(r'familias', FamiliaViewSet)
router.register(r'autorizaciones', AutorizacionVisitaViewSet)

urlpatterns = [
    # Colocar 'users/me' ANTES de incluir las rutas del router para evitar que coincida con 'users/<pk>/'
    path('users/me/', me_view, name='users_me'),
    # Control de porton
    path('porton/abrir/', abrir_porton, name='porton_abrir'),
    path('porton/cerrar/', cerrar_porton, name='porton_cerrar'),
    path('puerta/abrir/', abrir_puerta_peatonal, name='puerta_abrir'),
    path('puerta/cerrar/', cerrar_puerta_peatonal, name='puerta_cerrar'),
    # Integraciones IA (simuladas)
    path('ia/peatonal/reconocer/', reconocimiento_facial, name='ia_reconocer_facial'),
    path('ia/vehicular/placa/', reconocimiento_placa, name='ia_reconocer_placa'),
    path('ia/qr/validar/', validar_qr, name='ia_validar_qr'),
    # Metricas admin
    path('admin/metrics/', admin_metrics, name='admin_metrics'),
    path('auth/', include('accesos.authentication_urls')),
    path('', include(router.urls)),
]
