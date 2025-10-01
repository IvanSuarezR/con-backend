import 'dart:convert';
import '../api/api_client.dart';

class ResidentService {
  final ApiClient api;
  ResidentService(this.api);

  Future<List<Map<String, dynamic>>> listResidents({Map<String, dynamic>? params}) async {
    final res = await api.get('/api/residentes/', query: params);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['results'] is List) {
        return (data['results'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    }
    throw Exception('Error ${res.statusCode}');
  }

  Future<Map<String, dynamic>> createResident(Map<String, dynamic> payload) async {
    final res = await api.post('/api/residentes/', body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return api.decodeJson<Map<String, dynamic>>(res);
    }
    throw Exception('Error ${res.statusCode}: ${res.body}');
  }

  Future<Map<String, dynamic>> updateResident(int id, Map<String, dynamic> payload) async {
    final res = await api.patch('/api/residentes/$id/', body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return api.decodeJson<Map<String, dynamic>>(res);
    }
    throw Exception('Error ${res.statusCode}: ${res.body}');
  }
}
