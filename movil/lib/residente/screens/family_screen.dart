import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';
import '../../services/resident_service.dart';

abstract class _HasTokenProvider {
  String? Function() get tokenProvider;
}

class ResidentFamilyScreen extends StatefulWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const ResidentFamilyScreen({super.key, required this.tokenProvider});
  @override
  State<ResidentFamilyScreen> createState() => _ResidentFamilyScreenState();
}

class _ResidentFamilyScreenState extends State<ResidentFamilyScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  late final service = ResidentService(api);

  bool loading = true;
  String? error;
  List<Map<String, dynamic>> residents = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      final list = await service.listResidents();
      setState(() { residents = list; });
    } catch (e) {
      setState(() { error = 'Error al cargar familia'; });
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  Future<void> _openEditDialog(Map<String, dynamic> resident, int index) async {
    final result = await showDialog<_EditResult>(
      context: context,
      builder: (context) => _EditResidentDialog(
        initial: resident,
        isPrincipal: (resident['tipo']?.toString().toUpperCase() == 'PRINCIPAL'),
      ),
    );
    if (result == null) return;
    final id = (resident['id'] as num?)?.toInt();
    if (id == null) return;
    // Optimistic merge
    final original = residents[index];
    final updated = Map<String, dynamic>.from(original);
    if (result.userChanges.isNotEmpty) {
      final u = Map<String, dynamic>.from((updated['user'] as Map?) ?? {});
      for (final e in result.userChanges.entries) {
        u[e.key] = e.value;
      }
      updated['user'] = u;
    }
    for (final e in result.flagChanges.entries) {
      updated[e.key] = e.value;
    }
    setState(() { residents[index] = updated; });
    try {
      final payload = <String, dynamic>{};
      if (result.userChanges.isNotEmpty) payload['user'] = result.userChanges;
      payload.addAll(result.flagChanges);
      await service.updateResident(id, payload);
    } catch (e) {
      if (!mounted) return;
      setState(() { residents[index] = original; });
      final msg = e.toString();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo guardar: $msg')));
    }
  }

  bool _asBool(dynamic v) => v == true || v == 1 || v == 'true';

  Future<void> _toggleFlag(int id, int index, String key, bool value) async {
    final original = residents[index];
    final updated = Map<String, dynamic>.from(original);
    if (key == 'user.is_active') {
      final u = Map<String, dynamic>.from((updated['user'] as Map?) ?? {});
      u['is_active'] = value;
      updated['user'] = u;
    } else {
      updated[key] = value;
    }
    setState(() { residents[index] = updated; });
    try {
      final payload = key == 'user.is_active' ? {
        'user': {'is_active': value}
      } : { key: value };
      await service.updateResident(id, payload);
    } catch (e) {
      if (!mounted) return;
      setState(() { residents[index] = original; });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo actualizar (${e.toString()})')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading) const LinearProgressIndicator(),
        if (error != null) Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(error!, style: const TextStyle(color: Colors.red)),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: residents.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final r = residents[i];
              final user = (r['user'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
              final id = (r['id'] as num?)?.toInt();
              final isPrincipal = (r['tipo']?.toString().toUpperCase() == 'PRINCIPAL');
              final fullName = '${user['first_name'] ?? ''} ${user['last_name'] ?? ''}'.trim();
              final username = user['username']?.toString() ?? '';
              final titulo = fullName.isEmpty ? username : fullName;
              final subt = [
                if ((r['documento_identidad'] ?? '').toString().isNotEmpty) r['documento_identidad'].toString(),
                r['tipo']?.toString() ?? '',
              ].where((s) => s.isNotEmpty).join(' · ');

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                                if (subt.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(subt, style: const TextStyle(color: Colors.grey)),
                                  ),
                              ],
                            ),
                          ),
                          if (id != null)
                            Switch(
                              value: _asBool(user['is_active']),
                              onChanged: isPrincipal ? null : (v) => _toggleFlag(id, i, 'user.is_active', v),
                              thumbIcon: WidgetStateProperty.resolveWith((states) =>
                                  Icon(states.contains(WidgetState.selected) ? Icons.check : Icons.close)),
                            ),
                          const SizedBox(width: 8),
                          IconButton(
                            tooltip: 'Editar',
                            icon: const Icon(Icons.edit),
                            onPressed: id == null ? null : () => _openEditDialog(r, i),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        runSpacing: 8,
                        spacing: 8,
                        children: [
                          _permSwitch(
                            context: context,
                            label: 'Abrir Portón',
                            value: _asBool(r['puede_abrir_porton']),
                            enabled: !isPrincipal && id != null,
                            onChanged: (v) => _toggleFlag(id!, i, 'puede_abrir_porton', v),
                          ),
                          _permSwitch(
                            context: context,
                            label: 'Abrir Puerta',
                            value: _asBool(r['puede_abrir_puerta']),
                            enabled: !isPrincipal && id != null,
                            onChanged: (v) => _toggleFlag(id!, i, 'puede_abrir_puerta', v),
                          ),
                          _permSwitch(
                            context: context,
                            label: 'QR Peatonal',
                            value: _asBool(r['puede_generar_qr_peatonal']),
                            enabled: !isPrincipal && id != null,
                            onChanged: (v) => _toggleFlag(id!, i, 'puede_generar_qr_peatonal', v),
                          ),
                          _permSwitch(
                            context: context,
                            label: 'QR Vehicular',
                            value: _asBool(r['puede_generar_qr_vehicular']),
                            enabled: !isPrincipal && id != null,
                            onChanged: (v) => _toggleFlag(id!, i, 'puede_generar_qr_vehicular', v),
                          ),
                          _permSwitch(
                            context: context,
                            label: 'Reservar Áreas',
                            value: _asBool(r['puede_reservar_areas']),
                            enabled: !isPrincipal && id != null,
                            onChanged: (v) => _toggleFlag(id!, i, 'puede_reservar_areas', v),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: Wrap(spacing: 8, children: [
            FilledButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Recargar'),
            ),
            FilledButton.icon(
              onPressed: () => _openCreateDialog(),
              icon: const Icon(Icons.person_add),
              label: const Text('Agregar Familiar'),
            ),
          ]),
        ),
      ],
    );
  }

  Future<void> _openCreateDialog() async {
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => const _CreateResidentDialog(),
    );
    if (data == null) return;
    try {
      await service.createResident(data);
      await _load();
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo crear: $msg')),
      );
    }
  }
}

