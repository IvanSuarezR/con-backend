import 'dart:convert';
import 'dart:typed_data';
import 'package:file_saver/file_saver.dart';

Future<bool> downloadDataUrl(String dataUrl, String filename) async {
  try {
    // data:image/png;base64,XXXX
    final parts = dataUrl.split(',');
    if (parts.length < 2) return false;
    final meta = parts.first; // data:image/png;base64
    final b64 = parts.sublist(1).join(',');
    final bytes = base64.decode(b64);

    // Infer extension from meta
    String ext = 'png';
    final semi = meta.indexOf(';');
    final mime = semi > 5 ? meta.substring(5, semi) : 'image/png';
    if (mime.contains('jpeg')) ext = 'jpg';
    if (mime.contains('png')) ext = 'png';

    // Ensure safe filename (strip/replace invalid chars) and avoid double extensions
    String safeName = filename.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    // Remove any existing extension to let FileSaver add it
    final baseName = safeName.replaceAll(RegExp(r'\.[^.]*$'), '');

    await FileSaver.instance.saveFile(
      name: baseName.isEmpty ? 'qr' : baseName,
      bytes: Uint8List.fromList(bytes),
      ext: ext,
      mimeType: _mimeTypeFromExt(ext),
    );
    return true;
  } catch (_) {
    return false;
  }
}

MimeType _mimeTypeFromExt(String ext) {
  switch (ext.toLowerCase()) {
    case 'png':
      return MimeType.png;
    case 'jpg':
    case 'jpeg':
      return MimeType.jpeg;
    default:
      return MimeType.other;
  }
}
