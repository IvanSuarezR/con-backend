import React, { useEffect, useMemo, useState } from 'react';
import { visitorService } from '../../api/visitorService';

const HistorialVisitas = () => {
  const [auths, setAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // VENCIDA | CANCELADA | UTILIZADA | ''(cualquiera no vigente)
  const [modalidad, setModalidad] = useState(''); // P|V|''
  const [desde, setDesde] = useState(''); // date
  const [hasta, setHasta] = useState(''); // date

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await visitorService.listAutorizaciones();
        setAuths(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('No se pudieron cargar las autorizaciones');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const isVigente = (a) => {
    const now = new Date();
    const ini = new Date(a.fecha_inicio);
    const fin = new Date(a.fecha_fin);
    return a.status === 'ACTIVA' && now >= ini && now <= fin;
  };

  const historialItems = useMemo(() => auths.filter(a => !isVigente(a)), [auths]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return historialItems.filter(a => {
  if (status && a.status !== status) return false;
  const tipo = a.visitante?.tipo_acceso;
  if (modalidad && tipo !== modalidad) return false;
      if (ql) {
        const nombre = (a.visitante?.nombre_completo || '').toLowerCase();
        const codigo = (a.codigo_qr || '').toLowerCase();
        if (!nombre.includes(ql) && !codigo.includes(ql)) return false;
      }
      if (desde) {
        const d = new Date(desde);
        if (new Date(a.fecha_fin) < d) return false; // fin antes del desde => fuera
      }
      if (hasta) {
        const h = new Date(hasta);
        const fin = new Date(a.fecha_fin);
  // incluir todo el dia hasta 23:59
        h.setHours(23,59,59,999);
        if (fin > h) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin));
  }, [historialItems, q, status, modalidad, desde, hasta]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Historial de visitas</h2>

      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input placeholder="Buscar por nombre o código" className="border rounded px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="border rounded px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Estado</option>
            <option value="VENCIDA">Vencida</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="UTILIZADA">Utilizada</option>
          </select>
          <select className="border rounded px-2 py-2 text-sm" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
            <option value="">Modalidad</option>
            <option value="P">Peatonal</option>
            <option value="V">Vehicular</option>
          </select>
          <input type="date" className="border rounded px-2 py-2 text-sm" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" className="border rounded px-2 py-2 text-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <button className="px-3 py-2 rounded border text-sm" onClick={() => { setQ(''); setStatus(''); setModalidad(''); setDesde(''); setHasta(''); }}>Limpiar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        {loading ? (
          <div className="text-sm text-gray-600">Cargando...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="divide-y">
            {filtered.length === 0 && <div className="text-sm text-gray-500">No hay elementos en el historial</div>}
            {filtered.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{a.visitante?.nombre_completo || 'Visitante'} <span className="ml-2 text-xs text-gray-500">{a.visitante?.tipo_acceso === 'V' ? 'Vehicular' : 'Peatonal'}</span></div>
                  <div className="text-xs text-gray-600">{new Date(a.fecha_inicio).toLocaleString()} → {new Date(a.fecha_fin).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Código: <span className="font-mono">{a.codigo_qr}</span></div>
                </div>
                {(() => {
                  const statusClass = a.status === 'VENCIDA' ? 'text-orange-700 bg-orange-50' : a.status === 'CANCELADA' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50';
                  return <div className={`text-xs px-2 py-1 rounded border ${statusClass}`}>{a.status}</div>;
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialVisitas;