Widget _permSwitch({
  required BuildContext context,
  required String label,
  required bool value,
  required bool enabled,
  required ValueChanged<bool> onChanged,
}) {
  return FilterChip(
    label: Text(label),
    selected: value,
    onSelected: enabled ? onChanged : null,
    selectedColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
    checkmarkColor: Theme.of(context).colorScheme.primary,
  );
}

class _EditResult {
  final Map<String, dynamic> userChanges;
  final Map<String, dynamic> flagChanges;
  _EditResult({required this.userChanges, required this.flagChanges});
}

class _EditResidentDialog extends StatefulWidget {
  final Map<String, dynamic> initial;
  final bool isPrincipal;
  const _EditResidentDialog({required this.initial, required this.isPrincipal});
  @override
  State<_EditResidentDialog> createState() => _EditResidentDialogState();
}

class _EditResidentDialogState extends State<_EditResidentDialog> {
  late TextEditingController firstName;
  late TextEditingController lastName;
  late TextEditingController username;
  bool isActive = true;
  bool pPorton = false, pPuerta = false, pQrP = false, pQrV = false, pAreas = false;

  @override
  void initState() {
    super.initState();
    final user = (widget.initial['user'] as Map?)?.cast<String, dynamic>() ?? {};
    firstName = TextEditingController(text: user['first_name']?.toString() ?? '');
    lastName = TextEditingController(text: user['last_name']?.toString() ?? '');
    username = TextEditingController(text: user['username']?.toString() ?? '');
    isActive = user['is_active'] != false;
    pPorton = widget.initial['puede_abrir_porton'] == true;
    pPuerta = widget.initial['puede_abrir_puerta'] == true;
    pQrP = widget.initial['puede_generar_qr_peatonal'] == true;
    pQrV = widget.initial['puede_generar_qr_vehicular'] == true;
    pAreas = widget.initial['puede_reservar_areas'] == true;
  }

  @override
  void dispose() {
    firstName.dispose();
    lastName.dispose();
    username.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Editar familiar'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: firstName, decoration: const InputDecoration(labelText: 'Nombres')),
            const SizedBox(height: 8),
            TextField(controller: lastName, decoration: const InputDecoration(labelText: 'Apellidos')),
            const SizedBox(height: 8),
            TextField(controller: username, decoration: const InputDecoration(labelText: 'Usuario')),
            const SizedBox(height: 8),
            Row(
              children: [
                const Text('Activo'),
                const Spacer(),
                Switch(
                  value: isActive,
                  onChanged: widget.isPrincipal ? null : (v) => setState(() => isActive = v),
                ),
              ],
            ),
            const Divider(height: 16),
            Wrap(runSpacing: 6, spacing: 6, children: [
              FilterChip(label: const Text('Abrir Portón'), selected: pPorton, onSelected: widget.isPrincipal ? null : (v) => setState(() => pPorton = v)),
              FilterChip(label: const Text('Abrir Puerta'), selected: pPuerta, onSelected: widget.isPrincipal ? null : (v) => setState(() => pPuerta = v)),
              FilterChip(label: const Text('QR Peatonal'), selected: pQrP, onSelected: widget.isPrincipal ? null : (v) => setState(() => pQrP = v)),
              FilterChip(label: const Text('QR Vehicular'), selected: pQrV, onSelected: widget.isPrincipal ? null : (v) => setState(() => pQrV = v)),
              FilterChip(label: const Text('Reservar Áreas'), selected: pAreas, onSelected: widget.isPrincipal ? null : (v) => setState(() => pAreas = v)),
            ]),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            final initialUser = (widget.initial['user'] as Map?)?.cast<String, dynamic>() ?? {};
            final newFirst = firstName.text.trim();
            final newLast = lastName.text.trim();
            final newUsername = username.text.trim();
            final currFirst = initialUser['first_name']?.toString() ?? '';
            final currLast = initialUser['last_name']?.toString() ?? '';
            final currUsername = initialUser['username']?.toString() ?? '';
            if (newUsername.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('El usuario no puede estar vacío')));
              return;
            }
            final userChanges = <String, dynamic>{};
            if (newFirst != currFirst) userChanges['first_name'] = newFirst;
            if (newLast != currLast) userChanges['last_name'] = newLast;
            if (newUsername != currUsername) userChanges['username'] = newUsername;
            final currActive = (initialUser['is_active'] != false);
            if (isActive != currActive) userChanges['is_active'] = isActive;
            final flagChanges = <String, dynamic>{
              'puede_abrir_porton': pPorton,
              'puede_abrir_puerta': pPuerta,
              'puede_generar_qr_peatonal': pQrP,
              'puede_generar_qr_vehicular': pQrV,
              'puede_reservar_areas': pAreas,
            };
            Navigator.pop(context, _EditResult(userChanges: userChanges, flagChanges: flagChanges));
          },
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

