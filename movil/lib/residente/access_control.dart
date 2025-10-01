import 'dart:async';
import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../config/env.dart';
import '../services/accesos_service.dart';

class AccessOpenState {
  final String tipo; // 'porton' | 'puerta'
  final int remaining;
  final int total;
  const AccessOpenState({required this.tipo, required this.remaining, required this.total});
  AccessOpenState copyWith({String? tipo, int? remaining, int? total}) =>
      AccessOpenState(tipo: tipo ?? this.tipo, remaining: remaining ?? this.remaining, total: total ?? this.total);
}

class AccessControlController extends ChangeNotifier {
  static final AccessControlController instance = AccessControlController._();
  AccessControlController._();

  String? Function()? tokenProvider;

  AccessOpenState? _openState;
  bool _busy = false;
  String _lastMsg = '';
  Timer? _tickTimer;
  Timer? _autoCloseTimer;

  AccessOpenState? get openState => _openState;
  bool get busy => _busy;
  String get lastMsg => _lastMsg;

  String formatTime(int sec) {
    final m = (sec ~/ 60).toString().padLeft(2, '0');
    final s = (sec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _setBusy(bool v) { _busy = v; notifyListeners(); }
  void _setMsg(String msg) { _lastMsg = msg; notifyListeners(); }
  void _clearTimers() {
    _tickTimer?.cancel(); _tickTimer = null;
    _autoCloseTimer?.cancel(); _autoCloseTimer = null;
  }
  void _setOpen(String tipo, {int seconds = 180}) {
    _openState = AccessOpenState(tipo: tipo, remaining: seconds, total: seconds);
    notifyListeners();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_openState == null) return;
      final r = (_openState!.remaining - 1).clamp(0, 9999);
      _openState = _openState!.copyWith(remaining: r);
      notifyListeners();
    });
    _autoCloseTimer = Timer(Duration(seconds: seconds), () {
      if (_openState?.tipo == 'porton') {
        closePorton(auto: true);
      } else if (_openState?.tipo == 'puerta') {
        closePuerta(auto: true);
      }
    });
  }
  void _clearOpen() {
    _clearTimers();
    _openState = null;
    notifyListeners();
  }

  AccesosService _service() {
    final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: () => tokenProvider?.call());
    return AccesosService(api);
  }

  Future<void> openPorton({String? placa}) async {
    if (_openState != null) { _setMsg('Ya hay un acceso abierto. Ciérralo antes de abrir otro.'); return; }
    _setBusy(true); _setMsg('');
    try {
      await _service().abrirPorton();
      _setMsg('Portón abierto.');
      _setOpen('porton');
    } catch (e) {
      _setMsg('No se pudo abrir el portón');
    } finally {
      _setBusy(false);
    }
  }

  Future<void> closePorton({bool auto = false}) async {
    _setBusy(true); if (!auto) _setMsg('');
    try {
      await _service().cerrarPorton();
      _setMsg('Portón cerrado.');
      _clearOpen();
    } catch (e) {
      _setMsg('No se pudo cerrar el portón');
    } finally {
      _setBusy(false);
    }
  }

  Future<void> openPuerta() async {
    if (_openState != null) { _setMsg('Ya hay un acceso abierto. Ciérralo antes de abrir otro.'); return; }
    _setBusy(true); _setMsg('');
    try {
      await _service().abrirPuerta();
      _setMsg('Puerta abierta.');
      _setOpen('puerta');
    } catch (e) {
      _setMsg('No se pudo abrir la puerta');
    } finally {
      _setBusy(false);
    }
  }

  Future<void> closePuerta({bool auto = false}) async {
    _setBusy(true); if (!auto) _setMsg('');
    try {
      await _service().cerrarPuerta();
      _setMsg('Puerta cerrada.');
      _clearOpen();
    } catch (e) {
      _setMsg('No se pudo cerrar la puerta');
    } finally {
      _setBusy(false);
    }
  }
}
