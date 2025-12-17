import React, { useEffect, useMemo, useState } from 'react';
import { notificationsApi } from '../../../api/notifications';
import { residentService } from '../../../api/residentService';

export default function CampaignsAdmin() {
  const [form, setForm] = useState({ tipo: 'AVISO', titulo: '', mensaje: '', incluir_todos_residentes: false, incluir_admins: false, solo_principales: false, familias: [], residentes: [] });
  const [familias, setFamilias] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [selectedFamiliasDetails, setSelectedFamiliasDetails] = useState([]);
  const [selectedResidentesDetails, setSelectedResidentesDetails] = useState([]);
  const [famSearch, setFamSearch] = useState('');
  const [resSearch, setResSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminsCount, setAdminsCount] = useState(0);

  // Initial load once, then filter client-side similar to Admin ResidentesList
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [fams, ress] = await Promise.all([
          residentService.listFamilies(),
          residentService.listResidents(),
        ]);
        setFamilias(Array.isArray(fams) ? fams : (fams?.results || []));
        setResidentes(Array.isArray(ress) ? ress : (ress?.results || []));
        // Optional: fetch admins count for estimator
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notificaciones/admins-count/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const j = await res.json().catch(()=>({admins:0}));
          setAdminsCount(Number(j?.admins || 0));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateForm = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const hasTargets = useMemo(() => {
    if (form.incluir_todos_residentes) return true;
    return (form.familias?.length || 0) > 0 || (form.residentes?.length || 0) > 0;
  }, [form.incluir_todos_residentes, form.familias, form.residentes]);

  // Estimated recipients based on current filters and selections
  const estimatedRecipients = useMemo(() => {
    if (loading) return 0;
    let ids = new Set();
    const onlyPrincipals = !!form.solo_principales;
    if (form.incluir_todos_residentes) {
      (residentes || []).forEach(r => {
        if (onlyPrincipals && r.tipo !== 'PRINCIPAL') return;
        ids.add(r.id);
      });
    } else {
      // Add selected residents explicitly
      (form.residentes || []).forEach(id => ids.add(id));
      // Add residents from selected families
      const famSet = new Set(form.familias || []);
      (residentes || []).forEach(r => {
        if (!r.familia || !famSet.has(r.familia)) return;
        if (onlyPrincipals && r.tipo !== 'PRINCIPAL') return;
        ids.add(r.id);
      });
    }
    return ids.size;
  }, [loading, residentes, form.incluir_todos_residentes, form.familias, form.residentes, form.solo_principales]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const payload = { ...form, familias: form.familias, residentes: form.residentes };
      const res = await notificationsApi.send(payload);
      alert(`Notificaciones enviadas: ${res.entregas_creadas}`);
    } finally {
      setBusy(false);
    }
  };

  // Toggle helpers for click-based selection
  const toggleFamilia = (id) => {
    updateForm('familias', (form.familias || []).includes(id)
      ? (form.familias || []).filter(x => x !== id)
      : [ ...(form.familias || []), id ]);
  };
  const toggleResidente = (id) => {
    updateForm('residentes', (form.residentes || []).includes(id)
      ? (form.residentes || []).filter(x => x !== id)
      : [ ...(form.residentes || []), id ]);
  };

  // Backfill selected families details not present in the current list
  useEffect(() => {
    const run = async () => {
      const present = new Map(familias.map(f => [f.id, f]));
      const details = [];
      const missing = [];
      for (const id of form.familias || []) {
        const f = present.get(id);
        if (f) details.push(f); else missing.push(id);
      }
      if (missing.length) {
        const fetched = await Promise.all(missing.map(id => residentService.getFamily(id).catch(() => null)));
        for (const f of fetched) if (f) details.push(f);
      }
      setSelectedFamiliasDetails(details);
    };
    run();
  }, [form.familias, familias]);

  // Backfill selected residents details not present in the current list
  useEffect(() => {
    const run = async () => {
      const present = new Map(residentes.map(r => [r.id, r]));
      const details = [];
      const missing = [];
      for (const id of form.residentes || []) {
        const r = present.get(id);
        if (r) details.push(r); else missing.push(id);
      }
      if (missing.length) {
        const fetched = await Promise.all(missing.map(id => residentService.getResident(id).catch(() => null)));
        for (const r of fetched) if (r) details.push(r);
      }
      setSelectedResidentesDetails(details);
    };
    run();
  }, [form.residentes, residentes]);

  // Client-side filtering similar to Admin ResidentesList
  const familyMap = useMemo(() => new Map(familias.map(f => [f.id, f])), [familias]);
  const filteredFamilias = useMemo(() => {
    const q = famSearch.trim().toLowerCase();
    if (!q) return familias;
    return familias.filter(f =>
      (f.nombre || '').toLowerCase().includes(q) ||
      (f.departamento || '').toLowerCase().includes(q) ||
      (f.torre || '').toLowerCase().includes(q)
    );
  }, [familias, famSearch]);
  const filteredResidentes = useMemo(() => {
    const q = resSearch.trim().toLowerCase();
    let list = residentes;
    if (form.solo_principales) list = list.filter(r => r.tipo === 'PRINCIPAL');
    if (!q) return list;
    return list.filter(r => {
      const full = `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim().toLowerCase();
      const usern = (r.user?.username || '').toLowerCase();
      const doc = (r.documento_identidad || '').toLowerCase();
      const fam = r.familia ? (familyMap.get(r.familia)?.nombre || '').toLowerCase() : '';
      return full.includes(q) || usern.includes(q) || doc.includes(q) || fam.includes(q);
    });
  }, [residentes, resSearch, form.solo_principales, familyMap]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Enviar notificaciones</h1>
      <div className="mb-3 text-sm text-gray-600">
        Destinatarios estimados: <span className="font-semibold">{estimatedRecipients}</span>
        {form.incluir_admins && (
          <span> <span className="text-gray-400">+</span> <span className="font-semibold">{adminsCount}</span> admins</span>
        )}
      </div>
  <form onSubmit={submit} className="bg-white p-4 rounded border mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select value={form.tipo} onChange={e => updateForm('tipo', e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
              {['AVISO','EMERGENCIA','MULTA','ACTIVIDAD','AUTORIZACION_CREADA','AUTORIZACION_EXTENDIDA','AUTORIZACION_VENCIDA','AUTORIZACION_UTILIZADA','ACCESO_DENEGADO'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Título</label>
            <input value={form.titulo} onChange={e=>updateForm('titulo', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Mensaje</label>
          <textarea value={form.mensaje} onChange={e=>updateForm('mensaje', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" rows={3} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.incluir_todos_residentes} onChange={e=>updateForm('incluir_todos_residentes', e.target.checked)} /> <span>Todos los residentes</span></label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.incluir_admins} onChange={e=>updateForm('incluir_admins', e.target.checked)} /> <span>Incluir admins</span></label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.solo_principales} onChange={e=>updateForm('solo_principales', e.target.checked)} /> <span>Solo residentes principales</span></label>
        </div>
        {!hasTargets && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Selecciona al menos una familia o residente, o marca "Todos los residentes".</div>
        )}
        {!form.incluir_todos_residentes && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Familias</label>
              <input placeholder="Buscar por nombre, dpto, torre" value={famSearch} onChange={e=>setFamSearch(e.target.value)} className="mt-1 mb-2 w-full border rounded px-3 py-2" />
              <div className="flex items-center justify-between text-xs text-gray-500"><span>Resultados: {filteredFamilias.length}</span><button type="button" className="underline" onClick={()=>setFamSearch('')}>Limpiar búsqueda</button></div>
              <div className="mt-1 border rounded divide-y max-h-60 overflow-auto">
                {filteredFamilias.map(f => {
                  const selected = (form.familias || []).includes(f.id);
                  return (
                    <button key={f.id} type="button" onClick={()=>toggleFamilia(f.id)} className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-indigo-50' : ''}`}>
                      <div>
                        <div className="font-medium text-sm">{f.nombre}</div>
                        <div className="text-xs text-gray-600">Torre {f.torre || '-'} · Dpto {f.departamento || '-'}</div>
                      </div>
                      <input type="checkbox" readOnly checked={selected} />
                    </button>
                  );
                })}
                {filteredFamilias.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                )}
              </div>
              {selectedFamiliasDetails.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Familias seleccionadas ({selectedFamiliasDetails.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFamiliasDetails.map(f => (
                      <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded">
                        {f.nombre} - Dpto {f.departamento}
                        <button type="button" onClick={()=>updateForm('familias', (form.familias||[]).filter(id=>id!==f.id))} className="ml-1 text-indigo-700 hover:text-indigo-900">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button type="button" onClick={()=>updateForm('familias', [])} className="text-xs text-gray-600 hover:underline">Quitar todas</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Residentes</label>
              <input placeholder="Buscar por nombre, usuario, documento, familia" value={resSearch} onChange={e=>setResSearch(e.target.value)} className="mt-1 mb-2 w-full border rounded px-3 py-2" />
              <div className="flex items-center justify-between text-xs text-gray-500"><span>Resultados: {filteredResidentes.length}</span><button type="button" className="underline" onClick={()=>setResSearch('')}>Limpiar búsqueda</button></div>
              <div className="mt-1 border rounded divide-y max-h-60 overflow-auto">
                {filteredResidentes.map(r => {
                  const selected = (form.residentes || []).includes(r.id);
                  const full = `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.user?.username;
                  return (
                    <button key={r.id} type="button" onClick={()=>toggleResidente(r.id)} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selected ? 'bg-emerald-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">{full}<span className={`px-2 py-0.5 text-[10px] rounded border ${r.tipo === 'PRINCIPAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{r.tipo === 'PRINCIPAL' ? 'Principal' : 'Familiar'}</span></div>
                          <div className="text-xs text-gray-600">{r.user?.username} · {r.documento_identidad || 's/ doc'}</div>
                          <div className="text-[11px] text-gray-500">Familia: {r.familia ? (familyMap.get(r.familia)?.nombre || '-') : 'Sin familia'}</div>
                        </div>
                        <input type="checkbox" readOnly checked={selected} />
                      </div>
                    </button>
                  );
                })}
                {filteredResidentes.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                )}
              </div>
            </div>
          </div>
        )}
        {!form.incluir_todos_residentes && selectedResidentesDetails.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-600 mb-1">Residentes seleccionados ({selectedResidentesDetails.length}):</div>
            <div className="flex flex-wrap gap-2">
              {selectedResidentesDetails.map(r => (
                <span key={r.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded">
                  {(r.user?.first_name || '') + ' ' + (r.user?.last_name || '')} {r.documento_identidad ? `(${r.documento_identidad})` : ''}
                  <button type="button" onClick={()=>updateForm('residentes', (form.residentes||[]).filter(id=>id!==r.id))} className="ml-1 text-emerald-700 hover:text-emerald-900">×</button>
                </span>
              ))}
            </div>
            <div className="mt-2">
              <button type="button" onClick={()=>updateForm('residentes', [])} className="text-xs text-gray-600 hover:underline">Quitar todos</button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button disabled={busy || !hasTargets} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Enviar</button>
        </div>
      </form>
    </div>
  );
}
