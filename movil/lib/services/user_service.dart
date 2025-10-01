import '../api/api_client.dart';

class UserService {
  final ApiClient api;
  UserService(this.api);

  Future<Map<String, dynamic>> getMe() async {
    final res = await api.get('/api/users/me/');
    if (res.statusCode == 200) {
      return api.decodeJson<Map<String, dynamic>>(res);
    }
    throw Exception('Error ${res.statusCode}');
  }
}
