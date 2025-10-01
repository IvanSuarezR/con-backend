import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../config/env.dart';
import '../../services/autorizaciones_service.dart';
// import '../../utils/downloader.dart';
import '../../utils/datetime_format.dart';
import '../../utils/gallery_saver.dart';
import '../../utils/permissions.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:zxing2/qrcode.dart';
import 'package:zxing2/zxing2.dart';
import 'dart:convert';
import 'dart:typed_data';

abstract class _HasTokenProvider {
  String? Function() get tokenProvider;
}

class ResidentVisitasScreen extends StatefulWidget implements _HasTokenProvider {
  @override
  final String? Function() tokenProvider;
  const ResidentVisitasScreen({super.key, required this.tokenProvider});
  @override
  State<ResidentVisitasScreen> createState() => _ResidentVisitasScreenState();
}

class _ResidentVisitasScreenState extends State<ResidentVisitasScreen> {
  late final api = ApiClient(baseUrl: backendBaseUrl, tokenProvider: widget.tokenProvider);
  late final service = AutorizacionesService(api);
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      items = await service.list(params: {'vigente': 'true'});
    } catch (e) {
      error = 'Error al cargar visitas';
    } finally {
      if (mounted) setState(() { loading = false; });
    }
  }

  Future<void> _crearVisita() async {
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => const _CrearVisitaDialog(),
    );
    if (data == null) return;
    try {
      await service.generarQR(data);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('QR generado')));
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo crear: ${e.toString()}')));
    }
  }

  Future<void> _cancelar(Map<String, dynamic> auth) async {
    final id = (auth['id'] as num?)?.toInt();
    if (id == null) return;
  // Confirmacion antes de cancelar
    final nombre = ((auth['visitante'] as Map?)?['nombre_completo']?.toString() ?? 'esta visita');
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancelar autorización'),
        content: Text('¿Deseas cancelar el QR de $nombre? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text('Sí, cancelar')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await service.cancelar(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Autorización cancelada')));
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
    }
  }

  // Extrae el codigo de autorizacion desde un texto QR que puede contener JSON/string con 'codigo'
  String _extractCodigoFromQrText(String text) {
    final t = text.trim();
    // Buscar campo "codigo" en JSON (comillas dobles) o dict (comillas simples)
    final reJson = RegExp(r'"codigo"\s*:\s*"([A-Za-z0-9\-_=:/]+)"');
    final rePy = RegExp(r"'codigo'\s*:\s*'([^']+)'");
    final m1 = reJson.firstMatch(t);
    if (m1 != null) return m1.group(1)!;
    final m2 = rePy.firstMatch(t);
    if (m2 != null) return m2.group(1)!;
  // Buscar token con prefijo tipico
    final reCode = RegExp(r'AV-[A-Z0-9\-]+');
    final m3 = reCode.firstMatch(t.toUpperCase());
    if (m3 != null) return m3.group(0)!;
    return t;
  }

  Future<String> _decodeQrFromImageBytes(Uint8List bytes) async {
    img.Image? raw = img.decodeImage(bytes);
    if (raw == null) throw Exception('No se pudo leer la imagen');

    String attemptDecode(img.Image src) {
  // Construir ARGB int32 por pixel desde RGBA bytes, normalizando si hace falta
      img.Image work = src;
      Uint8List rgba = work.getBytes(order: img.ChannelOrder.rgba);
      final pixelCount = work.width * work.height;
      if (rgba.length != pixelCount * 4) {
  // Normaliza re-encode/decoding a PNG para estabilizar formato y canales
        final normalized = img.decodeImage(img.encodePng(work));
        if (normalized != null) {
          work = normalized;
          rgba = work.getBytes(order: img.ChannelOrder.rgba);
        }
      }
  // Aun si la longitud no coincide, limita el recorrido para evitar RangeError
      final maxPixels = (rgba.length ~/ 4);
      final w = work.width;
      final h = work.height;
      final effectiveCount = (pixelCount <= maxPixels) ? pixelCount : maxPixels;
      final pixels = Int32List(pixelCount);
      int i = 0, j = 0;
      for (; i < effectiveCount; i++, j += 4) {
        final r = rgba[j];
        final g = rgba[j + 1];
        final b = rgba[j + 2];
        pixels[i] = (0xFF << 24) | (r << 16) | (g << 8) | b;
      }
      // Rellena el resto si hizo falta limitar (negro)
      for (; i < pixelCount; i++) {
        pixels[i] = 0xFF000000;
      }
      final source = RGBLuminanceSource(w, h, pixels);
      final bitmap = BinaryBitmap(HybridBinarizer(source));
      final reader = QRCodeReader();
      final res = reader.decode(bitmap);
      return res.text;
    }

    try {
      final text = attemptDecode(raw);
      if (text.isEmpty) throw Exception('QR vacío');
      return text;
    } on RangeError {
      // Reintentar con una imagen reducida para evitar overflows internos
      final maxSide = 1200;
      final w = raw.width, h = raw.height;
      img.Image resized;
      if (w > maxSide || h > maxSide) {
        if (w >= h) {
          resized = img.copyResize(raw, width: maxSide);
        } else {
          resized = img.copyResize(raw, height: maxSide);
        }
      } else {
  // Si no es grande, intenta una ligera reduccion para normalizar buffers
        resized = img.copyResize(raw, width: (w * 0.9).round());
      }
      final text2 = attemptDecode(resized);
      if (text2.isEmpty) throw Exception('QR vacío');
      return text2;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading) const LinearProgressIndicator(),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 420;
            final filledStyle = compact
                ? FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    minimumSize: const Size(0, 36),
                    visualDensity: VisualDensity.compact,
                  )
                : null;
            final outlinedStyle = compact
                ? OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    minimumSize: const Size(0, 36),
                    visualDensity: VisualDensity.compact,
                  )
                : null;
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  style: filledStyle,
                  onPressed: _crearVisita,
                  icon: const Icon(Icons.qr_code_2),
                  label: Text(compact ? 'Generar' : 'Generar QR'),
                ),
                FilledButton.icon(
                  style: filledStyle,
                  onPressed: _load,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Recargar'),
                ),
                OutlinedButton.icon(
                  style: outlinedStyle,
                  onPressed: () async {
                    // 1) Elegir imagen
                    final picker = ImagePicker();
                    final picked = await picker.pickImage(source: ImageSource.gallery);
                    if (picked == null) return;
                    try {
                      final bytes = await picked.readAsBytes();
                      // 2) Decodificar QR con helper robusto (maneja RangeError y tamanos)
                      final text = await _decodeQrFromImageBytes(bytes);
                      final codigo = _extractCodigoFromQrText(text);
                      // 3) Permitir elegir evento/modalidad con codigo prellenado
                      final scan = await showDialog<_ScanResult>(
                        context: context,
                        builder: (_) => _SimularLecturaQrDialog(initialCode: codigo),
                      );
                      if (scan != null) {
                        final r = await service.validarQr(
                          codigoQr: scan.codigo.trim(),
                          evento: scan.evento.trim().toUpperCase(),
                          modalidad: scan.modalidad.trim().toUpperCase(),
                        );
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(r['match'] == true ? 'OK: ${r['accion'] ?? 'VALIDADO'}' : 'Denegado: ${r['reason'] ?? 'Error'}')),
                        );
                        await _load();
                      }
                    } catch (e) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo leer QR: ${e.toString()}')));
                    }
                  },
                  icon: const Icon(Icons.image_search_outlined),
                  label: Text(compact ? 'Leer imagen' : 'Leer desde imagen'),
                ),
              ],
            );
          },
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
              final qrImage = a['qr_image']?.toString();
              return ListTile(
                leading: Icon(tipo == 'Vehicular' ? Icons.directions_car : Icons.directions_walk),
                title: Text(nombre),
                subtitle: Text('$tipo · $status\n$rango\nEntradas: $usadas/$permitidas'),
                isThreeLine: true,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (qrImage != null && qrImage.startsWith('data:image'))
                      IconButton(
                        tooltip: 'Ver QR',
                        icon: const Icon(Icons.qr_code),
                        onPressed: () {
                          showDialog(context: context, builder: (_) => _QrDialog(dataUrl: qrImage));
                        },
                      ),
                    // if (qrImage != null && qrImage.startsWith('data:image'))
                    //   IconButton(
                    //     tooltip: 'Descargar QR',
                    //     icon: const Icon(Icons.download),
                    //     onPressed: () async {
                    //       final messenger = ScaffoldMessenger.of(context);
                    //       final ok = await downloadDataUrl(qrImage, 'qr_visita.png');
                    //       if (!mounted) return;
                    //       messenger.showSnackBar(
                    //         SnackBar(content: Text(ok ? 'QR guardado' : 'Descarga no soportada en esta plataforma')),
                    //       );
                    //     },
                    //   ),
                    if (qrImage != null && qrImage.startsWith('data:image'))
                      IconButton(
                        tooltip: 'Guardar en galería',
                        icon: const Icon(Icons.download),
                        onPressed: () async {
                          final allowed = await AppPermissions.ensurePhotoWritePermission();
                          if (!allowed) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Permiso denegado. Concede acceso a Fotos/Almacenamiento.')),
                            );
                            return;
                          }
                          final ok = await saveImageDataUrlToGallery(qrImage, album: 'Autorizaciones');
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(ok ? 'Guardado en Galería/Fotos' : 'No se pudo guardar en galería')),
                          );
                        },
                      ),
                    if (status == 'ACTIVA')
                      IconButton(
                        tooltip: 'Cancelar',
                        icon: const Icon(Icons.cancel),
                        onPressed: () => _cancelar(a),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ScanResult {
  final String codigo;
  final String evento; // ENTRADA | SALIDA
  final String modalidad; // PEATONAL | VEHICULAR
  _ScanResult(this.codigo, this.evento, this.modalidad);
}

class _SimularLecturaQrDialog extends StatefulWidget {
  final String? initialCode;
  const _SimularLecturaQrDialog({this.initialCode});
  @override
  State<_SimularLecturaQrDialog> createState() => _SimularLecturaQrDialogState();
}

class _SimularLecturaQrDialogState extends State<_SimularLecturaQrDialog> {
  final _formKey = GlobalKey<FormState>();
  final codeCtrl = TextEditingController();
  String evento = 'ENTRADA';
  String modalidad = 'PEATONAL';

  @override
  void dispose() {
    codeCtrl.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    if (widget.initialCode != null) {
      codeCtrl.text = widget.initialCode!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Simular lectura de QR'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: codeCtrl,
              decoration: const InputDecoration(labelText: 'Código QR'),
              validator: (v) => (v==null||v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 8),
            Row(children: [
              const Text('Evento'),
              const Spacer(),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'ENTRADA', label: Text('Entrada')),
                  ButtonSegment(value: 'SALIDA', label: Text('Salida')),
                ],
                selected: {evento},
                onSelectionChanged: (s) => setState(() => evento = s.first),
              ),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              const Text('Modalidad'),
              const Spacer(),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'PEATONAL', label: Text('Peatonal')),
                  ButtonSegment(value: 'VEHICULAR', label: Text('Vehicular')),
                ],
                selected: {modalidad},
                onSelectionChanged: (s) => setState(() => modalidad = s.first),
              ),
            ]),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(context, _ScanResult(codeCtrl.text.trim(), evento, modalidad));
          },
          child: const Text('Validar'),
        ),
      ],
    );
  }
}

