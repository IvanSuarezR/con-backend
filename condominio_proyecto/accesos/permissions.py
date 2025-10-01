from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)

class IsResidentePrincipal(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            return request.user.residente.tipo == 'PRINCIPAL'
        except:
            return False

    def has_object_permission(self, request, view, obj):
        try:
            return obj.familia == request.user.residente.familia
        except:
            return False

class IsFamilyMember(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and (request.user.is_staff or hasattr(request.user, 'residente')))

    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todos los objetos
        if request.user and request.user.is_staff:
            return True
        try:
            if hasattr(obj, 'familia'):
                return obj.familia == request.user.residente.familia
            if hasattr(obj, 'residente'):
                return obj.residente.familia == request.user.residente.familia
            return False
        except:
            return False

class CanManageVisitors(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            residente = request.user.residente
            # Admin ya pasa via IsAdminUser si corresponde
            if residente.tipo == 'PRINCIPAL':
                return True
            # Para familiares: requerir banderas especificas segun accion/tipo
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                # Ver listados de su familia
                return True
            # Para crear/generar/cancelar, chequear tipo_acceso
            data = request.data or {}
            tipo = (data.get('tipo_acceso') or data.get('modalidad') or '').upper()
            if hasattr(view, 'action') and view.action == 'generar_qr':
                # usa tipo_acceso P/V
                if tipo == 'P':
                    return bool(getattr(residente, 'puede_generar_qr_peatonal', False))
                if tipo == 'V':
                    return bool(getattr(residente, 'puede_generar_qr_vehicular', False))
                # si no especifica, permitir si tiene cualquiera
                return bool(getattr(residente, 'puede_generar_qr_peatonal', False) or getattr(residente, 'puede_generar_qr_vehicular', False))
            # Para create/update/delete en ViewSets: revisar tipo_acceso si viene
            if tipo == 'P':
                return bool(getattr(residente, 'puede_generar_qr_peatonal', False))
            if tipo == 'V':
                return bool(getattr(residente, 'puede_generar_qr_vehicular', False))
            return bool(getattr(residente, 'puede_generar_qr_peatonal', False) or getattr(residente, 'puede_generar_qr_vehicular', False))
        except:
            return False

    def has_object_permission(self, request, view, obj):
        try:
            return obj.familia == request.user.residente.familia
        except:
            return False