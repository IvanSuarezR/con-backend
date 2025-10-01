from django.utils import timezone
from django.db.models import Q
from notificaciones.models import Notificacion
from .models import AutorizacionVisita

class NotificacionService:
    @staticmethod
    def crear_notificacion(residente, tipo, mensaje, datos_extra=None):
        """Crea una nueva notificación"""
        return Notificacion.objects.create(
            residente=residente,
            tipo=tipo,
            mensaje=mensaje,
            datos_extra=datos_extra
        )

    @staticmethod
    def notificar_autorizacion_creada(autorizacion):
        """Notifica cuando se crea una nueva autorización"""
        mensaje = (
            f"Se ha creado una nueva autorización para {autorizacion.visitante.nombre_completo}. "
            f"Válida desde {autorizacion.fecha_inicio.strftime('%d/%m/%Y %H:%M')} "
            f"hasta {autorizacion.fecha_fin.strftime('%d/%m/%Y %H:%M')}"
        )
        return NotificacionService.crear_notificacion(
            residente=autorizacion.autorizado_por,
            tipo='AUTORIZACION_CREADA',
            mensaje=mensaje,
            datos_extra={
                'autorizacion_id': autorizacion.id,
                'visitante_id': autorizacion.visitante.id,
                'fecha_inicio': autorizacion.fecha_inicio.isoformat(),
                'fecha_fin': autorizacion.fecha_fin.isoformat()
            }
        )

    @staticmethod
    def notificar_autorizacion_extendida(autorizacion, horas_extendidas):
        """Notifica cuando se extiende una autorización"""
        mensaje = (
            f"La autorización para {autorizacion.visitante.nombre_completo} ha sido extendida "
            f"por {horas_extendidas} horas. Nueva fecha de vencimiento: "
            f"{autorizacion.fecha_fin.strftime('%d/%m/%Y %H:%M')}"
        )
        return NotificacionService.crear_notificacion(
            residente=autorizacion.autorizado_por,
            tipo='AUTORIZACION_EXTENDIDA',
            mensaje=mensaje,
            datos_extra={
                'autorizacion_id': autorizacion.id,
                'horas_extendidas': horas_extendidas,
                'nueva_fecha_fin': autorizacion.fecha_fin.isoformat()
            }
        )

    @staticmethod
    def notificar_autorizacion_vencida(autorizacion):
        """Notifica cuando una autorización vence"""
        mensaje = (
            f"La autorización para {autorizacion.visitante.nombre_completo} "
            f"ha vencido el {autorizacion.fecha_fin.strftime('%d/%m/%Y %H:%M')}"
        )
        return NotificacionService.crear_notificacion(
            residente=autorizacion.autorizado_por,
            tipo='AUTORIZACION_VENCIDA',
            mensaje=mensaje,
            datos_extra={
                'autorizacion_id': autorizacion.id,
                'visitante_id': autorizacion.visitante.id,
                'fecha_vencimiento': autorizacion.fecha_fin.isoformat()
            }
        )

    @staticmethod
    def notificar_acceso_denegado(autorizacion, motivo):
        """Notifica cuando se deniega un acceso"""
        mensaje = (
            f"Acceso denegado para {autorizacion.visitante.nombre_completo}. "
            f"Motivo: {motivo}"
        )
        return NotificacionService.crear_notificacion(
            residente=autorizacion.autorizado_por,
            tipo='ACCESO_DENEGADO',
            mensaje=mensaje,
            datos_extra={
                'autorizacion_id': autorizacion.id,
                'visitante_id': autorizacion.visitante.id,
                'motivo': motivo,
                'fecha': timezone.now().isoformat()
            }
        )

    @staticmethod
    def obtener_notificaciones(residente, solo_no_leidas=False, limit=None):
        """Obtiene las notificaciones de un residente"""
        queryset = Notificacion.objects.filter(residente=residente)
        if solo_no_leidas:
            queryset = queryset.filter(leida=False)
        if limit:
            queryset = queryset[:limit]
        return queryset

    @staticmethod
    def marcar_notificaciones_como_leidas(residente, ids=None):
        """Marca notificaciones como leídas"""
        queryset = Notificacion.objects.filter(residente=residente, leida=False)
        if ids:
            queryset = queryset.filter(id__in=ids)
        
        now = timezone.now()
        return queryset.update(leida=True, fecha_lectura=now)

    @staticmethod
    def eliminar_notificaciones_antiguas(dias=30):
        """Elimina notificaciones más antiguas que el número de días especificado"""
        fecha_limite = timezone.now() - timezone.timedelta(days=dias)
        return Notificacion.objects.filter(
            Q(fecha_creacion__lt=fecha_limite),
            Q(leida=True) | Q(tipo='AUTORIZACION_VENCIDA')
        ).delete()