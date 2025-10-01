import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService {
  final String baseUrl;
  AuthService({required this.baseUrl});

  /// Login contra JWT custom en Django: POST /api/auth/token/
  /// Body: { username, password }
  /// Respuesta esperada: { access, refresh }
  Future<String?> login(String user, String pass) async {
    final uri = Uri.parse('$baseUrl/api/auth/token/');
    try {
      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'username': user, 'password': pass}),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['access'] as String?;
      }
    } catch (_) {}
    return null;
  }
}
