import React, { useEffect, useMemo, useState } from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { reportsService } from '../../api/reportsService';

const types = [
  { key: 'residentes', label: 'Residentes' },
  { key: 'familias', label: 'Familias' },
  { key: 'accesos', label: 'Accesos' },
  { key: 'reservas', label: 'Reservas' },
  { key: 'visitas', label: 'Visitas' },
];

export default function ReportesAdmin() {
  const [tipo, setTipo] = useState('residentes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datePreset, setDatePreset] = useState('todos'); // hoy | 7d | 30d | personalizada | todos
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [activo, setActivo] = useState('');
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  const endpointMap = {
    residentes: '/api/reportes/residentes/',
    familias: '/api/reportes/familias/',
    accesos: '/api/reportes/accesos/',
    reservas: '/api/reportes/reservas/',
    visitas: '/api/reportes/visitas/',
  };
  // Client-side PDF styles
  const styles = useMemo(() => StyleSheet.create({
    page: { padding: 24 },
    titleRow: { marginBottom: 10 },
    title: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
    filters: { fontSize: 9, color: '#555' },
    table: { display: 'table', width: 'auto', marginBottom: 8 },
    tableRow: { flexDirection: 'row' },
    th: { fontSize: 8, fontWeight: 700, padding: 2, borderBottomWidth: 1, borderColor: '#bbb' },
    td: { fontSize: 8, padding: 2, borderBottomWidth: 1, borderColor: '#eee' },
  }), []);

  // Split headers into chunks to avoid squeezing too many columns on a single table
  const chunkHeaders = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  // Compute dynamic column widths based on content length and header name
  const computeWidths = (cols, usableWidth) => {
    const minWidth = 48;
    const maxWidth = orientation === 'portrait' ? 160 : 220;
    const sample = items.slice(0, 200);
    const measure = (h) => {
      const hk = String(h).toLowerCase();
      const headerLen = String(h).length;
      const maxValLen = Math.max(0, ...sample.map(r => String(r[h] ?? '').length));
      const raw = Math.max(headerLen, maxValLen);
      if (/(^id$|\bid\b)/.test(hk)) return Math.min(raw, 6);
      if (/(doc|dni|ci|placa|matr|docu)/.test(hk)) return Math.min(raw, 14);
      if (/(fecha|hora|creaci|inicio|fin)/.test(hk)) return Math.min(raw, 20);
      if (/(ok|si|no|true|false|exitos|dentro|estado|status|tipo)/.test(hk)) return Math.min(raw, 10);
      return Math.min(raw, 40);
    };
    const weights = cols.map(h => Math.max(1, measure(h)));
    const total = weights.reduce((a,b)=>a+b,0) || 1;
    let widths = weights.map(w => {
      const wpx = (w / total) * usableWidth;
      return Math.max(minWidth, Math.min(maxWidth, Math.floor(wpx)));
    });
    let sum = widths.reduce((a,b)=>a+b,0);
    if (sum > usableWidth) {
      const scale = usableWidth / sum;
      widths = widths.map(w => Math.max(minWidth, Math.floor(w * scale)));
      sum = widths.reduce((a,b)=>a+b,0);
    }
    return widths;
  };

  const canFilterEstado = tipo === 'reservas' || tipo === 'visitas';
  const canFilterActivo = tipo === 'residentes' || tipo === 'familias';

  // Available columns from current dataset
  const allColumns = useMemo(() => (items && items.length ? Object.keys(items[0]) : []), [items]);

  // Sync selected columns with available ones
  useEffect(() => {
    if (!allColumns.length) {
      setSelectedColumns([]);
      return;
    }
    setSelectedColumns(prev => {
      if (!prev || prev.length === 0) return allColumns;
      const pruned = prev.filter(c => allColumns.includes(c));
      return pruned.length ? pruned : allColumns;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColumns.join('|')]);

  // Columns to display in table and export
  const displayColumns = useMemo(() => {
    if (!allColumns.length) return [];
    return (selectedColumns && selectedColumns.length)
      ? selectedColumns.filter(c => allColumns.includes(c))
      : allColumns;
  }, [allColumns, selectedColumns]);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      // Compute inclusive local-day boundaries from preset (avoids race on setState)
      const pad = (n) => String(n).padStart(2, '0');
      const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const toDayStart = (d) => `${d}T00:00:00`;
      const toDayEnd = (d) => `${d}T23:59:59.999`;
      if (datePreset === 'hoy') {
        const now = new Date();
        const d = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        params.desde = toDayStart(d);
        params.hasta = toDayEnd(d);
      } else if (datePreset === '7d') {
        const now = new Date();
        const start = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
        const end = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        params.desde = toDayStart(start);
        params.hasta = toDayEnd(end);
      } else if (datePreset === '30d') {
        const now = new Date();
        const start = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
        const end = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        params.desde = toDayStart(start);
        params.hasta = toDayEnd(end);
      } else if (datePreset === 'personalizada') {
        if (desde) params.desde = toDayStart(desde);
        if (hasta) params.hasta = toDayEnd(hasta);
      }
      if (q) params.q = q;
      if (canFilterEstado && estado) params.estado = estado;
      if (tipo === 'visitas' && estado) params.status = estado;
      if (canFilterActivo && activo) params.activo = activo;
      const url = endpointMap[tipo];
      const data = await fetch(`${url}?` + new URLSearchParams(params), { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}).then(r=>r.json());
      setItems(Array.isArray(data) ? data : (data.results || []));
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute preset date ranges
  const applyPresetRange = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (preset === 'hoy') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setDesde(toDateStr(start));
      setHasta(toDateStr(end));
    } else if (preset === '7d') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setDesde(toDateStr(start));
      setHasta(toDateStr(end));
    } else if (preset === '30d') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setDesde(toDateStr(start));
      setHasta(toDateStr(end));
    } else if (preset === 'todos') {
      setDesde('');
      setHasta('');
    }
  };

  // No need to initialize dates: default is TODOS; rely on tipo effect to load once

  // Recargar cuando cambia el tipo de reporte
  useEffect(() => { load(); }, [tipo]);

  // Aplicar automaticamente al cambiar el preset de fechas (calcular el rango dentro de load)
  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset]);

  // Debounced search: auto-load results on typing
  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 500);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Aplicar automaticamente al cambiar estado/activo
  useEffect(() => { if (canFilterEstado) load(); }, [estado]);
  useEffect(() => { if (canFilterActivo) load(); }, [activo]);

  // Aplicar automaticamente cuando cambian fechas personalizadas (solo en personalizada)
  useEffect(() => { if (datePreset === 'personalizada') load(); }, [desde]);
  useEffect(() => { if (datePreset === 'personalizada') load(); }, [hasta]);

  // Cuando cambia el tipo de reporte, por defecto seleccionar todas las columnas del nuevo dataset
  useEffect(() => {
    setSelectedColumns([]); // triggers sync effect to fill with allColumns once data arrives
  }, [tipo]);

  const searchHints = {
    residentes: 'Buscar: nombre, apellido, usuario, documento, familia',
    familias: 'Buscar: nombre, torre, departamento',
    accesos: 'Buscar: persona, documento, placa, tipo (R/V/D), id',
    reservas: 'Buscar: área, residente, documento, unidad, id',
    visitas: 'Buscar: visitante, documento, autorizado por, familia, código, id',
  };

  const exportPdf = async () => {
    if (!items || items.length === 0) return;
    const fallbackHeaders = Object.keys(items[0]);
    const headers = (selectedColumns && selectedColumns.length) ? selectedColumns : fallbackHeaders;
    const filtersSummary = [
      desde ? `Desde: ${desde}` : null,
      hasta ? `Hasta: ${hasta}` : null,
      q ? `Buscar: ${q}` : null,
      canFilterEstado && estado ? `Estado: ${estado}` : null,
      canFilterActivo && activo ? `Activo: ${activo}` : null,
    ].filter(Boolean).join(' · ');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const timeStamp = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Use landscape to gain width; split columns across multiple sub-tables
    // Page metrics for LETTER size
    const fullWidth = orientation === 'portrait' ? 612 : 792; // LETTER points
    const pagePadding = 24 * 2; // left+right
    const PAGE_USABLE_WIDTH = fullWidth - pagePadding;
    const MAX_COLS_PER_TABLE = Math.max(4, Math.floor(PAGE_USABLE_WIDTH / 60));
    const headerChunks = chunkHeaders(headers, MAX_COLS_PER_TABLE);
    const doc = (
      <Document>
        <Page size="LETTER" orientation={orientation} style={styles.page}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Reporte: {types.find(t => t.key === tipo)?.label || tipo} • {dateStamp} </Text>
            <Text style={styles.filters}>Generado: {dateStamp} {timeStamp}</Text>
            {filtersSummary ? <Text style={styles.filters}>{filtersSummary}</Text> : null}
          </View>
          {headerChunks.map((cols, chunkIdx) => {
            const widths = computeWidths(cols, PAGE_USABLE_WIDTH);
            return (
              <View key={chunkIdx} style={styles.table} wrap>
                <View style={styles.tableRow}>
                  {cols.map((h, idx) => (
                    <Text key={h} style={[styles.th, { width: widths[idx], maxWidth: widths[idx] }]}>{String(h)}</Text>
                  ))}
                </View>
                {items.map((row, i) => (
                  <View key={i} style={styles.tableRow}>
                    {cols.map((h, idx) => (
                      <Text key={h} style={[styles.td, { width: widths[idx], maxWidth: widths[idx] }]}>{String(row[h] ?? '')}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
        </Page>
      </Document>
    );
    const blob = await pdf(doc).toBlob();
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = `${tipo}-${dateStamp} ${timeStamp}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setColumnsOpen(v=>!v)} className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50">Seleccionar columnas</button>
          <button onClick={exportPdf} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Exportar PDF</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder={searchHints[tipo]}
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
      </div>

      {columnsOpen && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-700">Selecciona las columnas a exportar</div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                onClick={() => setSelectedColumns(allColumns)}
                disabled={!allColumns.length}
              >Seleccionar todo</button>
              <button
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                onClick={() => setSelectedColumns([])}
                disabled={!allColumns.length}
              >Limpiar</button>
            </div>
          </div>
          {allColumns.length === 0 ? (
            <div className="text-sm text-gray-500">No hay datos para configurar columnas.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allColumns.map(col => (
                <label key={col} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={(e) => {
                      setSelectedColumns(prev => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(col); else set.delete(col);
                        return Array.from(set);
                      });
                    }}
                  />
                  <span className="truncate" title={col}>{col}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded shadow p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className="border rounded px-2 py-2 text-sm" value={tipo} onChange={(e)=>setTipo(e.target.value)}>
            {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className="border rounded px-2 py-2 text-sm" value={datePreset} onChange={e=>setDatePreset(e.target.value)}>
            <option value="todos">TODOS</option>
            <option value="hoy">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="personalizada">Fecha personalizada</option>
          </select>
          {datePreset === 'personalizada' && (
            <>
              <input type="date" className="border rounded px-2 py-2 text-sm" value={desde} onChange={e=>setDesde(e.target.value)} />
              <input type="date" className="border rounded px-2 py-2 text-sm" value={hasta} onChange={e=>setHasta(e.target.value)} />
            </>
          )}
          <select className="border rounded px-2 py-2 text-sm" value={orientation} onChange={e=>setOrientation(e.target.value)}>
            <option value="portrait">Orientación: Vertical</option>
            <option value="landscape">Orientación: Horizontal</option>
          </select>
          {canFilterEstado && (
            <select className="border rounded px-2 py-2 text-sm" value={estado} onChange={e=>setEstado(e.target.value)}>
              <option value="">Estado</option>
              {tipo === 'reservas' ? (
                <>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="CANCELADA">Cancelada</option>
                </>
              ) : (
                <>
                  <option value="ACTIVA">Activa</option>
                  <option value="VENCIDA">Vencida</option>
                  <option value="CANCELADA">Cancelada</option>
                  <option value="UTILIZADA">Utilizada</option>
                </>
              )}
            </select>
          )}
          {canFilterActivo && (
            <select className="border rounded px-2 py-2 text-sm" value={activo} onChange={e=>setActivo(e.target.value)}>
              <option value="">Activo</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          )}
          <button onClick={() => {
            setDatePreset('todos');
            setEstado('');
            setActivo('');
            setQ('');
            setDesde('');
            setHasta('');
            setOrientation('portrait');
            setSelectedColumns(allColumns); // restore all columns visible/selected
            // load will be triggered by datePreset change effect
          }} className="px-3 py-2 rounded border hover:bg-gray-50 text-sm">Limpiar</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <div className="text-sm text-gray-500">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">Sin resultados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                {displayColumns.map(k => (
                  <th key={k} className="py-2 border-b">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {displayColumns.map(k => (
                    <td key={k} className="py-1 border-b align-top">{String(row[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
