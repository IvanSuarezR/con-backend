import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { areasApi } from '../../api/areas';
import { dashboardApi } from '../../api/dashboard';
import { authService } from '../../api/authService';

export default function AdminHome() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [detailType, setDetailType] = useState(null);
  const [detailItems, setDetailItems] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pollRef = useRef(null);

  const loadMetrics = async () => {
    try {
      const data = await dashboardApi.getAdminMetrics();
      setMetrics(data);
    } catch (e) { /* noop */ }
  };

  const loadInitial = async () => {
    try {
      const [areasData, metricsData] = await Promise.all([
        areasApi.listAreas(),
        dashboardApi.getAdminMetrics(),
      ]);
      setAreas(areasData);
      setMetrics(metricsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // Poll every 20s to keep stats fresh
    pollRef.current = setInterval(loadMetrics, 20000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleLogout = () => {
    try { authService.logout(); } finally { window.location.href = '/login'; }
  };

  const openDetail = async (type) => {
    setDetailType(type);
    setDetailLoading(true);
    setDetailItems(null);
    try {
      const data = await dashboardApi.getAdminDetail(type);
      setDetailItems(data.items || []);
    } catch (e) {
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cuando el modal este abierto, refrescar los detalles periodicamente tambien
  useEffect(() => {
    if (!detailType) return;
    let t = setInterval(() => openDetail(detailType), 20000);
    return () => clearInterval(t);
  }, [detailType]);

  const closeDetail = () => {
    setDetailType(null);
    setDetailItems(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Bienvenido al Panel de Administración</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Stats Cards (clickable for details) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => openDetail('usuarios')} className="text-left bg-white p-6 rounded-lg shadow-sm hover:shadow transition">
          <h3 className="text-gray-500 text-sm">Total Usuarios</h3>
          <p className="text-2xl font-semibold">{metrics ? metrics.total_usuarios : '—'}</p>
        </button>
        <button onClick={() => openDetail('accesos')} className="text-left bg-white p-6 rounded-lg shadow-sm hover:shadow transition">
          <h3 className="text-gray-500 text-sm">Accesos Hoy</h3>
          <p className="text-2xl font-semibold">{metrics ? metrics.accesos_hoy : '—'}</p>
        </button>
        <button onClick={() => openDetail('visitantes')} className="text-left bg-white p-6 rounded-lg shadow-sm hover:shadow transition">
          <h3 className="text-gray-500 text-sm">Visitantes Activas</h3>
          <p className="text-2xl font-semibold">{metrics ? metrics.visitantes_pendientes : '—'}</p>
        </button>
        <button onClick={() => openDetail('alertas')} className="text-left bg-white p-6 rounded-lg shadow-sm hover:shadow transition">
          <h3 className="text-gray-500 text-sm">Alertas</h3>
          <p className="text-2xl font-semibold">{metrics ? metrics.alertas : '—'}</p>
        </button>
      </div>

      {/* Details Modal */}
      {detailType && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {detailType === 'usuarios' && 'Usuarios recientes'}
                {detailType === 'accesos' && 'Accesos de hoy'}
                {detailType === 'visitantes' && 'Autorizaciones activas'}
                {detailType === 'alertas' && 'Alertas no leídas'}
              </h3>
              <button onClick={closeDetail} className="px-2 py-1 text-sm rounded hover:bg-gray-100">Cerrar</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {detailLoading && <div>Cargando...</div>}
              {!detailLoading && (!detailItems || detailItems.length === 0) && (
                <div className="text-gray-500">No hay datos.</div>
              )}
              {!detailLoading && detailItems && detailItems.length > 0 && (
                <ul className="divide-y">
                  {detailType === 'usuarios' && detailItems.map((u) => (
                    <li key={u.id} className="py-2 text-sm">
                      <div className="font-medium">{u.first_name} {u.last_name} <span className="opacity-60">(@{u.username})</span></div>
                      <div className="opacity-70">{u.email}</div>
                    </li>
                  ))}
                  {detailType === 'accesos' && detailItems.map((r, idx) => (
                    <li key={idx} className="py-2 text-sm">
                      <div className="font-medium">
                        {r.tipo_persona_label} · {r.tipo_verificacion_label} {r.exitoso ? '· ✓' : '· ✗'}
                      </div>
                      <div className="opacity-70 text-xs">{new Date(r.fecha_hora).toLocaleString()}</div>
                      {r.persona && r.persona.tipo === 'Residente' && (
                        <div className="text-xs text-gray-700">
                          {r.persona.nombre} (Doc: {r.persona.documento_identidad}) · Familia: {r.persona.familia?.nombre || '-'}
                        </div>
                      )}
                      {r.persona && r.persona.tipo === 'Visitante' && (
                        <div className="text-xs text-gray-700">
                          {r.persona.nombre_completo} (Doc: {r.persona.documento_identidad}) · {r.persona.tipo_acceso}
                          {r.persona.autorizado_por && (
                            <span> · Autorizado por: {r.persona.autorizado_por.nombre || r.persona.autorizado_por.username} (Doc: {r.persona.autorizado_por.documento_identidad})</span>
                          )}
                        </div>
                      )}
                      {r.persona && r.persona.tipo === 'Delivery' && (
                        <div className="text-xs text-gray-700">
                          {r.persona.nombre_completo} · {r.persona.empresa} (Doc: {r.persona.documento_identidad}) · {r.persona.tipo_acceso}
                          {r.persona.autorizado_por && (
                            <span> · Autorizado por: {r.persona.autorizado_por.nombre || r.persona.autorizado_por.username} (Doc: {r.persona.autorizado_por.documento_identidad})</span>
                          )}
                        </div>
                      )}
                      {r.vehiculo && (
                        <div className="text-xs text-gray-600">Vehículo: {r.vehiculo.matricula} · {r.vehiculo.marca} {r.vehiculo.modelo}</div>
                      )}
                    </li>
                  ))}
                  {detailType === 'visitantes' && detailItems.map((a) => (
                    <li key={a.id} className="py-2 text-sm">
                      <div className="font-medium">{a.visitante?.nombre_completo} · {a.status}</div>
                      <div className="opacity-70">Vigencia: {new Date(a.fecha_inicio).toLocaleString()} → {new Date(a.fecha_fin).toLocaleString()}</div>
                      <div className="opacity-70">Creado por: {a.autorizado_por?.nombre || a.autorizado_por?.username} (Doc: {a.autorizado_por?.documento_identidad})</div>
                    </li>
                  ))}
                  {detailType === 'alertas' && detailItems.map((n) => (
                    <li key={n.id} className="py-2 text-sm">
                      <div className="font-medium">{n.tipo}</div>
                      <div className="opacity-70">{n.mensaje}</div>
                      <div className="opacity-50 text-xs">{new Date(n.fecha_creacion).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
