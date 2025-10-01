import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';
import '../../services/areas_service.dart';
import '../../utils/datetime_format.dart';

class ResidentAreaDetalleScreen extends StatefulWidget {
  final String? Function() tokenProvider;
  final int areaId;
  const ResidentAreaDetalleScreen({super.key, required this.tokenProvider, required this.areaId});

  @override
  State<ResidentAreaDetalleScreen> createState() => _ResidentAreaDetalleScreenState();
}

class _ResidentAreaDetalleScreenState extends State<ResidentAreaDetalleScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  late final areas = AreasService(api);

  Map<String, dynamic>? area;
  Map<String, dynamic>? calendario;
  List<Map<String, dynamic>> unidades = [];
  List<Map<String, dynamic>> turnos = [];
  List<Map<String, dynamic>> misReservas = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      final a = await areas.getArea(widget.areaId);
      area = a;
      if (a['tipo'] == 'UNIDADES') {
        final all = await areas.listUnidades();
        unidades = all.where((u) => (u['area']?.toString() ?? '') == widget.areaId.toString()).toList();
      } else {
        final all = await areas.listTurnos();
        turnos = all.where((t) => (t['area']?.toString() ?? '') == widget.areaId.toString()).toList();
      }
      try { calendario = await areas.getCalendario(widget.areaId); } catch (_) {}
      await _loadMisReservas();
    } catch (e) {
      error = 'No se pudo cargar el área';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  Future<void> _loadMisReservas() async {
    try {
      misReservas = await areas.listReservas(params: { 'area': widget.areaId });
      if (calendario != null && calendario!['tipo'] != 'UNIDADES') {
        // optionally update occupancy for turnos
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) return Center(child: Text(error!, style: const TextStyle(color: Colors.red)));
    final a = area!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(a['nombre']?.toString() ?? 'Área', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          if (a['tipo'] == 'UNIDADES') _UnidadesForm(
            areaId: widget.areaId,
            unidades: unidades,
            onCreated: () async { await _loadMisReservas(); try { calendario = await areas.getCalendario(widget.areaId); } catch (_) {}; setState((){}); },
          ),
          if (a['tipo'] != 'UNIDADES') _TurnosForm(turnos: turnos, calendario: calendario, onCreated: () async { await _loadMisReservas(); try { calendario = await areas.getCalendario(widget.areaId); } catch (_) {}; setState((){}); }, areaId: widget.areaId, areas: areas),
          const SizedBox(height: 16),
          if (calendario != null && calendario!['tipo'] == 'UNIDADES') _CalendarioUnidades(calendario: calendario!),
          const SizedBox(height: 16),
          _MisReservas(misReservas: misReservas, onCancel: (id) async { await areas.patchReserva(id, { 'estado': 'CANCELADA' }); await _loadMisReservas(); }),
        ],
      ),
    );
  }
}

class _UnidadesForm extends StatefulWidget {
  final int areaId;
  final List<Map<String, dynamic>> unidades;
  final Future<void> Function() onCreated;
  const _UnidadesForm({required this.areaId, required this.unidades, required this.onCreated});

  @override
  State<_UnidadesForm> createState() => _UnidadesFormState();
}

class _UnidadesFormState extends State<_UnidadesForm> {
  String unidadId = '';
  DateTime? fecha;
  TimeOfDay? hora;
  int duracionMin = 60;
  bool loading = false;
  String ok = '';
  String err = '';

