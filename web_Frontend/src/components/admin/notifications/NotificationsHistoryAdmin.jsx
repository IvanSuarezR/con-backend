import React, { useEffect, useMemo, useState } from 'react';
import { notificationsApi } from '../../../api/notifications';
import { residentService } from '../../../api/residentService';

export default function NotificationsHistoryAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('resumen'); // resumen | detalle

  // Filters
  const [tipo, setTipo] = useState('');
  const [orden, setOrden] = useState('reciente'); // reciente | antiguo
  const [rango, setRango] = useState('hoy'); // hoy | semana | mes | personalizado | todo
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [familias, setFamilias] = useState([]);
  const [residentes, setResidentes] = useState([]);

  // Detail view
  const [selectedBid, setSelectedBid] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [detail, setDetail] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailLeida, setDetailLeida] = useState('');

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [fams, ress] = await Promise.all([
          residentService.listFamilies(),
          residentService.listResidents(),
        ]);
        setFamilias(fams);
        setResidentes(ress);
      } catch {}
    };
    loadLists();
  }, []);

  const actualRange = useMemo(() => {
    const now = new Date();
    if (rango === 'hoy') {
      const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { desde: d0.toISOString(), hasta: d1.toISOString() };
    }
    if (rango === 'semana') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7; // Monday as start
      const start = new Date(now); start.setDate(now.getDate() - diffToMonday); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    if (rango === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    if (rango === 'personalizado') { return { desde, hasta }; }
    return {};
  }, [rango, desde, hasta]);

  const load = async () => {
    try {
      setLoading(true); setError('');
      const params = { ...(tipo ? { tipo } : {}), ...actualRange };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notificaciones/historial/?${new URLSearchParams(params).toString()}`, {
        headers: localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      const data = await res.json();
      let arr = data.items || [];
      arr = arr.sort((a,b) => orden === 'reciente' ? (new Date(b.fecha) - new Date(a.fecha)) : (new Date(a.fecha) - new Date(b.fecha)));
      setItems(arr);
    } catch (e) {
      setError(e?.message || 'Error al cargar');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tipo, orden, actualRange.desde, actualRange.hasta]);

  const openDetail = async (bid, summary) => {
    setSelectedBid(bid);
    setSelectedSummary(summary || null);
    setDetail([]); setDetailLoading(true); setDetailSearch(''); setDetailLeida('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notificaciones/historial/${bid}/`, {
        headers: localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      const data = await res.json();
      setDetail(data.items || []);
    } catch {
    } finally { setDetailLoading(false); }
    setTab('detalle');
  };

  const familyMap = useMemo(() => new Map(familias.map(f=>[f.id,f])), [familias]);

  const filteredDetail = useMemo(() => {
    let list = detail;
    if (detailLeida === 'true') list = list.filter(x => x.leida);
    if (detailLeida === 'false') list = list.filter(x => !x.leida);
    const q = detailSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(n => {
      const full = (n.residente_nombre || '').toLowerCase();
      const usern = (n.usuario_username || '').toLowerCase();
      const doc = (n.residente_documento || '').toLowerCase();
      const fam = (n.familia_nombre || '').toLowerCase();
      return full.includes(q) || usern.includes(q) || doc.includes(q) || fam.includes(q);
    });
  }, [detail, detailSearch, detailLeida]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Historial de notificaciones</h1>

      {/* Tabs */}
      <div className="mb-4 border-b">
        <nav className="flex gap-4">
          <button className={`px-3 py-2 ${tab==='resumen' ? 'border-b-2 border-indigo-600 text-indigo-700 font-medium' : 'text-gray-600 hover:text-gray-800'}`} onClick={()=>setTab('resumen')}>Envíos</button>
          <button className={`px-3 py-2 ${tab==='detalle' ? 'border-b-2 border-indigo-600 text-indigo-700 font-medium' : 'text-gray-600 hover:text-gray-800'}`} onClick={()=>selectedBid ? setTab('detalle') : null} disabled={!selectedBid}>Detalle</button>
        </nav>
      </div>

      {tab === 'resumen' && (
        <>
          <div className="bg-white rounded border p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="border rounded px-2 py-2 text-sm" value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option value="">Tipo</option>
              {['AVISO','EMERGENCIA','MULTA','ACTIVIDAD','AUTORIZACION_CREADA','AUTORIZACION_EXTENDIDA','AUTORIZACION_VENCIDA','AUTORIZACION_UTILIZADA','ACCESO_DENEGADO'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-2 text-sm" value={orden} onChange={e=>setOrden(e.target.value)}>
              <option value="reciente">Más reciente</option>
              <option value="antiguo">Más antiguo</option>
            </select>
            <select className="border rounded px-2 py-2 text-sm" value={rango} onChange={e=>setRango(e.target.value)}>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="personalizado">Fecha personalizada</option>
              <option value="todo">Todo</option>
            </select>
            <input type="datetime-local" className="border rounded px-2 py-2 text-sm" value={desde} onChange={e=>setDesde(e.target.value)} disabled={rango!=='personalizado'} />
            <input type="datetime-local" className="border rounded px-2 py-2 text-sm" value={hasta} onChange={e=>setHasta(e.target.value)} disabled={rango!=='personalizado'} />
          </div>

          <div className="bg-white rounded border">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Cargando...</div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Sin envíos en el rango seleccionado. Prueba cambiando filtros o crea un envío desde la sección "Notificaciones".</div>
            ) : (
              <div className="divide-y">
                {items.map(it => (
                  <button key={it.broadcast_id} onClick={()=>openDetail(it.broadcast_id, it)} className="w-full text-left p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">{new Date(it.fecha).toLocaleString()}</div>
                        <div className="font-medium">{it.titulo || it.tipo}</div>
                      </div>
                      <div className="text-sm text-gray-600">Total: {it.total} · Leídas: {it.leidas} · No leídas: {it.no_leidas}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'detalle' && selectedBid && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Envío: <span className="font-medium">{selectedSummary?.titulo || selectedSummary?.tipo || selectedBid}</span> · Fecha de envío: <span className="font-medium">{selectedSummary?.fecha ? new Date(selectedSummary.fecha).toLocaleString() : '—'}</span></div>
            <button className="text-sm px-3 py-1 rounded border hover:bg-gray-50" onClick={()=>setTab('resumen')}>Volver a envíos</button>
          </div>
          {/* Notificación completa (colapsable) */}
          <NotificationPreview detail={detail} />

          <div className="bg-white rounded border p-4 mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder="Buscar por residente, usuario admin, carnet, familia" value={detailSearch} onChange={e=>setDetailSearch(e.target.value)} className="border rounded px-3 py-2" />
            <select className="border rounded px-2 py-2 text-sm" value={detailLeida} onChange={e=>setDetailLeida(e.target.value)}>
              <option value="">Estado</option>
              <option value="true">Leída</option>
              <option value="false">No leída</option>
            </select>
          </div>
          <div className="bg-white rounded border">
            {detailLoading ? (
              <div className="p-4 text-sm text-gray-500">Cargando...</div>
            ) : (
              <div className="divide-y">
                {filteredDetail.map(n => (
                  <div key={n.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Enviada: {new Date(n.fecha_creacion).toLocaleString()}</div>
                        <div className="font-medium">{n.residente_nombre || n.usuario_username || '—'}</div>
                        <div className="text-xs text-gray-600">{n.residente_documento || ''}</div>
                        <div className="text-[11px] text-gray-500">{n.familia_nombre ? `Familia: ${n.familia_nombre}` : (n.usuario_username ? 'Administrador' : '')}</div>
                        {n.leida && (
                          <div className="text-xs text-green-700 mt-1">Leída: {n.fecha_lectura ? new Date(n.fecha_lectura).toLocaleString() : ''}</div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${n.leida ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{n.leida ? 'Leída' : 'No leída'}</span>
                    </div>
                  </div>
                ))}
                {filteredDetail.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">No hay resultados</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationPreview({ detail }) {
  const [open, setOpen] = useState(false);
  // Tomamos la primera notificación para reconstruir el mensaje (todas comparten título/mensaje)
  const sample = detail && detail.length > 0 ? detail[0] : null;
  if (!sample) return null;
  return (
    <div className="bg-white rounded border p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">Ver notificación completa</div>
        <button className="text-sm px-3 py-1 rounded border hover:bg-gray-50" onClick={()=>setOpen(o=>!o)}>{open ? 'Ocultar' : 'Mostrar'}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-1 text-sm">
          <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">{sample.tipo}</span></div>
          {sample.titulo ? <div><span className="text-gray-500">Título:</span> <span className="font-medium">{sample.titulo}</span></div> : null}
          <div><span className="text-gray-500">Mensaje:</span> <span>{sample.mensaje}</span></div>
          {sample.datos_extra ? (
            <div className="mt-2">
              <div className="text-gray-500">Datos extra:</div>
              <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-40">{JSON.stringify(sample.datos_extra, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
