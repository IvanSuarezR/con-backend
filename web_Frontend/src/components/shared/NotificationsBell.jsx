import React, { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../../api/notifications';

export default function NotificationsBell({ className = '' }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const unreadCount = items.filter(n => !n.leida).length;

  const load = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.list();
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      await notificationsApi.markRead();
      await load();
    } catch {}
  };

  useEffect(() => {
  // Al abrir el menu, marcar todas como leidas automaticamente
    const autoMark = async () => {
      if (open && unreadCount > 0) {
        try {
          await notificationsApi.markRead();
          await load();
        } catch {}
      }
    };
    autoMark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Cerrar al hacer clic fuera y con la tecla Esc
    const handleClick = (e) => {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded hover:bg-gray-100" aria-haspopup="menu" aria-expanded={open}>
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
          <div className="p-2 border-b flex items-center justify-between">
            <div className="font-semibold">Notificaciones</div>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Sin notificaciones</div>
            ) : (
              items.map(n => (
                <div key={n.id} className={`p-3 border-b ${n.leida ? 'bg-white' : 'bg-indigo-50'}`}>
                  <div className="text-xs text-gray-500">{new Date(n.fecha_creacion).toLocaleString()}</div>
                  <div className="font-medium">{n.titulo || n.tipo}</div>
                  <div className="text-sm text-gray-700">{n.mensaje}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
