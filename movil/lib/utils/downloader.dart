import 'downloader_io.dart' if (dart.library.html) 'downloader_web.dart' as impl;

/// Attempts to download a data URL as a file. Returns true if supported.
Future<bool> downloadDataUrl(String dataUrl, String filename) {
  return impl.downloadDataUrl(dataUrl, filename);
}
