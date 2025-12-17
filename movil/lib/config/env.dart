import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform, kReleaseMode;

// URLs del backend
const String PRODUCTION_URL = 'https://condominio-backend-741019382008.us-central1.run.app';
const String LAN_BASE_URL = 'http://192.168.100.132:8000';
const String EMULATOR_URL = 'http://10.0.2.2:8000';

// Configuración de entorno:
// - true: usar PRODUCTION_URL (para APK releases)
// - false: usar localhost/LAN para desarrollo
// Por defecto, usa Producción si estamos en modo Release (APK generado), y Local si es Debug.
const bool USE_PRODUCTION = bool.fromEnvironment('USE_PRODUCTION', defaultValue: kReleaseMode);

// Si normalmente pruebas en DISPOSITIVO FISICO Android, dejalo en true para usar LAN_BASE_URL.
// Si usas principalmente EMULADOR Android, ponlo en false para usar EMULATOR_URL.
const bool PREFER_LAN_ON_ANDROID = true;

// Permite override en runtime: --dart-define=BACKEND_BASE_URL=http://<ip>:8000
const String _dartDefineBackend = String.fromEnvironment('BACKEND_BASE_URL', defaultValue: '');

/// Backend base URL con prioridad:
/// 1) BACKEND_BASE_URL por --dart-define (override manual)
/// 2) USE_PRODUCTION=true: usar PRODUCTION_URL
/// 3) USE_PRODUCTION=false (default): localhost/LAN según plataforma
String get backendBaseUrl {
  // 1) Valor proporcionado en tiempo de ejecucion (override manual)
  if (_dartDefineBackend.isNotEmpty) return _dartDefineBackend;

  // 2) Si USE_PRODUCTION está activado, usar producción
  if (USE_PRODUCTION) return PRODUCTION_URL;

  // 3) Defaults por plataforma para desarrollo local
  if (kIsWeb) return LAN_BASE_URL;
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return PREFER_LAN_ON_ANDROID ? LAN_BASE_URL : EMULATOR_URL;
    default:
      return LAN_BASE_URL;
  }
}