class _CrearVisitaDialog extends StatefulWidget {
  const _CrearVisitaDialog();
  @override
  State<_CrearVisitaDialog> createState() => _CrearVisitaDialogState();
}

class _CrearVisitaDialogState extends State<_CrearVisitaDialog> {
  final _formKey = GlobalKey<FormState>();
  final nombreCtrl = TextEditingController();
  final docCtrl = TextEditingController();
  String tipoAcceso = 'P';
  int entradas = 1;
  int duracionMin = 120;
  bool useRange = false;
  DateTime? inicio;
  DateTime? fin;

  @override
  void dispose() {
    nombreCtrl.dispose();
    docCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nueva visita (QR)'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
      contentPadding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      content: Builder(builder: (context) {
        final screen = MediaQuery.of(context).size;
        return ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 360, // mas vertical y menos ancho
            maxHeight: screen.height * 0.6, // limitar altura para evitar overflow
          ),
          child: SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nombreCtrl,
                    decoration: const InputDecoration(labelText: 'Nombre completo', isDense: true),
                    validator: (v) => (v==null||v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: docCtrl,
                    decoration: const InputDecoration(labelText: 'Documento (opcional)', isDense: true),
                  ),
                  const SizedBox(height: 8),
                  const Align(alignment: Alignment.centerLeft, child: Text('Tipo de acceso')),
                  const SizedBox(height: 6),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'P', label: Text('Peatonal'), icon: Icon(Icons.directions_walk)),
                      ButtonSegment(value: 'V', label: Text('Vehicular'), icon: Icon(Icons.directions_car)),
                    ],
                    selected: {tipoAcceso},
                    onSelectionChanged: (s) => setState(() => tipoAcceso = s.first),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<int>(
                    isDense: true,
                    value: entradas,
                    decoration: const InputDecoration(labelText: 'Entradas'),
                    items: const [1,2,3,4,5].map((e) => DropdownMenuItem(value: e, child: Text('$e'))).toList(),
                    onChanged: (v) => setState(() => entradas = v ?? 1),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: useRange,
                    visualDensity: VisualDensity.compact,
                    title: const Text('Definir rango de fecha y hora'),
                    subtitle: const Text('Si está desactivado, se usará una duración desde ahora'),
                    onChanged: (v) => setState(() => useRange = v),
                  ),
                  if (!useRange) ...[
                    TextFormField(
                      initialValue: '$duracionMin',
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Duración (min)', isDense: true),
                      onChanged: (v) {
                        final n = int.tryParse(v) ?? duracionMin;
                        setState(() => duracionMin = n.clamp(1, 10080));
                      },
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    _DateTimeField(
                      label: 'Fecha y hora de inicio',
                      value: inicio,
                      onChanged: (v) => setState(() => inicio = v),
                    ),
                    const SizedBox(height: 8),
                    _DateTimeField(
                      label: 'Fecha y hora de fin',
                      value: fin,
                      onChanged: (v) => setState(() => fin = v),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      }),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            final payload = {
              'nombre_completo': nombreCtrl.text.trim(),
              'documento_identidad': docCtrl.text.trim().isEmpty ? null : docCtrl.text.trim(),
              'tipo_acceso': tipoAcceso,
              'entradas_permitidas': entradas,
            };
            if (useRange) {
              if (inicio == null || fin == null) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selecciona inicio y fin')));
                return;
              }
              if (!fin!.isAfter(inicio!)) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fin debe ser mayor a inicio')));
                return;
              }
              // Enviar como UTC para evitar desfases de zona horaria en el backend
              payload['fecha_inicio'] = inicio!.toUtc().toIso8601String();
              payload['fecha_fin'] = fin!.toUtc().toIso8601String();
            } else {
              payload['duracion_min'] = duracionMin;
            }
            Navigator.pop(context, payload);
          },
          child: const Text('Crear'),
        ),
      ],
    );
  }
}

