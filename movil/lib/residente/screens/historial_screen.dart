import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';
import '../../services/autorizaciones_service.dart';
import '../../utils/datetime_format.dart';

abstract class _HasTokenProvider {
  String? Function() get tokenProvider;
}

class ResidentHistorialScreen extends StatefulWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const ResidentHistorialScreen({super.key, required this.tokenProvider});
  @override
  State<ResidentHistorialScreen> createState() => _ResidentHistorialScreenState();
}

class _ResidentHistorialScreenState extends State<ResidentHistorialScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  late final service = AutorizacionesService(api);
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> items = [];
  // Filtros de fecha
  DateTime? desde;
  DateTime? hasta;
  String rangoQuick = 'ALL'; // ALL | TODAY | 7D | 30D | CUSTOM
  String sortOrder = 'DESC'; // DESC = Mas recientes, ASC = Mas antiguas

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      // Cargamos historial (no vigentes) y filtramos cliente por rango si aplica
      final data = await service.list(params: {'vigente': 'false'});
      items = _applyDateFilter(data);
    } catch (e) {
      error = 'Error al cargar historial';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  List<Map<String, dynamic>> _applyDateFilter(List<Map<String, dynamic>> data) {
    DateTime? d = desde;
    DateTime? h = hasta;
    final now = DateTime.now();
    switch (rangoQuick) {
      case 'ALL':
        d = null; h = null; // sin filtro de fechas
        break;
      case 'TODAY':
        d = DateTime(now.year, now.month, now.day);
        h = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
        break;
      case '7D':
        d = now.subtract(const Duration(days: 7));
        h = now;
        break;
      case '30D':
        d = now.subtract(const Duration(days: 30));
        h = now;
        break;
      case 'CUSTOM':
        // Usa desde/hasta ya elegidos
        break;
      default:
        d = null; h = null;
        break;
    }
    bool inRange(Map<String, dynamic> a) {
      // Preferir fecha_creacion si existe; si no, usar fecha_fin
      DateTime? t;
      final fc = a['fecha_creacion']?.toString();
      final ff = a['fecha_fin']?.toString();
      try { if (fc != null) t = DateTime.parse(fc).toLocal(); } catch (_) {}
      try { if (t == null && ff != null) t = DateTime.parse(ff).toLocal(); } catch (_) {}
      if (t == null) return true;
  if (d != null && t.isBefore(d)) return false;
  if (h != null && t.isAfter(h)) return false;
      return true;
    }
    final filtered = data.where(inRange).toList();
  // Ordenar por fecha segun preferencia
    filtered.sort((a, b) {
      DateTime ta, tb;
      DateTime? pa;
      DateTime? pb;
      try { pa = DateTime.parse((a['fecha_creacion'] ?? a['fecha_fin']).toString()).toLocal(); } catch (_) {}
      try { pb = DateTime.parse((b['fecha_creacion'] ?? b['fecha_fin']).toString()).toLocal(); } catch (_) {}
      ta = pa ?? DateTime.fromMillisecondsSinceEpoch(0);
      tb = pb ?? DateTime.fromMillisecondsSinceEpoch(0);
      return sortOrder == 'DESC' ? tb.compareTo(ta) : ta.compareTo(tb);
    });
    return filtered;
  }

  Future<void> _pickCustomRange() async {
    // Escoger desde/hasta con date pickers simples
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 1),
      initialDate: desde ?? now,
    );
    if (d == null) return;
    if (!context.mounted) return;
    final h = await showDatePicker(
      context: context,
      firstDate: d,
      lastDate: DateTime(now.year + 1),
      initialDate: hasta ?? d,
    );
    if (h == null) return;
    setState(() {
      rangoQuick = 'CUSTOM';
      desde = DateTime(d.year, d.month, d.day);
      hasta = DateTime(h.year, h.month, h.day, 23, 59, 59, 999);
      items = _applyDateFilter(items);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading) const LinearProgressIndicator(),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        // Controles: Rango (dropdown) + Orden (dropdown) + Recargar
        Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Rango: '),
                DropdownButton<String>(
                  value: rangoQuick,
                  items: const [
                    DropdownMenuItem(value: 'ALL', child: Text('Todos')),
                    DropdownMenuItem(value: 'TODAY', child: Text('Hoy')),
                    DropdownMenuItem(value: '7D', child: Text('Últimos 7 días')),
                    DropdownMenuItem(value: '30D', child: Text('Últimos 30 días')),
                    DropdownMenuItem(value: 'CUSTOM', child: Text('Fecha personalizada')),
                  ],
                  onChanged: (v) async {
                    if (v == null) return;
                    if (v == 'CUSTOM') {
                      await _pickCustomRange();
                    } else {
                      setState(() {
                        rangoQuick = v;
                        // Limpiar fechas custom al salir de CUSTOM
                        desde = null; hasta = null;
                        items = _applyDateFilter(items);
                      });
                    }
                  },
                ),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Orden: '),
                DropdownButton<String>(
                  value: sortOrder,
                  items: const [
                    DropdownMenuItem(value: 'DESC', child: Text('Más recientes')),
                    DropdownMenuItem(value: 'ASC', child: Text('Más antiguas')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() {
                      sortOrder = v;
                      items = _applyDateFilter(items);
                    });
                  },
                ),
              ],
            ),
            FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Recargar')),
          ],
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final a = items[i];
              final v = (a['visitante'] as Map?)?.cast<String, dynamic>();
              final nombre = v?['nombre_completo']?.toString() ?? 'Visitante';
              final tipo = (v?['tipo_acceso']?.toString() == 'V') ? 'Vehicular' : 'Peatonal';
              final status = a['status']?.toString() ?? '';
              final inicio = a['fecha_inicio']?.toString();
              final fin = a['fecha_fin']?.toString();
              final rango = DateTimeFmt.rangeFromIso(inicio, fin);
              final usadas = (a['entradas_consumidas'] as num?)?.toInt() ?? 0;
              final permitidas = (a['entradas_permitidas'] as num?)?.toInt() ?? 1;
              return ListTile(
                leading: Icon(tipo == 'Vehicular' ? Icons.time_to_leave : Icons.directions_walk),
                title: Text(nombre),
                subtitle: Text('$tipo · $status\n$rango\nEntradas: $usadas/$permitidas'),
                isThreeLine: true,
              );
            },
          ),
        ),
      ],
    );
  }
}
