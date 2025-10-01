from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AreaComunViewSet, UnidadAreaViewSet, TurnoAreaViewSet, ReservaAreaViewSet

router = DefaultRouter()
router.register(r'areas', AreaComunViewSet)
router.register(r'unidades-area', UnidadAreaViewSet)
router.register(r'turnos-area', TurnoAreaViewSet)
router.register(r'reservas-area', ReservaAreaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
