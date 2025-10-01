import React, { createContext, useContext, useRef, useState } from 'react';
import { gateService } from '../api/gateService';

const AccessControlContext = createContext(null);

export const useAccessControl = () => useContext(AccessControlContext);

export const AccessControlProvider = ({ children }) => {
  // state del banner global
  // openState: { tipo: 'porton'|'puerta', remaining: number } | null
  const [openState, setOpenState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastMsg, setLastMsg] = useState('');
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const openPorton = async (placa) => {
    if (openState) { setLastMsg('Ya hay un acceso abierto. Ciérralo antes de abrir otro.'); return; }
    setBusy(true); setLastMsg('');
    try {
      const res = await gateService.abrir('VEHICULAR', placa || undefined);
      setLastMsg(`Portón abierto. ${res?.modo ? `Modo: ${res.modo}` : 'VEHICULAR'}${res?.placa ? ` · Placa: ${res.placa}` : placa ? ` · Placa: ${placa}` : ''}`);
      setOpenState({ tipo: 'porton', remaining: 180 });
      intervalRef.current = setInterval(() => {
        setOpenState(prev => prev ? { ...prev, remaining: Math.max(0, prev.remaining - 1) } : prev);
      }, 1000);
      timeoutRef.current = setTimeout(() => closePorton(true), 180000);
    } catch (e) {
      setLastMsg(e?.response?.data?.detail || 'No se pudo abrir el portón');
    } finally {
      setBusy(false);
    }
  };

  const closePorton = async (auto = false) => {
    setBusy(true); if (!auto) setLastMsg('');
    try {
      const res = await gateService.cerrar('VEHICULAR');
      setLastMsg(`Portón cerrado. ${res?.modo ? `Modo: ${res.modo}` : 'VEHICULAR'}`);
      clearTimers();
      setOpenState(null);
    } catch (e) {
      setLastMsg(e?.response?.data?.detail || 'No se pudo cerrar el portón');
    } finally {
      setBusy(false);
    }
  };

  const openPuerta = async () => {
    if (openState) { setLastMsg('Ya hay un acceso abierto. Ciérralo antes de abrir otro.'); return; }
    setBusy(true); setLastMsg('');
    try {
      const res = await gateService.abrirPeatonal();
      setLastMsg('Puerta abierta.');
      setOpenState({ tipo: 'puerta', remaining: 180 });
      intervalRef.current = setInterval(() => {
        setOpenState(prev => prev ? { ...prev, remaining: Math.max(0, prev.remaining - 1) } : prev);
      }, 1000);
      timeoutRef.current = setTimeout(() => closePuerta(true), 180000);
    } catch (e) {
      setLastMsg(e?.response?.data?.detail || 'No se pudo abrir la puerta');
    } finally {
      setBusy(false);
    }
  };

  const closePuerta = async (auto = false) => {
    setBusy(true); if (!auto) setLastMsg('');
    try {
      const res = await gateService.cerrarPeatonal();
      setLastMsg('Puerta cerrada.');
      clearTimers();
      setOpenState(null);
    } catch (e) {
      setLastMsg(e?.response?.data?.detail || 'No se pudo cerrar la puerta');
    } finally {
      setBusy(false);
    }
  };

  const value = {
    openState,
    busy,
    lastMsg,
    formatTime,
    openPorton,
    closePorton,
    openPuerta,
    closePuerta,
  };

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  );
};
