import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';

abstract class _HasTokenProvider {
  String? Function() get tokenProvider;
}

class ResidentAreasScreen extends StatefulWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const ResidentAreasScreen({super.key, required this.tokenProvider});
  @override
  State<ResidentAreasScreen> createState() => _ResidentAreasScreenState();
}

class _ResidentAreasScreenState extends State<ResidentAreasScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  List<Map<String, dynamic>> areas = [];
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
      final res = await api.get('/api/areas/');
      if (res.statusCode == 200) {
        final data = api.decodeJson<dynamic>(res);
        if (data is List) {
          areas = data.cast<Map<String, dynamic>>();
        } else if (data is Map && data['results'] is List) {
          areas = (data['results'] as List).cast<Map<String, dynamic>>();
        } else {
          areas = [];
        }
      } else {
        error = 'Error ${res.statusCode}';
      }
    } catch (_) {
      error = 'Error de red';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading) const LinearProgressIndicator(),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        Expanded(
          child: ListView.separated(
            itemCount: areas.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final a = areas[i];
              final tipo = a['tipo']?.toString();
              return ListTile(
                title: Text(a['nombre']?.toString() ?? 'Área'),
                subtitle: Text(tipo == 'UNIDADES' ? 'por unidades' : 'por turnos/capacidad'),
                onTap: () {
                  final id = (a['id'] as num?)?.toInt();
                  if (id != null) context.go('/residente/areas/$id');
                },
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Recargar'),
          ),
        )
      ],
    );
  }
}
