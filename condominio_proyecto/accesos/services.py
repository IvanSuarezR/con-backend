from django.utils import timezone
from datetime import timedelta
from .models import (
    AutorizacionVisita, RegistroAcceso, Visitante,
    ConfiguracionAcceso
)
from .notification_service import NotificacionService
from django.db.models import Q
from rest_framework.exceptions import ValidationError
import qrcode
import base64
from io import BytesIO

class AutorizacionService:
    @staticmethod
    def generar_codigo_qr(autorizacion):
        """Genera un código QR para una autorización"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Datos para el QR
        data = {
            'id': str(autorizacion.id),
            'codigo': autorizacion.codigo_qr,
            'visitante': f"{autorizacion.visitante.nombre} {autorizacion.visitante.apellidos}",
            'tipo_acceso': autorizacion.tipo_acceso,
            'validez': autorizacion.fecha_fin.isoformat()
        }
        
        qr.add_data(str(data))
        qr.make(fit=True)

        # Crear imagen
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()

    @staticmethod
    def crear_autorizacion(data, residente):
        """Crea una nueva autorización de visita"""
        # Validar fechas
        fecha_inicio = data['fecha_inicio']
        fecha_fin = data['fecha_fin']
        
        if fecha_inicio >= fecha_fin:
            raise ValidationError("La fecha de inicio debe ser anterior a la fecha fin")
        
        if fecha_inicio < timezone.now():
            raise ValidationError("La fecha de inicio no puede ser en el pasado")
        
    # Verificar limite de autorizaciones activas por familia
        autorizaciones_activas = AutorizacionVisita.objects.filter(
            familia=residente.familia,
            status='ACTIVA'
        ).count()
        
        limite_autorizaciones = ConfiguracionAcceso.get_valor('MAX_AUTORIZACIONES_POR_FAMILIA', 10)
        if autorizaciones_activas >= limite_autorizaciones:
            raise ValidationError(
                f"Se ha alcanzado el límite de {limite_autorizaciones} autorizaciones activas por familia"
            )

        # Crear o actualizar visitante
        visitante_data = data.pop('visitante')
        visitante, created = Visitante.objects.get_or_create(
            tipo_documento=visitante_data['tipo_documento'],
            numero_documento=visitante_data['numero_documento'],
            defaults={
                'nombre': visitante_data['nombre'],
                'apellidos': visitante_data['apellidos'],
                'telefono': visitante_data.get('telefono', '')
            }
        )

    # Crear autorizacion
        autorizacion = AutorizacionVisita.objects.create(
            visitante=visitante,
            familia=residente.familia,
            autorizado_por=residente,
            **data
        )

    # Generar codigo QR
        autorizacion.qr_image = AutorizacionService.generar_codigo_qr(autorizacion)
        autorizacion.save()

    # Enviar notificacion
        NotificacionService.notificar_autorizacion_creada(autorizacion)

        return autorizacion

    @staticmethod
    def verificar_autorizacion(codigo_qr, tipo_acceso='ENTRADA'):
        """Verifica si una autorización es válida y registra el acceso"""
        try:
            autorizacion = AutorizacionVisita.objects.get(
                codigo_qr=codigo_qr,
                status='ACTIVA'
            )
            
            ahora = timezone.now()
            
            # Verificar vigencia
            if ahora > autorizacion.fecha_fin:
                # Verificar tiempo de gracia para salidas
                tiempo_gracia = ConfiguracionAcceso.get_valor('TIEMPO_GRACIA_SALIDA', 30)
                tiempo_excedido = (ahora - autorizacion.fecha_fin).total_seconds() / 60
                
                if tipo_acceso == 'SALIDA' and tiempo_excedido <= tiempo_gracia:
                    # Permitir salida dentro del tiempo de gracia
                    pass
                else:
                    autorizacion.status = 'VENCIDA'
                    autorizacion.save()
                    # Enviar notificacion de vencimiento
                    NotificacionService.notificar_autorizacion_vencida(autorizacion)
                    raise ValidationError("La autorización ha vencido")
            
            # Verificar si ya hay una entrada sin salida
            ultimo_registro = RegistroAcceso.objects.filter(
                autorizacion=autorizacion
            ).order_by('-fecha_hora').first()
            
            if ultimo_registro:
                if tipo_acceso == 'ENTRADA' and ultimo_registro.tipo_acceso == 'ENTRADA':
                    NotificacionService.notificar_acceso_denegado(autorizacion, "Ya existe un registro de entrada sin salida")
                    raise ValidationError("Ya existe un registro de entrada sin salida")
                elif tipo_acceso == 'SALIDA' and ultimo_registro.tipo_acceso == 'SALIDA':
                    NotificacionService.notificar_acceso_denegado(autorizacion, "No hay un registro de entrada previo")
                    raise ValidationError("No hay un registro de entrada previo")
            elif tipo_acceso == 'SALIDA':
                NotificacionService.notificar_acceso_denegado(autorizacion, "No hay un registro de entrada previo")
                raise ValidationError("No hay un registro de entrada previo")
            
            # Crear registro de acceso
            registro = RegistroAcceso.objects.create(
                autorizacion=autorizacion,
                tipo_persona='V',  # Visitante
                tipo_acceso=tipo_acceso,
                tipo_verificacion='C',  # Credencial/QR
                exitoso=True,
                detalles={
                    'metodo': 'QR',
                    'fecha_validez': autorizacion.fecha_fin.isoformat()
                }
            )
            
            # Si es una salida y no hay mas entradas pendientes, marcar como utilizada
            if tipo_acceso == 'SALIDA':
                entradas_pendientes = RegistroAcceso.objects.filter(
                    autorizacion=autorizacion,
                    tipo_acceso='ENTRADA'
                ).count() <= RegistroAcceso.objects.filter(
                    autorizacion=autorizacion,
                    tipo_acceso='SALIDA'
                ).count()
                
                if entradas_pendientes:
                    autorizacion.status = 'UTILIZADA'
                    autorizacion.save()
            
            return {
                'autorizacion': autorizacion,
                'registro': registro,
                'mensaje': f"Acceso {'de entrada' if tipo_acceso == 'ENTRADA' else 'de salida'} registrado correctamente"
            }
            
        except AutorizacionVisita.DoesNotExist:
            raise ValidationError("Autorización no encontrada o inválida")

    @staticmethod
    def extender_autorizacion(autorizacion, horas=None, nueva_fecha=None):
        """Extiende la vigencia de una autorización"""
        if autorizacion.status != 'ACTIVA':
            raise ValidationError("Solo se pueden extender autorizaciones activas")

    # Obtener limite de horas para extension
        max_horas_extension = ConfiguracionAcceso.get_valor('MAX_HORAS_EXTENSION', 24)

        if horas:
            if horas > max_horas_extension:
                raise ValidationError(
                    f"No se puede extender por más de {max_horas_extension} horas"
                )
            nueva_fecha_fin = autorizacion.fecha_fin + timedelta(hours=horas)
        elif nueva_fecha:
            if isinstance(nueva_fecha, str):
                try:
                    nueva_fecha = timezone.datetime.strptime(
                        nueva_fecha, '%Y-%m-%d %H:%M:%S'
                    ).replace(tzinfo=timezone.get_current_timezone())
                except ValueError:
                    raise ValidationError("Formato de fecha inválido")
            
            # Calcular la diferencia en horas
            diff_horas = (nueva_fecha - autorizacion.fecha_fin).total_seconds() / 3600
            if diff_horas > max_horas_extension:
                raise ValidationError(
                    f"La extensión excede el límite de {max_horas_extension} horas"
                )
            nueva_fecha_fin = nueva_fecha
        else:
            raise ValidationError("Debe especificar horas o nueva fecha")

        if nueva_fecha_fin <= timezone.now():
            raise ValidationError("La nueva fecha de fin debe ser futura")

        # Calcular horas extendidas
        horas_extendidas = round((nueva_fecha_fin - autorizacion.fecha_fin).total_seconds() / 3600)
        
        autorizacion.fecha_fin = nueva_fecha_fin
        autorizacion.save()

    # Enviar notificacion
        NotificacionService.notificar_autorizacion_extendida(autorizacion, horas_extendidas)

        return autorizacion

    @staticmethod
    def obtener_autorizaciones_por_estado(familia, estado=None, fecha_inicio=None, fecha_fin=None):
        """Obtiene las autorizaciones filtradas por estado y rango de fechas"""
        queryset = AutorizacionVisita.objects.filter(familia=familia)
        
        if estado:
            queryset = queryset.filter(status=estado)
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_inicio__gte=fecha_inicio)
        
        if fecha_fin:
            queryset = queryset.filter(fecha_fin__lte=fecha_fin)
        
        return queryset.order_by('-fecha_creacion')

    @staticmethod
    def cancelar_autorizaciones_vencidas():
        """Cancela automáticamente las autorizaciones vencidas"""
        return AutorizacionVisita.objects.filter(
            status='ACTIVA',
            fecha_fin__lt=timezone.now()
        ).update(status='VENCIDA')