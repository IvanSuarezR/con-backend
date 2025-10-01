from django.contrib import admin
from .models import AreaComun, UnidadArea, TurnoArea, ReservaArea


@admin.register(AreaComun)
class AreaComunAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'activo')
    list_filter = ('tipo', 'activo')
    search_fields = ('nombre',)


@admin.register(UnidadArea)
class UnidadAreaAdmin(admin.ModelAdmin):
    list_display = ('area', 'nombre', 'activo')
    list_filter = ('area', 'activo')
    search_fields = ('nombre', 'area__nombre')


@admin.register(TurnoArea)
class TurnoAreaAdmin(admin.ModelAdmin):
    list_display = ('area', 'titulo', 'fecha_inicio', 'fecha_fin', 'capacidad', 'activo')
    list_filter = ('area', 'activo')
    search_fields = ('titulo', 'area__nombre')


@admin.register(ReservaArea)
class ReservaAreaAdmin(admin.ModelAdmin):
    list_display = ('area', 'residente', 'estado', 'fecha_creacion', 'unidad', 'turno', 'cupos')
    list_filter = ('area', 'estado', 'fecha_creacion')
    search_fields = ('residente__user__username', 'area__nombre')
