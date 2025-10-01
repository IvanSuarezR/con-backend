import React, { useEffect, useState } from 'react';
import { userService } from '../../api/userService';
import { useAccessControl } from '../../context/AccessControlContext';
// QR/Visitas features moved to VisitasPanel

const AccesosPanel = () => {
  const [me, setMe] = useState(null);
  const [placa, setPlaca] = useState('');
  // busy proviene del AccessControlContext
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState({ open: false, action: null });
  const { openState, openPorton, closePorton, openPuerta, closePuerta, busy } = useAccessControl();
  // QR state removed from this panel

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const profile = await userService.getMe();
        if (mounted) setMe(profile);
      } catch {}
    };
    load();
    return () => { mounted = false };
  }, []);

  const isPrincipal = me?.residente?.tipo === 'PRINCIPAL';
  const canPorton = !!(me?.is_staff || isPrincipal || me?.residente?.puede_abrir_porton);
  const canPuerta = !!(me?.is_staff || isPrincipal || me?.residente?.puede_abrir_puerta);

  // timers y banner ahora son globales en el layout; este panel se enfoca en controles y permisos

  const openGate = async () => {
    setMsg('');
    await openPorton(placa || undefined);
  };

  const closeGate = async () => {
    setMsg('');
    await closePorton(false);
  };

  const openDoor = async () => {
    setMsg('');
    await openPuerta();
  };

  const closeDoor = async () => {
    setMsg('');
    await closePuerta(false);
  };

  const triggerConfirm = (action) => {
    if (busy) return;
    setConfirm({ open: true, action });
  };

  const handleConfirm = async () => {
    const action = confirm.action;
    setConfirm({ open: false, action: null });
    if (action === 'porton-open') return openGate();
    if (action === 'porton-close') return closeGate();
    if (action === 'puerta-open') return openDoor();
    if (action === 'puerta-close') return closeDoor();
  };

  const handleCancel = () => setConfirm({ open: false, action: null });

  const confirmTexts = (action) => {
    switch (action) {
      case 'porton-open':
        return { title: 'Confirmar apertura de portón', body: '¿Deseas abrir el portón vehicular ahora?' };
      case 'porton-close':
        return { title: 'Confirmar cierre de portón', body: '¿Deseas cerrar el portón vehicular ahora?' };
      case 'puerta-open':
        return { title: 'Confirmar apertura de puerta', body: '¿Deseas abrir la puerta peatonal ahora?' };
      case 'puerta-close':
        return { title: 'Confirmar cierre de puerta', body: '¿Deseas cerrar la puerta peatonal ahora?' };
      default:
        return { title: 'Confirmar', body: '¿Deseas continuar?' };
    }
  };

  // El banner se renderiza globalmente en ResidenteLayout; aqui no se pinta

  // QR handlers removed

  return (
    <div className="space-y-6">
      {/* el banner global se muestra en ResidenteLayout */}

      <h2 className="text-xl font-semibold">Control de Accesos</h2>
      {!(canPorton || canPuerta) && (
        <div className="p-3 rounded bg-yellow-50 text-yellow-800 text-sm">No tienes permisos para abrir/cerrar el portón. Solicita acceso al residente principal.</div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">Puerta Peatonal</h3>
        <div className="flex gap-3">
          <button disabled={!canPuerta || busy} onClick={() => triggerConfirm('puerta-open')} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">Abrir puerta</button>
          <button disabled={!canPuerta || busy} onClick={() => triggerConfirm('puerta-close')} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Cerrar puerta</button>
        </div>
      </div>


      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">Portón Vehicular</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700">Placa (opcional)</label>
            <input value={placa} onChange={(e) => setPlaca(e.target.value)} className="mt-1 border rounded px-3 py-2" placeholder="ABC123" />
          </div>
          <div className="flex gap-3">
            <button disabled={!canPorton || busy} onClick={() => triggerConfirm('porton-open')} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">Abrir portón</button>
            <button disabled={!canPorton || busy} onClick={() => triggerConfirm('porton-close')} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Cerrar portón</button>
          </div>
        </div>
  {msg && <div className="text-sm text-gray-700">{msg}</div>}
      </div>

      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h4 className="text-lg font-semibold mb-2">{confirmTexts(confirm.action).title}</h4>
            <p className="text-sm text-gray-600 mb-4">{confirmTexts(confirm.action).body}</p>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-4 py-2 rounded border">Cancelar</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-3">
        <h3 className="font-medium">Reconocimiento IA (simulado)</h3>
        <div className="text-sm text-gray-600">Si no tienes el teléfono, la cámara peatonal reconocerá tu rostro; si vas en vehículo, el LPR leerá tu placa.</div>
      </div>

    </div>
  );
};

export default AccesosPanel;
