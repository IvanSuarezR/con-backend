import 'dart:convert';
import 'package:http/http.dart' as http;

/// Lightweight API client with bearer auth and base URL.
class ApiClient {
  final String baseUrl; // e.g., http://10.0.2.2:8000
  final String? Function() tokenProvider; // returns current JWT token

  ApiClient({required this.baseUrl, required this.tokenProvider});

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    // Ensure path begins with '/'
    final normalized = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$normalized');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: {
      ...uri.queryParameters,
      ...query.map((k, v) => MapEntry(k, '$v')),
    });
  }

  Map<String, String> _headers([Map<String, String>? extra]) {
    final token = tokenProvider();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    if (extra != null) headers.addAll(extra);
    return headers;
  }

  Future<http.Response> get(String path, {Map<String, dynamic>? query}) {
    return http.get(_uri(path, query), headers: _headers());
  }

  Future<http.Response> post(String path, {Object? body, Map<String, dynamic>? query}) {
    return http.post(_uri(path, query), headers: _headers(), body: body is String ? body : jsonEncode(body));
  }

  Future<http.Response> patch(String path, {Object? body}) {
    return http.patch(_uri(path), headers: _headers(), body: body is String ? body : jsonEncode(body));
  }

  Future<http.Response> delete(String path) {
    return http.delete(_uri(path), headers: _headers());
  }

  // Helpers
  T decodeJson<T>(http.Response res) {
    return jsonDecode(utf8.decode(res.bodyBytes)) as T;
  }
}
