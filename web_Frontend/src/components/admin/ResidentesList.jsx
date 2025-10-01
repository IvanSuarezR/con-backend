import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { residentService } from '../../api/residentService';

const Badge = ({ active }) => (
  <span className={`px-2 py-1 text-xs rounded ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const TipoBadge = ({ tipo }) => (
  <span className={`px-2 py-0.5 text-xs rounded border ${tipo === 'PRINCIPAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
    {tipo === 'PRINCIPAL' ? 'Principal' : 'Familiar'}
  </span>
);

const ResidentRow = ({ r, editTo }) => (
  <div className="flex items-center justify-between py-2" title={r?.fecha_registro ? `Creado: ${new Date(r.fecha_registro).toLocaleString()}` : undefined}>
    <div>
      <div className="font-medium flex items-center gap-2">
        {r.user?.first_name} {r.user?.last_name} <TipoBadge tipo={r.tipo} />
      </div>
      <div className="text-sm text-gray-500">{r.documento_identidad} · {r.user?.username}</div>
      <div className="text-[11px] text-gray-400">Creado: {r?.fecha_registro ? new Date(r.fecha_registro).toLocaleDateString() : '-'}</div>
    </div>
    <div className="flex items-center gap-3">
      <Badge active={!!r?.user?.is_active} />
      <Link to={editTo || `/admin/residentes/${r.id}/editar`} className="px-3 py-1 text-sm rounded border hover:bg-gray-50">Editar</Link>
    </div>
  </div>
);

// Modal simple para crear/editar familia (declarado arriba para poder usarlo en ResidentesList)
function FamilyModal({ open, data, setData, mode = 'create', busy, error, onCancel, onSave }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h4 className="text-lg font-semibold mb-2">{mode === 'create' ? 'Nueva familia' : 'Editar familia'}</h4>
        {error && <div className="mb-3 p-2 text-sm rounded bg-red-50 text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Nombre</label>
            <input className="mt-1 border rounded px-3 py-2 w-full" value={data?.nombre||''} onChange={e=>setData(p=>({...p,nombre:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">Torre</label>
              <input className="mt-1 border rounded px-3 py-2 w-full" value={data?.torre||''} onChange={e=>setData(p=>({...p,torre:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Departamento</label>
              <input className="mt-1 border rounded px-3 py-2 w-full" value={data?.departamento||''} onChange={e=>setData(p=>({...p,departamento:e.target.value}))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!data?.activo} onChange={e=>setData(p=>({...p,activo:e.target.checked}))} />
            Activa
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border">Cancelar</button>
          <button disabled={busy} onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{busy ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

const ResidentesList = () => {
  const [residentes, setResidentes] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [famModal, setFamModal] = useState({ open: false, mode: 'create', data: null });
  const [famBusy, setFamBusy] = useState(false);
  const [famErr, setFamErr] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Filtros
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState(''); // '', PRINCIPAL, FAMILIAR
  const [activo, setActivo] = useState(''); // '', true, false
  const [torre, setTorre] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [familySort, setFamilySort] = useState('torre'); // torre | nombre | reciente | antigua
  const [onlyWithMatches, setOnlyWithMatches] = useState(false);
  const [famPage, setFamPage] = useState(1);
  const famPageSize = 12;

  // New: View toggle and resident sorting
  const [viewMode, setViewMode] = useState('familias'); // 'familias' | 'residentes'
  const [residentSort, setResidentSort] = useState('reciente'); // 'reciente' | 'antiguo' | 'nombre'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [res, fams] = await Promise.all([
          residentService.listResidents(),
          residentService.listFamilies(),
        ]);
        setResidentes(res);
        setFamilias(fams);
      } catch (e) {
        setError(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al cargar'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshFamilies = async () => {
    try {
      const fams = await residentService.listFamilies();
      setFamilias(fams);
    } catch {}
  };

  const openCreateFamily = () => setFamModal({ open: true, mode: 'create', data: { nombre: '', torre: '', departamento: '', activo: true } });
  const openEditFamily = (fam) => setFamModal({ open: true, mode: 'edit', data: { ...fam } });
  const closeFamModal = () => { setFamModal({ open: false, mode: 'create', data: null }); setFamErr(''); };
  const saveFamily = async () => {
    if (!famModal.open) return;
    const payload = { nombre: famModal.data.nombre || '', torre: famModal.data.torre || '', departamento: famModal.data.departamento || '', activo: !!famModal.data.activo };
    if (!payload.nombre || !payload.departamento) { setFamErr('Nombre y Departamento son requeridos'); return; }
    setFamBusy(true); setFamErr('');
    try {
      if (famModal.mode === 'create') await residentService.createFamily(payload);
      else await residentService.updateFamily(famModal.data.id, payload);
      await refreshFamilies();
      closeFamModal();
    } catch (e) {
      setFamErr(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error'));
    } finally { setFamBusy(false); }
  };
  const deleteFamily = async (fam) => {
    if (!fam?.id) return;
    if (!confirm('¿Eliminar esta familia? Esta acción no se puede deshacer.')) return;
    try { await residentService.deleteFamily(fam.id); await refreshFamilies(); selectFamily(null); }
    catch (e) { alert(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al eliminar')); }
  };

  // Read selected family from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fid = params.get('familia');
    setSelectedFamilyId(fid ? Number(fid) : null);
  }, [location.search]);

  // Al seleccionar un chip de familia, persistir en la URL
  const selectFamily = (fid) => {
    const params = new URLSearchParams(location.search);
    if (fid) params.set('familia', String(fid)); else params.delete('familia');
    navigate({ search: params.toString() }, { replace: false });
  };

  const familyMap = useMemo(() => {
    const map = new Map();
    familias.forEach(f => map.set(f.id, f));
    return map;
  }, [familias]);

  const uniqueTorres = useMemo(() => {
    const set = new Set();
    familias.forEach(f => { if (f.torre) set.add(f.torre); });
    return Array.from(set).sort();
  }, [familias]);

  const matchesResidentFilters = (r) => {
    const fam = r.familia ? familyMap.get(r.familia) : null;
    const fullName = `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim().toLowerCase();
    const username = (r.user?.username || '').toLowerCase();
    const doc = (r.documento_identidad || '').toLowerCase();
    const famName = (fam?.nombre || '').toLowerCase();
    const ql = q.trim().toLowerCase();
    if (ql) {
      const inText = fullName.includes(ql) || username.includes(ql) || doc.includes(ql) || famName.includes(ql);
      if (!inText) return false;
    }
    if (tipo && r.tipo !== tipo) return false;
  if (activo !== '' && Boolean(r?.user?.is_active) !== (activo === 'true')) return false;
    if (torre && (fam?.torre || '') !== torre) return false;
    if (departamento && (fam?.departamento || '').toLowerCase() !== departamento.trim().toLowerCase()) return false;
    return true;
  };

  const residentsByFamily = useMemo(() => {
    const map = new Map();
    residentes.filter(matchesResidentFilters).forEach(r => {
      const fid = r.familia || 0;
      if (!map.has(fid)) map.set(fid, []);
      map.get(fid).push(r);
    });
    return map;
  }, [residentes, q, tipo, activo, torre, departamento, familyMap]);

  const filteredFamilies = useMemo(() => {
    // Include family if its own torre/dep match and either family name matches search or has any resident matching filters
    const ql = q.trim().toLowerCase();
    let list = familias.filter(f => {
      if (torre && (f.torre || '') !== torre) return false;
      if (departamento && (f.departamento || '').toLowerCase() !== departamento.trim().toLowerCase()) return false;
      const famNameMatch = ql ? (f.nombre || '').toLowerCase().includes(ql) : true;
      const hasResMatch = (residentsByFamily.get(f.id) || []).length > 0;
      if (onlyWithMatches) return famNameMatch && hasResMatch;
      return famNameMatch || hasResMatch;
    });
    const byDate = (a, b, desc = false) => {
      const ta = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
      const tb = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
      return desc ? (tb - ta) : (ta - tb);
    };
    list = list.sort((a, b) => {
      if (familySort === 'reciente') return byDate(a, b, true);
      if (familySort === 'antigua') return byDate(a, b, false);
      if (familySort === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '');
      // default: torre -> departamento -> nombre
      const ta = a.torre || '';
      const tb = b.torre || '';
      if (ta !== tb) return ta.localeCompare(tb);
      const da = a.departamento || '';
      const db = b.departamento || '';
      if (da !== db) return da.localeCompare(db, undefined, { numeric: true });
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    return list;
  }, [familias, q, torre, departamento, residentsByFamily, familySort, onlyWithMatches]);

  // Reset paginacion de familias al cambiar filtros/orden
  useEffect(() => { setFamPage(1); }, [q, tipo, activo, torre, departamento, familySort, onlyWithMatches]);

  const famTotal = filteredFamilies.length;
  const famPages = Math.max(1, Math.ceil(famTotal / famPageSize));
  const famSlice = filteredFamilies.slice((famPage - 1) * famPageSize, famPage * famPageSize);

  const selectedFamily = selectedFamilyId ? familyMap.get(selectedFamilyId) : null;
  const selectedResidents = useMemo(() => {
    if (!selectedFamilyId) return [];
    return (residentsByFamily.get(selectedFamilyId) || []).slice().sort((a, b) => {
      const an = `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim().toLowerCase();
      const bn = `${b.user?.first_name || ''} ${b.user?.last_name || ''}`.trim().toLowerCase();
      return an.localeCompare(bn);
    });
  }, [selectedFamilyId, residentsByFamily]);

  const principals = selectedResidents.filter(r => r.tipo === 'PRINCIPAL');
  const familys = selectedResidents.filter(r => r.tipo === 'FAMILIAR');

  const clearFilters = () => {
    setQ('');
    setTipo('');
    setActivo('');
    setTorre('');
    setDepartamento('');
  };
  const ql = q.trim();
  const residentResults = useMemo(() => {
    if (!ql) return [];
    const list = residentes.filter(matchesResidentFilters).map(r => ({ r, fam: r.familia ? familyMap.get(r.familia) : null }));
    return list.sort((a, b) => {
      const an = `${a.r.user?.first_name || ''} ${a.r.user?.last_name || ''}`.trim().toLowerCase();
      const bn = `${b.r.user?.first_name || ''} ${b.r.user?.last_name || ''}`.trim().toLowerCase();
      return an.localeCompare(bn);
    });
  }, [ql, residentes, q, tipo, activo, torre, departamento, familyMap]);

  const sortedResidents = useMemo(() => {
    const list = residentes.filter(matchesResidentFilters).map(r => ({ r, fam: r.familia ? familyMap.get(r.familia) : null }));
    if (residentSort === 'nombre') {
      return list.sort((a, b) => {
        const an = `${a.r.user?.first_name || ''} ${a.r.user?.last_name || ''}`.trim().toLowerCase();
        const bn = `${b.r.user?.first_name || ''} ${b.r.user?.last_name || ''}`.trim().toLowerCase();
        return an.localeCompare(bn);
      });
    }
    if (residentSort === 'antiguo') {
      return list.sort((a, b) => {
        const ad = a.r?.fecha_registro ? new Date(a.r.fecha_registro).getTime() : 0;
        const bd = b.r?.fecha_registro ? new Date(b.r.fecha_registro).getTime() : 0;
        return ad - bd; // antiguo primero
      });
    }
    // reciente por defecto
    return list.sort((a, b) => {
      const ad = a.r?.fecha_registro ? new Date(a.r.fecha_registro).getTime() : 0;
      const bd = b.r?.fecha_registro ? new Date(b.r.fecha_registro).getTime() : 0;
      return bd - ad; // reciente primero
    });
  }, [residentes, matchesResidentFilters, residentSort, familyMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Residentes</h1>
        <Link to={`/admin/residentes/nuevo${location.search || ''}`} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Nuevo Residente</Link>
      </div>

      {loading && <div className="text-gray-600">Cargando...</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {!loading && !error && !selectedFamily && (
        <>
          {/* Filtros arriba */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-3">
              <input
                placeholder="Buscar por nombre, usuario, carnet, familia"
                className="w-full border rounded px-3 py-2 text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <select className="border rounded px-2 py-2 text-sm" value={viewMode} onChange={(e)=>setViewMode(e.target.value)}>
                <option value="familias">Ver: Familias</option>
                <option value="residentes">Ver: Residentes</option>
              </select>
              <select className="border rounded px-2 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Tipo</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="FAMILIAR">Familiar</option>
              </select>
              <select className="border rounded px-2 py-2 text-sm" value={activo} onChange={(e) => setActivo(e.target.value)}>
                <option value="">Estado</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              <select className="border rounded px-2 py-2 text-sm" value={torre} onChange={(e) => setTorre(e.target.value)}>
                <option value="">Torre</option>
                {uniqueTorres.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                placeholder="Departamento"
                className="border rounded px-2 py-2 text-sm"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              />
              {viewMode === 'familias' ? (
                <select className="border rounded px-2 py-2 text-sm" value={familySort} onChange={(e) => setFamilySort(e.target.value)}>
                  <option value="torre">Orden: Torre/Dpto/Nombre</option>
                  <option value="nombre">Orden: Nombre</option>
                  <option value="reciente">Orden: Más recientes</option>
                  <option value="antigua">Orden: Más antiguas</option>
                </select>
              ) : (
                <select className="border rounded px-2 py-2 text-sm" value={residentSort} onChange={(e) => setResidentSort(e.target.value)}>
                  <option value="reciente">Residentes: Más recientes</option>
                  <option value="antiguo">Residentes: Más antiguos</option>
                  <option value="nombre">Residentes: Nombre A-Z</option>
                </select>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {/* <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={onlyWithMatches} onChange={(e) => setOnlyWithMatches(e.target.checked)} />
                Mostrar solo familias con residentes coincidentes
              </label> */}
              <button onClick={clearFilters} className="text-sm px-3 py-2 rounded border hover:bg-gray-50">Limpiar</button>
            </div>
          </div>

          {/* Vista controlada por viewMode */}
          {viewMode === 'familias' ? (
            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Familias</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">{famTotal} resultados</div>
                  <button onClick={openCreateFamily} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">Agregar familia</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {famSlice.map(f => {
                  const resList = residentsByFamily.get(f.id) || [];
                  const prin = resList.filter(r => r.tipo === 'PRINCIPAL').length;
                  const fam = resList.filter(r => r.tipo === 'FAMILIAR').length;
                  const fecha = f.fecha_creacion ? new Date(f.fecha_creacion).toLocaleDateString() : '-';
                  return (
                    <button
                      key={f.id}
                      onClick={() => selectFamily(f.id)}
                      className="text-left border rounded-lg px-4 py-3 bg-white hover:bg-gray-50 shadow-sm w-full sm:w-[300px]"
                      title={`Creación: ${fecha}`}
                    >
                      <div className="font-medium text-gray-900">{f.nombre}</div>
                      <div className="text-xs text-gray-600 mt-0.5">Torre {f.torre || '-'} · Dpto {f.departamento || '-'}</div>
                      <div className="text-[11px] text-gray-400 mt-1">Creada: {fecha}</div>
                      <div className="text-xs text-gray-500 mt-2">{prin} Principales · {fam} Familiares</div>
                    </button>
                  );
                })}
                {famSlice.length === 0 && (
                  <div className="text-sm text-gray-500">No hay familias</div>
                )}
              </div>
              {famPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={famPage <= 1} onClick={() => setFamPage(p => Math.max(1, p - 1))}>Anterior</button>
                  <div>Página {famPage} / {famPages}</div>
                  <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={famPage >= famPages} onClick={() => setFamPage(p => Math.min(famPages, p + 1))}>Siguiente</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Residentes</div>
                <div className="text-xs text-gray-500">{
                  (residentes.filter(matchesResidentFilters)).length
                } resultados</div>
              </div>
              <ResidentsResults
                residentes={residentes}
                matchesResidentFilters={matchesResidentFilters}
                residentSort={residentSort}
                familyMap={familyMap}
                location={location}
              />
            </div>
          )}

        </>
      )}

  {/* Vista de familia seleccionada: solo residentes y encabezado */}
      {!loading && !error && selectedFamily && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h2 className="text-lg font-semibold">{selectedFamily.nombre}</h2>
              <div className="text-sm text-gray-500">Torre {selectedFamily.torre || '-'} · Dpto {selectedFamily.departamento || '-'} · Creada el {selectedFamily.fecha_creacion ? new Date(selectedFamily.fecha_creacion).toLocaleDateString() : '-'}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 hidden md:block">{principals.length + familys.length} residentes ({principals.length} P · {familys.length} F)</div>
              <Link to={`/admin/residentes/nuevo${location.search || ''}`} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Agregar familiar</Link>
              <button onClick={() => openEditFamily(selectedFamily)} className="px-3 py-1 rounded border hover:bg-gray-50">Editar familia</button>
              <button onClick={() => deleteFamily(selectedFamily)} className="px-3 py-1 rounded border hover:bg-red-50 text-red-600">Eliminar</button>
              <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => selectFamily(null)}>Volver</button>
            </div>
          </div>

          <div className="divide-y mt-4">
            {selectedResidents.length === 0 && (
              <div className="text-sm text-gray-500">No hay residentes</div>
            )}
            {selectedResidents.map(r => (
              <ResidentRow key={r.id} r={r} editTo={`/admin/residentes/${r.id}/editar${location.search || ''}`} />
            ))}
          </div>
        </div>
      )}
      {/* Modal de familia (crear/editar) */}
      <FamilyModal
        open={famModal.open}
        mode={famModal.mode}
        data={famModal.data || {}}
        setData={(updater) => setFamModal(prev => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data || {}) : updater }))}
        busy={famBusy}
        error={famErr}
        onCancel={closeFamModal}
        onSave={saveFamily}
      />
    </div>
  );
};

export default ResidentesList;

function ResidentsResults({ residentes, matchesResidentFilters, residentSort, familyMap, location }) {
  // The list is already computed in parent, but we reconstruct to avoid prop drilling too much state
  const list = useMemo(() => {
    const base = residentes.filter(matchesResidentFilters).map(r => ({ r, fam: r.familia ? familyMap.get(r.familia) : null }));
    if (residentSort === 'nombre') {
      return base.sort((a, b) => {
        const an = `${a.r.user?.first_name || ''} ${a.r.user?.last_name || ''}`.trim().toLowerCase();
        const bn = `${b.r.user?.first_name || ''} ${b.r.user?.last_name || ''}`.trim().toLowerCase();
        return an.localeCompare(bn);
      });
    }
    if (residentSort === 'antiguo') {
      return base.sort((a, b) => {
        const ad = a.r?.fecha_registro ? new Date(a.r.fecha_registro).getTime() : 0;
        const bd = b.r?.fecha_registro ? new Date(b.r.fecha_registro).getTime() : 0;
        return ad - bd;
      });
    }
    return base.sort((a, b) => {
      const ad = a.r?.fecha_registro ? new Date(a.r.fecha_registro).getTime() : 0;
      const bd = b.r?.fecha_registro ? new Date(b.r.fecha_registro).getTime() : 0;
      return bd - ad;
    });
  }, [residentes, matchesResidentFilters, residentSort, familyMap]);

  return (
    <div className="divide-y">
      {list.length === 0 && (
        <div className="text-sm text-gray-500 py-2">No hay resultados</div>
      )}
      {list.map(({ r, fam }) => (
        <div key={r.id} className="flex items-center justify-between py-2" title={r?.fecha_registro ? `Creado: ${new Date(r.fecha_registro).toLocaleString()}` : undefined}>
          <div>
            <div className="font-medium flex items-center gap-2">
              {r.user?.first_name} {r.user?.last_name} <TipoBadge tipo={r.tipo} />
            </div>
            <div className="text-xs text-gray-500">{r.user?.username} · {r.documento_identidad || 's/ doc'}</div>
            <div className="text-xs text-gray-600 mt-0.5">Familia: {fam?.nombre || 'Sin familia'}{fam ? ` · Torre ${fam.torre || '-'} · Dpto ${fam.departamento || '-'}` : ''}</div>
            <div className="text-[11px] text-gray-400">Creado: {r?.fecha_registro ? new Date(r.fecha_registro).toLocaleDateString() : '-'}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge active={!!r?.user?.is_active} />
            <Link to={`/admin/residentes/${r.id}/editar${location.search || ''}`} className="px-3 py-1 text-sm rounded border hover:bg-gray-50">Editar</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
