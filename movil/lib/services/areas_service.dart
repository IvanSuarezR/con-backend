import '../api/api_client.dart';

class AreasService {
  final ApiClient api;
  AreasService(this.api);

  // Areas
  Future<List<Map<String, dynamic>>> listAreas({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/areas/', query: params);
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    final data = api.decodeJson<dynamic>(res);
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['results'] is List) return (data['results'] as List).cast<Map<String, dynamic>>();
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> getArea(int id) async {
    final res = await api.get('/api/areas/$id/');
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    return api.decodeJson<Map<String, dynamic>>(res);
  }

  Future<Map<String, dynamic>> getCalendario(int id, {Map<String, dynamic>? params}) async {
    final res = await api.get('/api/areas/$id/calendario/', query: params);
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    return api.decodeJson<Map<String, dynamic>>(res);
  }

  // Unidades
  Future<List<Map<String, dynamic>>> listUnidades({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/unidades-area', query: params);
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    final data = api.decodeJson<dynamic>(res);
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['results'] is List) return (data['results'] as List).cast<Map<String, dynamic>>();
    return <Map<String, dynamic>>[];
  }

  // Turnos
  Future<List<Map<String, dynamic>>> listTurnos({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/turnos-area', query: params);
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    final data = api.decodeJson<dynamic>(res);
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['results'] is List) return (data['results'] as List).cast<Map<String, dynamic>>();
    return <Map<String, dynamic>>[];
  }

  // Reservas
  Future<List<Map<String, dynamic>>> listReservas({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/reservas-area', query: params);
    if (res.statusCode != 200) { throw Exception('Error ${res.statusCode}'); }
    final data = api.decodeJson<dynamic>(res);
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['results'] is List) return (data['results'] as List).cast<Map<String, dynamic>>();
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> createReserva(Map<String, dynamic> body) async {
    final res = await api.post('/api/reservas-area/', body: body);
    if (res.statusCode < 200 || res.statusCode >= 300) { throw Exception('Error ${res.statusCode}: ${res.body}'); }
    return api.decodeJson<Map<String, dynamic>>(res);
  }

  Future<Map<String, dynamic>> patchReserva(int id, Map<String, dynamic> body) async {
    final res = await api.patch('/api/reservas-area/$id/', body: body);
    if (res.statusCode < 200 || res.statusCode >= 300) { throw Exception('Error ${res.statusCode}: ${res.body}'); }
    return api.decodeJson<Map<String, dynamic>>(res);
  }
}
