import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'residente/common.dart';
import 'residente/screens/screens.dart';
import 'residente/dashboard.dart';
import 'screens/login_page.dart';
import 'screens/home_page.dart';
// local storage removed for test: session only in-memory
import 'config/env.dart';
import 'residente/access_control.dart';
import 'residente/access_banner.dart';
import 'residente/screens/area_detalle_screen.dart';

// Simple in-memory auth state (placeholder)
class AuthState extends ChangeNotifier {
  String? _token; // JWT access token
  bool get loggedIn => _token != null;
  String? get token => _token;

  void loginWithToken(String token) {
    _token = token;
    notifyListeners();
  }

  void logout() {
    _token = null;
    notifyListeners();
  }
}

void main() {
  // Quick visibility to ensure the correct backend URL is being used at runtime
  // ignore: avoid_print
  print('backendBaseUrl: $backendBaseUrl');
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final auth = AuthState();
  // No persistent storage in this test build
  @override
  void initState() {
    super.initState();
    // Provide token access for API calls from global access controller
    AccessControlController.instance.tokenProvider = () => auth.token;
  }

  late final GoRouter _router = GoRouter(
    initialLocation: '/login',
    refreshListenable: auth,
    redirect: (context, state) {
      final goingToLogin = state.fullPath == '/login';
      if (!auth.loggedIn && !goingToLogin) return '/login';
      if (auth.loggedIn && goingToLogin) return '/residente';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => LoginPage(onLoggedIn: auth.loginWithToken),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => HomePage(onLogout: auth.logout, token: auth.token),
      ),
      GoRoute(
        path: '/residente',
        builder: (context, state) => ResidenteScaffold(
          title: 'Residente',
          onLogout: auth.logout,
          tokenProvider: () => auth.token,
          child: ResidentDashboardScreen(tokenProvider: () => auth.token),
        ),
        routes: [
          GoRoute(
            path: 'familia',
            builder: (context, state) => ResidenteScaffold(
              title: 'Mi familia',
              onLogout: auth.logout,
              tokenProvider: () => auth.token,
              child: ResidentFamilyScreen(tokenProvider: () => auth.token),
            ),
          ),
          GoRoute(
            path: 'accesos',
            builder: (context, state) => ResidenteScaffold(
              title: 'Accesos',
              onLogout: auth.logout,
              tokenProvider: () => auth.token,
              child: ResidentAccesosScreen(tokenProvider: () => auth.token),
            ),
            routes: [
              GoRoute(
                path: 'visitas',
                builder: (context, state) => ResidenteScaffold(
                  title: 'Visitas',
                  onLogout: auth.logout,
                  tokenProvider: () => auth.token,
                  child: ResidentVisitasScreen(tokenProvider: () => auth.token),
                ),
              ),
              GoRoute(
                path: 'historial',
                builder: (context, state) => ResidenteScaffold(
                  title: 'Historial de visitas',
                  onLogout: auth.logout,
                  tokenProvider: () => auth.token,
                  child: ResidentHistorialScreen(tokenProvider: () => auth.token),
                ),
              ),
            ],
          ),
          GoRoute(
            path: 'areas',
            builder: (context, state) => ResidenteScaffold(
              title: 'Áreas comunes',
              onLogout: auth.logout,
              tokenProvider: () => auth.token,
              child: ResidentAreasScreen(tokenProvider: () => auth.token),
            ),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final idStr = state.pathParameters['id'];
                  final id = int.tryParse(idStr ?? '');
                  return ResidenteScaffold(
                    title: 'Área',
                    onLogout: auth.logout,
                    tokenProvider: () => auth.token,
                    child: id == null
                        ? const Center(child: Text('Área inválida'))
                        : ResidentAreaDetalleScreen(tokenProvider: () => auth.token, areaId: id),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    ],
  );

  // No initState session restore

  @override
  Widget build(BuildContext context) {
  // Tailwind custom primary palette from web tailwind.config.js
  const primary500 = Color(0xFF0EA5E9); // primary-500 (focus ring)
  const primary600 = Color(0xFF0284C7); // primary-600 (primary)
  const primary700 = Color(0xFF0369A1); // primary-700 (pressed/hover)
    const gray50 = Color(0xFFF9FAFB); // gray-50 (page bg)
    const gray300 = Color(0xFFD1D5DB); // gray-300 (input border)
    const gray700 = Color(0xFF374151); // gray-700 (labels)
    const red500 = Color(0xFFEF4444); // red-500 (errors)

    final theme = ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: primary600).copyWith(
        primary: primary600,
      ),
      useMaterial3: true,
      scaffoldBackgroundColor: gray50,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        labelStyle: const TextStyle(color: gray700),
        hintStyle: const TextStyle(color: Color(0xFF9CA3AF)), // gray-400
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: gray300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: gray300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary500, width: 2), // focus:ring primary-500
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: red500),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: red500, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return primary600.withValues(alpha: 0.5); // disabled:opacity-50
            }
            if (states.contains(WidgetState.pressed) || states.contains(WidgetState.hovered)) {
              return primary700; // hover/pressed
            }
            return primary600; // primary-600
          }),
          foregroundColor: WidgetStateProperty.all(Colors.white),
          padding: WidgetStateProperty.all(const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
          textStyle: WidgetStateProperty.all(const TextStyle(fontWeight: FontWeight.w600)),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          elevation: WidgetStateProperty.all(0),
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );

    return MaterialApp.router(
      title: 'Condominio',
      theme: theme,
      builder: (context, child) => AccessBannerHost(child: child ?? const SizedBox.shrink()),
      routerConfig: _router,
    );
  }
}

