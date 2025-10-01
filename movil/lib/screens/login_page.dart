import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../config/env.dart';

class LoginPage extends StatefulWidget {
  final ValueChanged<String> onLoggedIn;
  const LoginPage({super.key, required this.onLoggedIn});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  late final AuthService _auth = AuthService(baseUrl: backendBaseUrl);
  String? _submitError;
  String? _userError;
  String? _passError;

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _doLogin() async {
    _submitError = null;
    if (!_formKey.currentState!.validate()) {
      setState(() {});
      return;
    }
    setState(() => _loading = true);
    final token = await _auth.login(_userCtrl.text, _passCtrl.text);
    setState(() => _loading = false);
    if (token != null) {
      widget.onLoggedIn(token);
    } else {
      if (!mounted) return;
      setState(() => _submitError = 'Usuario o contraseña inválidos');
    }
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFFF9FAFB); // bg-gray-50
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 16),
                  const Text(
                    'Iniciar Sesión',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: _userCtrl,
                            onChanged: (_) => setState(() => _userError = null),
                            decoration: InputDecoration(
                              labelText: 'Usuario',
                              errorText: _userError,
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                _userError = 'El usuario es requerido';
                                return _userError;
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _passCtrl,
                            obscureText: true,
                            onChanged: (_) => setState(() => _passError = null),
                            decoration: InputDecoration(
                              labelText: 'Contraseña',
                              errorText: _passError,
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) {
                                _passError = 'La contraseña es requerida';
                                return _passError;
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          if (_submitError != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _submitError!,
                                style: TextStyle(color: Colors.red.shade700),
                              ),
                            ),
                          const SizedBox(height: 16),
                          SizedBox(
                            height: 44,
                            child: FilledButton(
                              onPressed: _loading ? null : _doLogin,
                              child: _loading
                                  ? const Text('Iniciando sesión...')
                                  : const Text('Iniciar Sesión'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
