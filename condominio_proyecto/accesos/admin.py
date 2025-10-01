from django.contrib import admin
from .models import (
    Familia, Residente, Vehiculo, Visitante, Delivery, RegistroAcceso,
)

@admin.register(Residente)
class ResidenteAdmin(admin.ModelAdmin):
    list_display = ('user', 'documento_identidad', 'activo', 'fecha_registro')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'documento_identidad')
    list_filter = ('activo', 'fecha_registro')

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('matricula', 'marca', 'modelo', 'tipo', 'residente', 'activo')
    search_fields = ('matricula', 'marca', 'modelo', 'residente__user__username')
    list_filter = ('tipo', 'activo', 'fecha_registro')

@admin.register(Visitante)
class VisitanteAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'documento_identidad', 'tipo_acceso', 'autorizado_por', 'fecha_inicio', 'fecha_fin', 'activo')
    search_fields = ('nombre_completo', 'documento_identidad', 'autorizado_por__user__username')
    list_filter = ('tipo_acceso', 'activo', 'fecha_inicio', 'fecha_fin')

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'empresa', 'tipo_acceso', 'autorizado_por', 'fecha_hora', 'tiempo_estimado', 'completado')
    search_fields = ('nombre_completo', 'empresa', 'documento_identidad', 'autorizado_por__user__username')
    list_filter = ('tipo_acceso', 'completado', 'fecha_hora')

@admin.register(RegistroAcceso)
class RegistroAccesoAdmin(admin.ModelAdmin):
    list_display = ('fecha_hora', 'tipo_persona', 'tipo_verificacion', 'exitoso')
    search_fields = ('persona_id', 'detalles')
    list_filter = ('tipo_persona', 'tipo_verificacion', 'exitoso', 'fecha_hora')


    # Area models administered in 'areas' app

@admin.register(Familia)
class FamiliaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'torre', 'departamento', 'activo', 'fecha_creacion')
    search_fields = ('nombre', 'torre', 'departamento')
    list_filter = ('activo', 'torre', 'fecha_creacion')