class _DateTimeField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  const _DateTimeField({required this.label, required this.value, required this.onChanged});

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final base = value ?? now;
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
      initialDate: base,
    );
    if (date == null) return;
    if (!context.mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: base.hour, minute: base.minute),
    );
    if (time == null) return;
    onChanged(DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  @override
  Widget build(BuildContext context) {
    final text = value == null ? 'No seleccionado' : DateTimeFmt.dt(value!.toLocal());
    return InkWell(
      onTap: () => _pick(context),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
        child: Row(
          children: [
            const Icon(Icons.event),
            const SizedBox(width: 8),
            Expanded(child: Text(text)),
            const Icon(Icons.edit_calendar),
          ],
        ),
      ),
    );
  }
}

class _QrDialog extends StatelessWidget {
  final String dataUrl;
  const _QrDialog({required this.dataUrl});
  @override
  Widget build(BuildContext context) {
    Widget qrWidget;
    if (dataUrl.startsWith('data:image')) {
      try {
        final parts = dataUrl.split(',');
        final b64 = parts.sublist(1).join(',');
        final bytes = base64Decode(b64);
        qrWidget = Image.memory(Uint8List.fromList(bytes), width: 220, height: 220, fit: BoxFit.contain);
      } catch (_) {
        qrWidget = Image.network(dataUrl, width: 220, height: 220, fit: BoxFit.contain);
      }
    } else {
      qrWidget = Image.network(dataUrl, width: 220, height: 220, fit: BoxFit.contain);
    }
    return AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('QR de autorización'),
          const SizedBox(height: 8),
          qrWidget,
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cerrar')),
      ],
    );
  }
}