  String _formatLocalNaive(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)}T${two(d.hour)}:${two(d.minute)}';
  }

  Future<void> _reservar() async {
    setState(() { ok=''; err=''; loading=true; });
    try {
      if (unidadId.isEmpty || fecha == null || hora == null) throw Exception('Completa los campos');
      final inicio = DateTime(fecha!.year, fecha!.month, fecha!.day, hora!.hour, hora!.minute);
      final fin = inicio.add(Duration(minutes: duracionMin));
      final body = {
        'area': widget.areaId,
        'unidad': int.parse(unidadId),
        'fecha_inicio': _formatLocalNaive(inicio),
        'fecha_fin': _formatLocalNaive(fin),
      };
      final api = context.findAncestorStateOfType<_ResidentAreaDetalleScreenState>()!;
      await api.areas.createReserva(body);
      ok = 'Reserva creada';
      unidadId = ''; fecha = null; hora = null; duracionMin = 60;
      await widget.onCreated();
    } catch (e) {
      err = e.toString();
    } finally { setState(() { loading=false; }); }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reservar por unidad', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(spacing: 12, runSpacing: 8, children: [
              DropdownButton<String>(
                value: unidadId.isEmpty ? null : unidadId,
                hint: const Text('Seleccione una unidad'),
                items: [
                  for (final u in widget.unidades)
                    DropdownMenuItem(value: u['id'].toString(), child: Text(u['nombre']?.toString() ?? 'Unidad')),
                ],
                onChanged: (v) => setState(() => unidadId = v ?? ''),
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today),
                label: Text(fecha == null ? 'Fecha' : '${fecha!.year}-${fecha!.month.toString().padLeft(2,'0')}-${fecha!.day.toString().padLeft(2,'0')}'),
                onPressed: () async {
                  final now = DateTime.now();
                  final picked = await showDatePicker(context: context, firstDate: now, lastDate: now.add(const Duration(days: 365)), initialDate: fecha ?? now);
                  if (picked != null) setState(() => fecha = picked);
                },
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.schedule),
                label: Text(hora == null ? 'Hora' : '${hora!.hour.toString().padLeft(2,'0')}:${hora!.minute.toString().padLeft(2,'0')}'),
                onPressed: () async {
                  final picked = await showTimePicker(context: context, initialTime: hora ?? TimeOfDay.now());
                  if (picked != null) setState(() => hora = picked);
                },
              ),
              Row(mainAxisSize: MainAxisSize.min, children: [
                const Text('Duración'),
                const SizedBox(width: 8),
                SizedBox(
                  width: 80,
                  child: TextField(
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: 'min'),
                    controller: TextEditingController(text: duracionMin.toString()),
                    onSubmitted: (v) => setState(() => duracionMin = int.tryParse(v) ?? 60),
                  ),
                )
              ]),
              FilledButton.icon(onPressed: loading ? null : _reservar, icon: const Icon(Icons.event_available), label: Text(loading ? 'Reservando…' : 'Reservar')),
            ]),
            if (ok.isNotEmpty) Padding(padding: const EdgeInsets.only(top:8), child: Text(ok, style: const TextStyle(color: Colors.green))),
            if (err.isNotEmpty) Padding(padding: const EdgeInsets.only(top:8), child: Text(err, style: const TextStyle(color: Colors.red))),
          ],
        ),
      ),
    );
  }
}

class _TurnosForm extends StatefulWidget {
  final List<Map<String, dynamic>> turnos;
  final Map<String, dynamic>? calendario;
  final Future<void> Function() onCreated;
  final int areaId;
  final AreasService areas;
  const _TurnosForm({required this.turnos, required this.calendario, required this.onCreated, required this.areaId, required this.areas});
  @override
  State<_TurnosForm> createState() => _TurnosFormState();
}

class _TurnosFormState extends State<_TurnosForm> {
  int cupos = 1;
  bool loading = false;
  String ok = '';
  String err = '';

  Future<void> _reservar(int turnoId) async {
    setState(() { ok=''; err=''; loading=true; });
    try {
      await widget.areas.createReserva({ 'area': widget.areaId, 'turno': turnoId, 'cupos': cupos });
      ok = 'Reserva creada';
      await widget.onCreated();
    } catch (e) {
      err = e.toString();
    } finally { setState(() { loading=false; }); }
  }

  @override
  Widget build(BuildContext context) {
    final ocup = <int, Map<String, int>>{};
    final calTurnos = (widget.calendario?['turnos'] as List?) ?? const [];
    for (final t in calTurnos) {
      final id = t['id'] as int?; if (id == null) continue;
      ocup[id] = {
        'capacidad': (t['capacidad'] as int?) ?? 0,
        'ocupados': (t['ocupados'] as int?) ?? 0,
        'disponibles': (t['disponibles'] as int?) ?? (((t['capacidad'] as int?) ?? 0) - ((t['ocupados'] as int?) ?? 0)),
      };
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reservar por turno', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: [
              const Text('Cupos:'),
              const SizedBox(width: 8),
              SizedBox(
                width: 80,
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: '1'),
                  controller: TextEditingController(text: cupos.toString()),
                  onSubmitted: (v) => setState(() => cupos = int.tryParse(v) ?? 1),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            ...widget.turnos.map((t) {
              final occ = ocup[t['id']] ?? { 'capacidad': t['capacidad'] ?? 0, 'ocupados': 0, 'disponibles': t['capacidad'] ?? 0 };
              return ListTile(
                title: Text(t['titulo']?.toString() ?? 'Turno'),
                subtitle: Text('${DateTime.parse(t['fecha_inicio']).toLocal()} — ${DateTime.parse(t['fecha_fin']).toLocal()} | Capacidad: ${occ['capacidad']} | Ocupados: ${occ['ocupados']} | Disponibles: ${occ['disponibles']}'),
                trailing: FilledButton(onPressed: loading ? null : () => _reservar(t['id'] as int), child: Text(loading ? 'Reservando…' : 'Reservar')),
              );
            }),
            if (ok.isNotEmpty) Padding(padding: const EdgeInsets.only(top:8), child: Text(ok, style: const TextStyle(color: Colors.green))),
            if (err.isNotEmpty) Padding(padding: const EdgeInsets.only(top:8), child: Text(err, style: const TextStyle(color: Colors.red))),
          ],
        ),
      ),
    );
  }
}

