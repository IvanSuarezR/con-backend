import 'dart:io' show Platform;
import 'package:permission_handler/permission_handler.dart';

class AppPermissions {
  static Future<bool> ensurePhotoWritePermission() async {
    if (Platform.isIOS) {
      final status = await Permission.photosAddOnly.request();
      return status.isGranted || status.isLimited;
    }
    if (Platform.isAndroid) {
      // Android 13+: READ_MEDIA_IMAGES, older: (legacy) storage
      final sdkInt = await _androidSdkInt();
      if (sdkInt >= 33) {
        final status = await Permission.photos.request();
        return status.isGranted;
      } else if (sdkInt >= 29) {
        // Scoped storage; usually not needed to request, but some OEMs require READ_EXTERNAL_STORAGE
        final status = await Permission.storage.request();
        return status.isGranted;
      } else {
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    }
    // Other platforms not supported
    return false;
  }

  static Future<int> _androidSdkInt() async {
    try {
      // Using permission_handler's device info is not exposed; fall back to env
      // We can approximate by checking permissions behavior
      // If photos is denied with permanentlyDenied false, assume >=33
      final s = await Permission.photos.status;
      if (s != PermissionStatus.denied) return 33;
    } catch (_) {}
    return 30; // sensible default
  }
}