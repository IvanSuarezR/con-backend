import '../api/api_client.dart';

class AccesosService {
  final ApiClient api;
  AccesosService(this.api);

  Future<void> abrirPorton() async {
    final res = await api.post('/api/porton/abrir/', body: const <String, dynamic>{});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }
  }

  Future<void> cerrarPorton() async {
    final res = await api.post('/api/porton/cerrar/', body: const <String, dynamic>{});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }
  }

  Future<void> abrirPuerta() async {
    final res = await api.post('/api/puerta/abrir/', body: const <String, dynamic>{});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }
  }

  Future<void> cerrarPuerta() async {
    final res = await api.post('/api/puerta/cerrar/', body: const <String, dynamic>{});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }
  }
}