class _CalendarioUnidades extends StatelessWidget {
  final Map<String, dynamic> calendario;
  const _CalendarioUnidades({required this.calendario});
  @override
  Widget build(BuildContext context) {
    final reservas = ((calendario['reservas'] as List?) ?? const <dynamic>[])
        .cast<Map<String, dynamic>>()
        .toList();
    // Ocultar reservas finalizadas (fecha_fin en el pasado)
    final now = DateTime.now();
    reservas.removeWhere((r) {
      final finIso = r['fecha_fin']?.toString();
      if (finIso == null) return false;
      final fin = DateTime.tryParse(finIso);
      if (fin == null) return false;
      return fin.isBefore(now);
    });
    reservas.sort((a,b){
      final ua = (a['unidad_nombre']?.toString() ?? a['unidad_id']?.toString() ?? '');
      final ub = (b['unidad_nombre']?.toString() ?? b['unidad_id']?.toString() ?? '');
      if (ua != ub) return ua.compareTo(ub);
      final fa = DateTime.tryParse(a['fecha_inicio']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final fb = DateTime.tryParse(b['fecha_inicio']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return fa.compareTo(fb);
    });
    final grupos = <String, List<Map<String, dynamic>>>{};
    for (final r in reservas) {
      final k = r['unidad_nombre']?.toString() ?? 'Unidad ${r['unidad_id']}';
      (grupos[k] ??= []).add(r);
    }
    if (grupos.isEmpty) return const Text('No hay reservas registradas.', style: TextStyle(fontSize: 12));
  // Si todas las reservas son del mismo dia, mostrar encabezado con fecha y en cada item solo el rango horario
    DateTime? firstDay;
    bool sameDay = true;
    for (final r in reservas) {
      final s = DateTime.tryParse(r['fecha_inicio']?.toString() ?? '');
      if (s == null) { sameDay = false; break; }
      final d = DateTime(s.year, s.month, s.day);
      if (firstDay == null) firstDay = d;
      else if (firstDay.year != d.year || firstDay.month != d.month || firstDay.day != d.day) { sameDay = false; break; }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          sameDay && firstDay != null ? 'Calendario de ocupación · ${DateTimeFmt.d(firstDay)}' : 'Calendario de ocupación',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        ...grupos.entries.map((e) => Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.key, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                ...e.value.map((r) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          sameDay
                              ? '${DateTimeFmt.t(DateTime.parse(r['fecha_inicio']).toLocal())}–${DateTimeFmt.t(DateTime.parse(r['fecha_fin']).toLocal())}'
                              : DateTimeFmt.rangeFromIso(r['fecha_inicio']?.toString(), r['fecha_fin']?.toString()),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(r['estado']?.toString() ?? '', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                    ],
                  ),
                )),
              ],
            ),
          ),
        )),
      ],
    );
  }
}

class _MisReservas extends StatelessWidget {
  final List<Map<String, dynamic>> misReservas;
  final Future<void> Function(int id) onCancel;
  const _MisReservas({required this.misReservas, required this.onCancel});
  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
  // Filtrar reservas pasadas segun su fecha_fin efectiva (prefiere turno_detalle.fecha_fin)
    final visibles = misReservas.where((r) {
      final finStr = (r['turno_detalle']?['fecha_fin']?.toString() ?? r['fecha_fin']?.toString());
      if (finStr == null || finStr.isEmpty) return true; // si no hay fin, mantener visible
      final fin = DateTime.tryParse(finStr);
      if (fin == null) return true;
      return !fin.isBefore(now);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Mis reservas', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (visibles.isEmpty)
          const Text('No tienes reservas todavía.', style: TextStyle(fontSize: 12))
        else
          ...visibles.map((r) {
            final isTurno = (r['turno'] != null) || (r['turno_detalle'] != null);
            final inicio = (r['turno_detalle']?['fecha_inicio']?.toString() ?? r['fecha_inicio']?.toString() ?? '');
            final fin = (r['turno_detalle']?['fecha_fin']?.toString() ?? r['fecha_fin']?.toString() ?? '');
            return Card(
              child: ListTile(
                title: Text(isTurno ? 'Reserva por turno' : 'Reserva por unidad'),
                subtitle: Text([
                  if (!isTurno) 'Unidad: ${(r['unidad_nombre'] ?? r['unidad']).toString()}',
                  if (inicio.isNotEmpty && fin.isNotEmpty) '${DateTime.parse(inicio).toLocal()} — ${DateTime.parse(fin).toLocal()}',
                  if (r['estado'] != null) 'Estado: ${r['estado']}',
                  if (r['creado_en'] != null) 'Creada: ${DateTime.parse(r['creado_en']).toLocal()}',
                ].where((e) => e.isNotEmpty).join(' | ')),
                trailing: r['estado'] == 'CANCELADA' ? null : FilledButton.tonal(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Cancelar reserva'),
                        content: const Text('¿Deseas cancelar esta reserva? Esta acción no se puede deshacer.'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                          FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text('Sí, cancelar')),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      await onCancel((r['id'] as num).toInt());
                    }
                  },
                  child: const Text('Cancelar'),
                ),
              ),
            );
          }),
      ],
    );
  }
}
