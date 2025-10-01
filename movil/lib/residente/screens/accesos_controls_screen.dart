import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';
// import '../../services/accesos_service.dart';
import '../access_control.dart';

abstract class _HasTokenProvider {
  String? Function() get tokenProvider;
}

class ResidentAccesosScreen extends StatelessWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const ResidentAccesosScreen({super.key, required this.tokenProvider});
  @override
  Widget build(BuildContext context) {
    return _AccesosControls(tokenProvider: tokenProvider);
  }
}

class _AccesosControls extends StatefulWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const _AccesosControls({required this.tokenProvider});
  @override
  State<_AccesosControls> createState() => _AccesosControlsState();
}

class _AccesosControlsState extends State<_AccesosControls> {
  final access = AccessControlController.instance;
  late final userApi = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  Map<String, dynamic>? me;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadMe();
  }

  Future<void> _loadMe() async {
    setState(() { loading = true; error = null; });
    try {
      final res = await userApi.get('/api/users/me/');
      if (res.statusCode == 200) {
        me = userApi.decodeJson<Map<String, dynamic>>(res);
      } else {
        error = 'Error ${res.statusCode}';
      }
    } catch (e) {
      error = 'Error de red';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  bool get canPorton => me?['residente']?['puede_abrir_porton'] == true;
  bool get canPuerta => me?['residente']?['puede_abrir_puerta'] == true;

  Future<void> _runOpenPorton() async {
    setState(() { loading = true; error = null; });
    try {
      await access.openPorton();
    } catch (_) {}
    if (mounted) setState(() { loading = false; });
  }
  Future<void> _runClosePorton() async {
    setState(() { loading = true; error = null; });
    try {
      await access.closePorton();
    } catch (_) {}
    if (mounted) setState(() { loading = false; });
  }
  Future<void> _runOpenPuerta() async {
    setState(() { loading = true; error = null; });
    try {
      await access.openPuerta();
    } catch (_) {}
    if (mounted) setState(() { loading = false; });
  }
  Future<void> _runClosePuerta() async {
    setState(() { loading = true; error = null; });
    try {
      await access.closePuerta();
    } catch (_) {}
    if (mounted) setState(() { loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading) const LinearProgressIndicator(),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Portón vehicular', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Wrap(spacing: 12, runSpacing: 8, children: [
                  FilledButton.icon(
                    onPressed: canPorton ? _runOpenPorton : null,
                    icon: const Icon(Icons.garage_outlined),
                    label: const Text('Abrir portón'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: canPorton ? _runClosePorton : null,
                    icon: const Icon(Icons.garage),
                    label: const Text('Cerrar portón'),
                  ),
                ]),
                if (!canPorton)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('No tienes permiso para operar el portón', style: TextStyle(color: cs.error)),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Puerta peatonal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Wrap(spacing: 12, runSpacing: 8, children: [
                  FilledButton.icon(
                    onPressed: canPuerta ? _runOpenPuerta : null,
                    icon: const Icon(Icons.door_front_door_outlined),
                    label: const Text('Abrir puerta'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: canPuerta ? _runClosePuerta : null,
                    icon: const Icon(Icons.meeting_room),
                    label: const Text('Cerrar puerta'),
                  ),
                ]),
                if (!canPuerta)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('No tienes permiso para operar la puerta', style: TextStyle(color: cs.error)),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Align(
        //   alignment: Alignment.centerRight,
        //   child: FilledButton.icon(
        //     onPressed: _loadMe,
        //     icon: const Icon(Icons.refresh),
        //     label: const Text('Actualizar permisos'),
        //   ),
        // ),
      ],
    );
  }
}
