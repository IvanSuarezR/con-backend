// import 'package:shared_preferences/shared_preferences.dart';

// class LocalStorage {
//   static const _kToken = 'auth_token';

//   Future<void> saveToken(String token) async {
//     final prefs = await SharedPreferences.getInstance();
//     await prefs.setString(_kToken, token);
//   }

//   Future<String?> readToken() async {
//     final prefs = await SharedPreferences.getInstance();
//     return prefs.getString(_kToken);
//   }

//   Future<void> clear() async {
//     final prefs = await SharedPreferences.getInstance();
//     await prefs.remove(_kToken);
//   }
// }
