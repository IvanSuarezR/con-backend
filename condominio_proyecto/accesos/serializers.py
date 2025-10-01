from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Residente, Vehiculo, Visitante, Delivery, RegistroAcceso,
    Familia, AutorizacionVisita
)
from notificaciones.models import Notificacion

class UserSerializer(serializers.ModelSerializer):
    # Permitir establecer la contrasena; requerida solo en creacion
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    # Exponer is_staff solo lectura (no permitir que se asigne desde el formulario de residente)
    is_staff = serializers.BooleanField(read_only=True)
    # Permitir gestionar is_active desde UI (por ejemplo, desactivar usuario)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'password', 'is_staff', 'is_active')
        extra_kwargs = {
            # Evitar falso positivo del UniqueValidator en updates anidados
            'username': { 'validators': [] },
        }

    def validate_username(self, value):
    # Normalizar valor (trim) y permitir el mismo username (ignorando mayusculas/minusculas)
        v = (value or '').strip()
        if self.instance:
            current = (self.instance.username or '')
            if current == v or current.strip().lower() == v.lower():
                return v
            qs = User.objects.filter(username__iexact=v).exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('A user with that username already exists.')
            return v
        else:
            if User.objects.filter(username__iexact=v).exists():
                raise serializers.ValidationError('A user with that username already exists.')
            return v

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Este campo es requerido'})
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class ResidenteSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)

    class Meta:
        model = Residente
        fields = '__all__'

    def create(self, validated_data):
    # Crear usuario anidado con contrasena correctamente hasheada
        user_data = validated_data.pop('user')
        user_serializer = UserSerializer(data=user_data, context=self.context)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
    # Asegurar que no se cree staff por esta via
        if user.is_staff:
            user.is_staff = False
            user.save(update_fields=['is_staff'])
        residente = Residente.objects.create(user=user, **validated_data)
        return residente

    def update(self, instance, validated_data):
        # Permitir actualizar datos del usuario anidado si vienen
        user_data = validated_data.pop('user', None)
        if user_data:
            user_serializer = UserSerializer(instance=instance.user, data=user_data, partial=True, context=self.context)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = '__all__'

class VisitanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visitante
        fields = '__all__'

class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = '__all__'

class RegistroAccesoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroAcceso
        fields = '__all__'

class FamiliaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Familia
        fields = '__all__'

class AutorizacionVisitaSerializer(serializers.ModelSerializer):
    autorizado_por_usuario = serializers.SerializerMethodField()

    class Meta:
        model = AutorizacionVisita
        fields = '__all__'
        read_only_fields = ('codigo_qr', 'qr_image', 'status', 'fecha_creacion', 'entradas_consumidas', 'dentro')
        depth = 1

    def get_autorizado_por_usuario(self, obj):
        try:
            u = obj.autorizado_por.user
            full = f"{u.first_name or ''} {u.last_name or ''}".strip()
            return {
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': full or u.username,
            }
        except Exception:
            return None


    # Area-related serializers moved to 'areas' app

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'