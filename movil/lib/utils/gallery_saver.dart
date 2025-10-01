import 'gallery_saver_io.dart' if (dart.library.html) 'gallery_saver_web.dart' as impl;

/// Saves a data URL image into the device gallery/photos when supported.
/// Returns true on success, false if unsupported or failed.
Future<bool> saveImageDataUrlToGallery(String dataUrl, {String? album}) {
  return impl.saveImageDataUrlToGallery(dataUrl, album: album);
}
