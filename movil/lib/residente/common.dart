import 'package:flutter/material.dart';
import 'dart:async';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../config/env.dart';
import '../utils/datetime_format.dart';

class ResidenteScaffold extends StatefulWidget {
  final Widget child;
  final String title;
  final VoidCallback? onLogout;
  final String? Function()? tokenProvider;
  const ResidenteScaffold({super.key, required this.child, this.title = 'Residente', this.onLogout, this.tokenProvider});

  @override
  State<ResidenteScaffold> createState() => _ResidenteScaffoldState();
}

class _ResidenteScaffoldState extends State<ResidenteScaffold> {
  Map<String, dynamic>? _me;
  String? _lastToken;
  bool _loadingMe = false;
  late final ApiClient _api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: () => widget.tokenProvider?.call());

  @override
  void initState() {
    super.initState();
    _maybeLoadMe();
  }

  @override
  void didUpdateWidget(covariant ResidenteScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    _maybeLoadMe();
  }

  Future<void> _maybeLoadMe() async {
    final tok = widget.tokenProvider?.call();
    if (tok == null || tok.isEmpty) return;
    if (_lastToken == tok && _me != null) return; // already loaded for this token
    _lastToken = tok;
    setState(() { _loadingMe = true; });
    try {
      final res = await _api.get('/api/users/me/');
      if (!mounted) return;
      if (res.statusCode == 200) {
        _me = _api.decodeJson<Map<String, dynamic>>(res);
      }
    } catch (_) {
      // ignore network errors for header
    } finally {
      if (mounted) setState(() { _loadingMe = false; });
    }
  }

  String _displayName() {
    final m = _me;
    if (m == null) return 'Residente';
    final first = (m['first_name']?.toString() ?? '').trim();
    final last = (m['last_name']?.toString() ?? '').trim();
    final full = '$first $last'.trim();
    if (full.isNotEmpty) return full;
    final username = (m['username']?.toString() ?? '').trim();
    if (username.isNotEmpty) return username;
    return 'Residente';
  }

  String _displayEmail() {
    final m = _me;
    if (m == null) return '';
    final email = (m['email']?.toString() ?? '').trim();
    return email;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    int currentIndex = 0;
    if (location.startsWith('/residente/familia')) {
      currentIndex = 1;
    } else if (location.startsWith('/residente/accesos')) {
      currentIndex = 2;
    } else if (location.startsWith('/residente/areas')) {
      currentIndex = 3;
    } else {
      currentIndex = 0;
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
            tooltip: 'Menú',
          ),
        ),
        actions: [
          _NotificationsBell(tokenProvider: widget.tokenProvider),
          const SizedBox(width: 4),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: (i) {
          switch (i) {
            case 0:
              context.go('/residente');
              break;
            case 1:
              context.go('/residente/familia');
              break;
            case 2:
              context.go('/residente/accesos');
              break;
            case 3:
              context.go('/residente/areas');
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Inicio'),
          BottomNavigationBarItem(icon: Icon(Icons.group), label: 'Familia'),
          BottomNavigationBarItem(icon: Icon(Icons.vpn_key), label: 'Accesos'),
          BottomNavigationBarItem(icon: Icon(Icons.event), label: 'Áreas'),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              DrawerHeader(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const CircleAvatar(child: Icon(Icons.person)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_displayName(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              if (_displayEmail().isNotEmpty)
                                Text(_displayEmail(), style: const TextStyle(color: Colors.grey)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('', style: TextStyle(color: Colors.grey)),
                    if (_loadingMe) const LinearProgressIndicator(minHeight: 2),
                  ],
                ),
              ),
              _NavTile(
                title: 'Inicio',
                selected: location == '/residente',
                onTap: () { Navigator.pop(context); context.go('/residente'); },
              ),
              _NavTile(
                title: 'Mi Familia',
                selected: location.startsWith('/residente/familia'),
                onTap: () { Navigator.pop(context); context.go('/residente/familia'); },
              ),
              _NavTile(
                title: 'Accesos de Puertas',
                selected: location == '/residente/accesos',
                onTap: () { Navigator.pop(context); context.go('/residente/accesos'); },
              ),
              _NavTile(
                title: 'Acceso de Visitas',
                selected: location.startsWith('/residente/accesos/visitas'),
                onTap: () { Navigator.pop(context); context.go('/residente/accesos/visitas'); },
              ),
              _NavTile(
                title: 'Historial de visitas',
                selected: location.startsWith('/residente/accesos/historial'),
                onTap: () { Navigator.pop(context); context.go('/residente/accesos/historial'); },
              ),
              _NavTile(
                title: 'Áreas comunes',
                selected: location.startsWith('/residente/areas'),
                onTap: () { Navigator.pop(context); context.go('/residente/areas'); },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Cerrar sesión'),
                onTap: () {
                  Navigator.pop(context);
                  widget.onLogout?.call();
                  context.go('/login');
                },
              ),
            ],
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Expanded(child: widget.child),
          ],
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final String title;
  final bool selected;
  final VoidCallback onTap;
  const _NavTile({required this.title, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(title),
      selected: selected,
      onTap: onTap,
    );
  }
}

class _NotificationsBell extends StatefulWidget {
  final String? Function()? tokenProvider;
  const _NotificationsBell({this.tokenProvider});
  @override
  State<_NotificationsBell> createState() => _NotificationsBellState();
}

class _NotificationsBellState extends State<_NotificationsBell> {
  late final ApiClient _api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: () => widget.tokenProvider?.call());
  List<Map<String, dynamic>> _items = [];
  bool _loading = false;
  Timer? _poll;

  int get _unreadCount => _items.where((n) => n['leida'] != true).length;

  @override
  void initState() {
    super.initState();
    // Initial silent load to populate badge
    unawaited(_load(silent: true));
    // Periodic polling to keep badge up to date
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      unawaited(_load(silent: true));
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final res = await _api.get('/api/notificaciones/');
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = _api.decodeJson<dynamic>(res);
        List list;
        if (data is List) list = data;
        else if (data is Map && data['results'] is List) list = data['results'];
        else list = const [];
        final next = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (mounted) setState(() { _items = next; });
      }
    } catch (_) {
      // ignore
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _api.post('/api/notificaciones/marcar-leidas/', body: const {});
      if (mounted) {
        setState(() {
          for (final n in _items) { n['leida'] = true; }
        });
      }
    } catch (_) {}
  }

  Future<void> _openSheet() async {
    await _load();
    if (_unreadCount > 0) {
      await _markAllRead();
      // no await: optimistically update
    }
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: false,
      builder: (_) => SafeArea(
        child: SizedBox(
          height: 420,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Text('Notificaciones', style: TextStyle(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    if (_unreadCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(12)),
                        child: Text('$_unreadCount nuevas', style: const TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _items.isEmpty
                        ? const Center(child: Text('Sin notificaciones'))
                        : ListView.separated(
                            itemCount: _items.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (context, i) {
                              final n = _items[i];
                              final fechaStr = n['fecha_creacion']?.toString();
                              DateTime? fecha;
                              try { if (fechaStr != null) fecha = DateTime.parse(fechaStr).toLocal(); } catch (_) {}
                              final unread = n['leida'] != true;
                              final tipo = (n['tipo']?.toString() ?? 'AVISO').toString();
                              final titulo = (n['titulo']?.toString() ?? '').toString();
                              final header = titulo.isNotEmpty ? '$tipo · $titulo' : tipo;
                              return Container(
                                color: unread ? Colors.indigo.shade50 : null,
                                child: ListTile(
                                  title: Text(header),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (fecha != null) Text('${DateTimeFmt.d(fecha)} · ${DateTimeFmt.t(fecha)}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                                      Text(n['mensaje']?.toString() ?? ''),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    ).whenComplete(() async {
      // refresh list after closing to reflect read state
      await _load();
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        IconButton(
          onPressed: _openSheet,
          tooltip: 'Notificaciones',
          icon: const Icon(Icons.notifications_outlined),
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(8)),
              child: Text('$_unreadCount', style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
          ),
      ],
    );
  }
}

// _SubNavTile removed after flattening Accesos menu
