import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

// Single place to change your LAN base URL (PC IP):
// Cambia solo esta linea si tu IP cambia.
const String LAN_BASE_URL = 'http://192.168.100.132:8000';

// Si normalmente pruebas en DISPOSITIVO FISICO Android, dejalo en true para usar LAN_BASE_URL.
// Si usas principalmente EMULADOR Android, ponlo en false para usar 10.0.2.2.
const bool PREFER_LAN_ON_ANDROID = true;

// Permite override en runtime: --dart-define=BACKEND_BASE_URL=http://<ip>:8000
const String _dartDefineBackend = String.fromEnvironment('BACKEND_BASE_URL', defaultValue: '');

/// Backend base URL con prioridad:
/// 1) BACKEND_BASE_URL por --dart-define
/// 2) Web/Desktop: LAN_BASE_URL
/// 3) Android: LAN_BASE_URL si PREFER_LAN_ON_ANDROID=true, si no 10.0.2.2
String get backendBaseUrl {
  // 1) Valor proporcionado en tiempo de ejecucion
  if (_dartDefineBackend.isNotEmpty) return _dartDefineBackend;

  // 2) Defaults por plataforma
  if (kIsWeb) return LAN_BASE_URL;
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return PREFER_LAN_ON_ANDROID ? LAN_BASE_URL : 'http://10.0.2.2:8000';
    default:
      return LAN_BASE_URL;
  }
}