class _CreateResidentDialog extends StatefulWidget {
  const _CreateResidentDialog();
  @override
  State<_CreateResidentDialog> createState() => _CreateResidentDialogState();
}

class _CreateResidentDialogState extends State<_CreateResidentDialog> {
  final _form = GlobalKey<FormState>();
  final firstName = TextEditingController();
  final lastName = TextEditingController();
  final username = TextEditingController();
  final password = TextEditingController();
  final confirmPassword = TextEditingController();
  final docId = TextEditingController();
  bool pPorton = false, pPuerta = false, pQrP = false, pQrV = false, pAreas = false;

  @override
  void dispose() {
    firstName.dispose();
    lastName.dispose();
    username.dispose();
    password.dispose();
    confirmPassword.dispose();
    docId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Agregar familiar'),
      content: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(controller: firstName, decoration: const InputDecoration(labelText: 'Nombres')),
              const SizedBox(height: 8),
              TextFormField(controller: lastName, decoration: const InputDecoration(labelText: 'Apellidos')),
              const SizedBox(height: 8),
              TextFormField(
                controller: docId,
                decoration: const InputDecoration(labelText: 'Documento de identidad'),
                validator: (v) => (v==null||v.trim().isEmpty) ? 'Requerido' : null,
              ),
              const SizedBox(height: 8),
              TextFormField(controller: username, decoration: const InputDecoration(labelText: 'Usuario'), validator: (v) => (v==null||v.trim().isEmpty) ? 'Requerido' : null),
              const SizedBox(height: 8),
              TextFormField(controller: password, decoration: const InputDecoration(labelText: 'Contraseña'), obscureText: true, validator: (v) => (v==null||v.trim().length<6) ? 'Mínimo 6 caracteres' : null),
              const SizedBox(height: 8),
              TextFormField(
                controller: confirmPassword,
                decoration: const InputDecoration(labelText: 'Confirmar contraseña'),
                obscureText: true,
                validator: (v) {
                  final val = v?.trim() ?? '';
                  if (val.isEmpty) return 'Requerido';
                  if (val != password.text) return 'Las contraseñas no coinciden';
                  return null;
                },
              ),
              const Divider(height: 16),
              Wrap(runSpacing: 6, spacing: 6, children: [
                FilterChip(label: const Text('Abrir Portón'), selected: pPorton, onSelected: (v) => setState(() => pPorton = v)),
                FilterChip(label: const Text('Abrir Puerta'), selected: pPuerta, onSelected: (v) => setState(() => pPuerta = v)),
                FilterChip(label: const Text('QR Peatonal'), selected: pQrP, onSelected: (v) => setState(() => pQrP = v)),
                FilterChip(label: const Text('QR Vehicular'), selected: pQrV, onSelected: (v) => setState(() => pQrV = v)),
                FilterChip(label: const Text('Reservar Áreas'), selected: pAreas, onSelected: (v) => setState(() => pAreas = v)),
              ]),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_form.currentState!.validate()) return;
            final payload = {
              'user': {
                'first_name': firstName.text.trim(),
                'last_name': lastName.text.trim(),
                'username': username.text.trim(),
                'password': password.text,
              },
              'documento_identidad': docId.text.trim(),
              'tipo': 'FAMILIAR',
              'puede_abrir_porton': pPorton,
              'puede_abrir_puerta': pPuerta,
              'puede_generar_qr_peatonal': pQrP,
              'puede_generar_qr_vehicular': pQrV,
              'puede_reservar_areas': pAreas,
            };
            Navigator.pop(context, payload);
          },
          child: const Text('Crear'),
        ),
      ],
    );
  }
}
