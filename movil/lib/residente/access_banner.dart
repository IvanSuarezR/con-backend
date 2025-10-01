import 'package:flutter/material.dart';
import 'access_control.dart';

/// Wrap any subtree to show a global access banner when an access is open.
/// Place this high in the tree (e.g., MaterialApp.builder) so all routes are covered.
class AccessBannerHost extends StatelessWidget {
  final Widget child;
  const AccessBannerHost({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final controller = AccessControlController.instance;
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final s = controller.openState;
        final mq = MediaQuery.of(context);
        final topOffset = mq.padding.top + kToolbarHeight; // place below AppBar
        return Stack(
          children: [
            child,
            if (s != null)
              Positioned(
                left: 0,
                right: 0,
                top: topOffset,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _BannerCard(controller: controller),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _BannerCard extends StatelessWidget {
  final AccessControlController controller;
  const _BannerCard({required this.controller});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final s = controller.openState!;
    final isPorton = s.tipo == 'porton';
    final title = isPorton ? 'Portón abierto' : 'Puerta abierta';
    final bg = isPorton ? cs.primaryContainer : cs.tertiaryContainer;
    final fg = isPorton ? cs.onPrimaryContainer : cs.onTertiaryContainer;
    return Material(
      color: bg,
      elevation: 2,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Icon(isPorton ? Icons.garage : Icons.door_front_door, color: fg),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: fg)),
                  const SizedBox(height: 4),
                  Text('Se cerrará automáticamente en ${controller.formatTime(s.remaining)}', style: TextStyle(color: fg)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            FilledButton.tonal(
              onPressed: controller.busy
                  ? null
                  : () => isPorton ? controller.closePorton() : controller.closePuerta(),
              child: Text(isPorton ? 'Cerrar portón ahora' : 'Cerrar puerta ahora'),
            ),
          ],
        ),
      ),
    );
  }
}
