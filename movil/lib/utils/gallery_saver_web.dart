Future<bool> saveImageDataUrlToGallery(String dataUrl, {String? album}) async {
  // On web, saving to gallery is not applicable; offer a regular download instead.
  // Let callers handle fallback if this returns false.
  return false;
}
