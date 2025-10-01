import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/env.dart';

class HomePage extends StatefulWidget {
  final VoidCallback onLogout;
  final String? token;
  const HomePage({super.key, required this.onLogout, required this.token});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String? _username;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMe();
  }

  Future<void> _loadMe() async {
    final token = widget.token;
    if (token == null) return;
    try {
      final uri = Uri.parse('$backendBaseUrl/api/users/me/');
      final res = await http
          .get(uri, headers: {"Authorization": "Bearer $token"})
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() => _username = (data['username'] as String?) ?? '');
      } else {
        setState(() => _error = 'No se pudo cargar perfil (${res.statusCode})');
      }
    } catch (e) {
      setState(() => _error = 'Error de red');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inicio')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            Text(_username != null ? 'Hola, $_username' : 'Bienvenido!'),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: widget.onLogout,
              icon: const Icon(Icons.logout),
              label: const Text('Cerrar sesión'),
            )
          ],
        ),
      ),
    );
  }
}
