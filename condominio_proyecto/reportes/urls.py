from django.urls import path
from . import views

urlpatterns = [
    path('reportes/residentes/', views.reporte_residentes, name='reporte_residentes'),
    path('reportes/familias/', views.reporte_familias, name='reporte_familias'),
    path('reportes/accesos/', views.reporte_accesos, name='reporte_accesos'),
    path('reportes/reservas/', views.reporte_reservas, name='reporte_reservas'),
    path('reportes/visitas/', views.reporte_visitas, name='reporte_visitas'),
]
