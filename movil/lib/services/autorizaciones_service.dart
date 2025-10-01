import '../api/api_client.dart';

class AutorizacionesService {
  final ApiClient api;
  AutorizacionesService(this.api);

  Future<List<Map<String, dynamic>>> list({Map<String, String>? params}) async {
    final uri = Uri(path: '/api/autorizaciones/', queryParameters: params);
    final res = await api.get(uri.toString());
    if (res.statusCode == 200) {
      final data = api.decodeJson<dynamic>(res);
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['results'] is List) {
        return (data['results'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    }
    throw Exception('Error ${res.statusCode}');
  }

  Future<Map<String, dynamic>> generarQR(Map<String, dynamic> payload) async {
    final res = await api.post('/api/autorizaciones/generar-qr/', body: payload);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return api.decodeJson<Map<String, dynamic>>(res);
    }
    throw Exception('Error ${res.statusCode}: ${res.body}');
  }

  Future<void> cancelar(int id) async {
    final res = await api.post('/api/autorizaciones/$id/cancelar/');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> validarQr({
    required String codigoQr,
    String evento = 'ENTRADA',
    String modalidad = 'PEATONAL',
  }) async {
    final res = await api.post('/api/ia/qr/validar/', body: {
      'codigo_qr': codigoQr.trim(),
      'evento': evento.trim().toUpperCase(),
      'modalidad': modalidad.trim().toUpperCase(),
    });
    final data = api.decodeJson<dynamic>(res);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return (data as Map).cast<String, dynamic>();
    }
    throw Exception('Error ${res.statusCode}: ${res.body}');
  }
}
