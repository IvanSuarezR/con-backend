import '../api/api_client.dart';

class NotificationsService {
  final ApiClient api;
  NotificationsService(this.api);

  Future<List<Map<String, dynamic>>> list({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/notificaciones/', query: params);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = api.decodeJson<dynamic>(res);
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      if (data is Map && data['results'] is List) {
        return (data['results'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return const [];
    }
    throw Exception('HTTP ${res.statusCode}');
  }

  Future<void> markRead({List<int>? ids}) async {
    final body = ids == null ? <String, dynamic>{} : <String, dynamic>{'ids': ids};
    final res = await api.post('/api/notificaciones/marcar-leidas/', body: body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('HTTP ${res.statusCode}');
    }
  }
}
