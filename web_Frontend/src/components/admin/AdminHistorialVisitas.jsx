import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { authService } from '../../api/authService';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const t = authService.getToken?.();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

const pad = (n) => String(n).padStart(2, '0');
const fmtDateTimeLocal = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

export default function AdminHistorialVisitas() {
  const [search, setSearch] = useState('');
  const [familias, setFamilias] = useState([]);
  const [loadingFam, setLoadingFam] = useState(false);
  const [selectedFamilia, setSelectedFamilia] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ vigente: 'all', status: 'all', orden: 'reciente', datePreset: 'hoy', desde: '', hasta: '' });

  const loadFamilias = async () => {
    try {
      setLoadingFam(true);
      const res = await api.get('/familias/', { params: search ? { search } : {} });
      setFamilias(res.data || []);
    } catch { setFamilias([]); }
    finally { setLoadingFam(false); }
  };

  useEffect(() => { loadFamilias(); }, []);

  const sortItems = (data) => {
    const arr = [...(data || [])];
    arr.sort((a, b) => {
      const da = new Date(a.fecha_creacion || a.fecha_inicio).getTime();
      const db = new Date(b.fecha_creacion || b.fecha_inicio).getTime();
      return filters.orden === 'reciente' ? db - da : da - db;
    });
    return arr;
  };

  const buildDateParams = () => {
    const params = {};
    const now = new Date();
    if (filters.datePreset === 'hoy') {
      params.desde = fmtDateTimeLocal(startOfDay(now));
      params.hasta = fmtDateTimeLocal(endOfDay(now));
    } else if (filters.datePreset === 'semana') {
      const desde = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      params.desde = fmtDateTimeLocal(desde);
      params.hasta = fmtDateTimeLocal(now);
    } else if (filters.datePreset === 'rango') {
      if (filters.desde) params.desde = `${filters.desde}T00:00:00`;
      if (filters.hasta) params.hasta = `${filters.hasta}T23:59:59`;
    }
    return params;
  };

  const loadHistorial = async (familia = selectedFamilia) => {
    try {
      setLoading(true);
      const params = { ...buildDateParams() };
      if (familia && familia.id) params.familia_id = familia.id;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.vigente === 'true') params.vigente = 'true';
      if (filters.vigente === 'false') params.vigente = 'false';
      const res = await api.get('/autorizaciones/', { params });
      setItems(sortItems(res.data || []));
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  // On mount, load all families' history by default (most recent)
  useEffect(() => { loadHistorial(null); }, []);

  // Refrescar cuando cambian los filtros
  useEffect(() => { loadHistorial(); }, [filters]);

  const onPickFamilia = (fam) => {
    setSelectedFamilia(fam);
    setItems([]);
    loadHistorial(fam);
  };

  const authByName = (a) => {
    const fullFromField = a?.autorizado_por_usuario?.full_name;
    if (fullFromField) return fullFromField;
    const u = a?.autorizado_por?.user || {};
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return full || a?.autorizado_por_usuario?.username || u.username || '—';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Historial de visitas {selectedFamilia ? `· ${selectedFamilia.nombre}` : '· Todas las familias'}</h1>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600">Buscar familia</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre/Depto/Torre" className="mt-1 border rounded px-3 py-2 w-full" />
          </div>
          <button onClick={loadFamilias} className="px-3 py-2 rounded bg-gray-800 text-white">Buscar</button>
        </div>
        <div className="mt-3 max-h-48 overflow-y-auto border rounded">
          {loadingFam && <div className="p-3 text-sm text-gray-600">Buscando...</div>}
          {!loadingFam && familias.length === 0 && <div className="p-3 text-sm text-gray-500">Sin resultados</div>}
          {!loadingFam && familias.length > 0 && (
            <ul className="divide-y">
              <li key="all" className={`p-2 text-sm cursor-pointer ${!selectedFamilia ? 'bg-indigo-50' : 'hover:bg-gray-50'}`} onClick={() => onPickFamilia(null)}>
                <div className="font-medium">Todas las familias</div>
                <div className="text-gray-600 text-xs">Historial global</div>
              </li>
              {familias.map((f) => (
                <li key={f.id} className={`p-2 text-sm cursor-pointer ${selectedFamilia?.id === f.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`} onClick={() => onPickFamilia(f)}>
                  <div className="font-medium">{f.nombre}</div>
                  <div className="text-gray-600 text-xs">Depto {f.departamento} {f.torre ? `· Torre ${f.torre}` : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600">Vigente</label>
            <select value={filters.vigente} onChange={(e) => setFilters((p) => ({ ...p, vigente: e.target.value }))} className="border rounded px-2 py-1">
              <option value="all">Todos</option>
              <option value="true">Vigentes</option>
              <option value="false">No vigentes</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Estado</label>
            <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="border rounded px-2 py-1">
              <option value="all">Todos</option>
              <option value="ACTIVA">ACTIVA</option>
              <option value="VENCIDA">VENCIDA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="UTILIZADA">UTILIZADA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Orden</label>
            <select value={filters.orden} onChange={(e) => setFilters((p) => ({ ...p, orden: e.target.value }))} className="border rounded px-2 py-1">
              <option value="reciente">Más reciente</option>
              <option value="antiguo">Más antiguo</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-600">Fecha</label>
              <select value={filters.datePreset} onChange={(e) => setFilters((p) => ({ ...p, datePreset: e.target.value }))} className="border rounded px-2 py-1">
                <option value="hoy">Hoy</option>
                <option value="semana">Última semana</option>
                <option value="rango">Rango personalizado</option>
                <option value="todos">Todo</option>
              </select>
            </div>
            {filters.datePreset === 'rango' && (
              <>
                <div>
                  <label className="block text-xs text-gray-600">Desde</label>
                  <input type="date" value={filters.desde} onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))} className="border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Hasta</label>
                  <input type="date" value={filters.hasta} onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))} className="border rounded px-2 py-1" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          {loading && <div className="text-sm text-gray-600">Cargando...</div>}
          {!loading && items.length === 0 && <div className="text-sm text-gray-500">No hay autorizaciones.</div>}
          {!loading && items.length > 0 && (
            <ul className="divide-y">
              {items.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="font-medium">{a.visitante?.nombre_completo} · {a.status}</div>
                  <div className="text-xs text-gray-600">{new Date(a.fecha_inicio).toLocaleString()} → {new Date(a.fecha_fin).toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Entradas: {a.entradas_consumidas}/{a.entradas_permitidas} {a.dentro ? '· Dentro' : ''}</div>
                  <div className="text-xs text-gray-500">Autorizado por: {authByName(a)} ({a.autorizado_por?.documento_identidad})</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
