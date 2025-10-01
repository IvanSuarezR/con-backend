import 'dart:convert';
import 'package:flutter/services.dart';
import 'dart:io';

Future<bool> saveImageDataUrlToGallery(String dataUrl, {String? album}) async {
  try {
    if (!dataUrl.startsWith('data:image')) return false;
    // 1) Decode base64 to bytes
    final parts = dataUrl.split(',');
    final b64 = parts.sublist(1).join(',');
    final bytes = base64Decode(b64);
    // Llamar canal nativo en Android para guardar en MediaStore sin plugins de terceros
    if (Platform.isAndroid) {
      final ch = const MethodChannel('com.example.movil/media');
      final b64 = base64Encode(bytes);
      final name = 'qr_${DateTime.now().millisecondsSinceEpoch}.png';
      final ok = await ch.invokeMethod<bool>('saveImageBytes', {
        'base64': b64,
        'name': name,
      });
      return ok == true;
    }
  // iOS: podriamos usar Photokit con un canal similar si lo necesitas; por ahora devolvemos false
    return false;
  } catch (_) {
    return false;
  }
}
