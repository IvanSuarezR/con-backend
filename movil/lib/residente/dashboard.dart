import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../config/env.dart';
import '../services/resident_service.dart';
import '../services/user_service.dart';

class ResidentDashboardScreen extends StatefulWidget {
  final String? Function() tokenProvider;
  const ResidentDashboardScreen({super.key, required this.tokenProvider});
  @override
  State<ResidentDashboardScreen> createState() => _ResidentDashboardScreenState();
}

class _ResidentDashboardScreenState extends State<ResidentDashboardScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  late final userService = UserService(api);
  late final residentService = ResidentService(api);
  Map<String, dynamic>? me;
  List<Map<String, dynamic>> residents = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      final results = await Future.wait([
        userService.getMe(),
        residentService.listResidents(),
      ]);
      me = results[0] as Map<String, dynamic>;
      residents = (results[1] as List).cast<Map<String, dynamic>>();
    } catch (e) {
      error = 'Error al cargar';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (loading) const LinearProgressIndicator(),
          if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
          if (me != null) Text('Bienvenido, ${me!['first_name'] ?? ''} ${me!['last_name'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: residents.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final r = residents[i];
                final user = r['user'] as Map<String, dynamic>?;
                final name = '${user?['first_name'] ?? ''} ${user?['last_name'] ?? ''}'.trim();
                final doc = r['documento_identidad'] ?? '';
                final tipo = r['tipo'] ?? '';
                return ListTile(
                  title: Text(name.isEmpty ? (user?['username'] ?? '—') : name),
                  subtitle: Text('$doc · $tipo'),
                  trailing: Text(user?['username'] ?? ''),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          // Align(
          //   alignment: Alignment.centerRight,
          //   child: FilledButton.icon(
          //     onPressed: _load,
          //     icon: const Icon(Icons.refresh),
          //     label: const Text('Recargar'),
          //   ),
          // ),
        ],
      ),
    );
  }
}
