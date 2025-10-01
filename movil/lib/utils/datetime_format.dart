import 'package:intl/intl.dart';

/// Simple, readable date/time formats used across the app.
/// We intentionally use numeric formats to avoid requiring locale data.
class DateTimeFmt {
  static final _dt = DateFormat('dd/MM/yyyy HH:mm');
  static final _date = DateFormat('dd/MM/yyyy');
  static final _time = DateFormat('HH:mm');

  /// Format a DateTime like 30/09/2025 14:05
  static String dt(DateTime value) => _dt.format(value);

  /// Format date only like 30/09/2025
  static String d(DateTime value) => _date.format(value);

  /// Format time only like 14:05
  static String t(DateTime value) => _time.format(value);

  /// Parse ISO string and format, fallback to the original string when parsing fails
  static String dtFromIso(String? iso) {
    if (iso == null || iso.trim().isEmpty) return '-';
    try {
      final parsed = DateTime.parse(iso).toLocal();
      return dt(parsed);
    } catch (_) {
      return iso;
    }
  }

  /// Format a range. If both same day, compress to "dd/MM/yyyy HH:mm–HH:mm".
  /// Otherwise: "dd/MM/yyyy HH:mm → dd/MM/yyyy HH:mm".
  static String range(DateTime? start, DateTime? end) {
    if (start == null && end == null) return '-';
    if (start == null) return '– ${dt(end!.toLocal())}';
    if (end == null) return '${dt(start.toLocal())} –';
    final s = start.toLocal();
    final e = end.toLocal();
    final sameDay = s.year == e.year && s.month == e.month && s.day == e.day;
    if (sameDay) {
      return '${d(s)} ${t(s)}–${t(e)}';
    }
    return '${dt(s)} → ${dt(e)}';
  }

  /// Range where inputs come as ISO strings.
  static String rangeFromIso(String? startIso, String? endIso) {
    DateTime? s;
    DateTime? e;
    try { if (startIso != null) s = DateTime.parse(startIso); } catch (_) {}
    try { if (endIso != null) e = DateTime.parse(endIso); } catch (_) {}
    return range(s, e);
  }
}
