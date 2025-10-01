import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function AreaDetalle() {
  const { id } = useParams();
  const [area, setArea] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [misReservas, setMisReservas] = useState([]);
  const [calendario, setCalendario] = useState(null);

  const recargarReservas = async () => {
    const data = await areasApi.listReservas({ area: id });
    setMisReservas(data);
    // refrescar disponibilidad
    try {
      const cal = await areasApi.getCalendario(id);
      setCalendario(cal);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const a = await areasApi.getArea(id);
      setArea(a);
      if (a.tipo === 'UNIDADES') {
        const all = await areasApi.listUnidades();
        setUnidades(all.filter((u) => String(u.area) === String(id)));
      } else {
        const all = await areasApi.listTurnos();
        setTurnos(all.filter((t) => String(t.area) === String(id)));
      }
  // cargar calendario publico del area
      const cal = await areasApi.getCalendario(id);
      setCalendario(cal);
      await recargarReservas();
    })();
  }, [id]);

  if (!area) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">{area.nombre}</h1>
      {area.tipo === 'UNIDADES' ? (
        <UnidadesReserva areaId={id} unidades={unidades} onCreated={recargarReservas} />
      ) : (
        <TurnosReserva
          areaId={id}
          turnos={turnos}
          ocupaciones={Object.fromEntries((calendario?.turnos || []).map(t => [t.id, { capacidad: t.capacidad, ocupados: t.ocupados ?? 0, disponibles: t.disponibles ?? Math.max(0, (t.capacidad || 0) - (t.ocupados || 0)) }]))}
          onCreated={recargarReservas}
        />
      )}

      {/* Calendario / Disponibilidad solo para UNIDADES */}
      {calendario && calendario.tipo === 'UNIDADES' && (
        <section>
          <h2 className="text-lg font-medium mb-2">Calendario de ocupación</h2>
          {(() => {
            const reservas = (calendario.reservas || []).slice().sort((a,b)=>{
              const ua = (a.unidad_nombre || String(a.unidad_id || ''));
              const ub = (b.unidad_nombre || String(b.unidad_id || ''));
              if (ua !== ub) return ua.localeCompare(ub);
              return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
            });
            const grupos = {};
            for (const r of reservas) {
              const key = r.unidad_nombre || `Unidad ${r.unidad_id}`;
              if (!grupos[key]) grupos[key] = [];
              grupos[key].push(r);
            }
            const entries = Object.entries(grupos);
            if (!entries.length) {
              return <div className="text-sm opacity-70">No hay reservas registradas.</div>;
            }
            return (
              <div className="grid md:grid-cols-2 gap-3">
                {entries.map(([unidad, arr]) => (
                  <div key={unidad} className="border rounded-md p-3">
                    <div className="font-medium mb-2">{unidad}</div>
                    <ul className="space-y-1">
                      {arr.map((r)=> (
                        <li key={r.id} className="text-xs opacity-80 flex items-center justify-between">
                          <span>{new Date(r.fecha_inicio).toLocaleString()} — {new Date(r.fecha_fin).toLocaleString()}</span>
                          <span className="badge badge-ghost badge-xs">{r.estado}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium mb-2">Mis reservas</h2>
        {misReservas.length === 0 ? (
          <div className="text-sm opacity-70">No tienes reservas todavía.</div>
        ) : (
          <ul className="divide-y">
            {misReservas.map(r => (
              <ReservaItem key={r.id} r={r} onCancel={async () => {
                await areasApi.patchReserva(r.id, { estado: 'CANCELADA' });
                await recargarReservas();
              }} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReservaItem({ r, onCancel }) {
  const isTurno = !!(r.turno || r.turno_detalle);
  const [busy, setBusy] = useState(false);

  const handleCancel = async () => {
    if (busy) return;
    const ok = window.confirm('¿Deseas cancelar esta reserva?');
    if (!ok) return;
    try {
      setBusy(true);
      await onCancel();
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al cancelar');
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div>
        <div className="font-medium">{isTurno ? 'Reserva por turno' : 'Reserva por unidad'}</div>
        <div className="text-xs opacity-70">
          {isTurno ? (
            <>
              {/* Preferir fechas del turno_detalle si estan presentes */}
              {r.turno_detalle?.titulo ? `${r.turno_detalle.titulo}: ` : 'Turno: '}
              {r.turno_detalle?.fecha_inicio
                ? new Date(r.turno_detalle.fecha_inicio).toLocaleString()
                : (r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleString() : '')}
              {' — '}
              {r.turno_detalle?.fecha_fin
                ? new Date(r.turno_detalle.fecha_fin).toLocaleString()
                : (r.fecha_fin ? new Date(r.fecha_fin).toLocaleString() : '')}
              {` | Cupos: ${r.cupos}`}
            </>
          ) : (
            <>
              Unidad: {r.unidad_nombre || r.unidad} | {r.fecha_inicio && new Date(r.fecha_inicio).toLocaleString()} — {r.fecha_fin && new Date(r.fecha_fin).toLocaleString()}
            </>
          )}
          {r.estado && <> | Estado: {r.estado}</>}
          {r.creado_en && <> | Creada: {new Date(r.creado_en).toLocaleString()}</>}
        </div>
      </div>
      {r.estado !== 'CANCELADA' && (
        <button className={`btn btn-ghost btn-sm ${busy ? 'opacity-50 pointer-events-none' : ''}`} onClick={handleCancel} disabled={busy}>
          {busy ? 'Cancelando…' : 'Cancelar'}
        </button>
      )}
    </li>
  );
}

function UnidadesReserva({ areaId, unidades, onCreated }) {
  const [unidadId, setUnidadId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracionMin, setDuracionMin] = useState(60);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const formatLocalNaive = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const reservar = async () => {
    setOk(''); setErr(''); setLoading(true);
    try {
  // Construir fecha inicio y fin a partir de fecha, hora y duracion
      const inicioStr = `${fecha}T${hora}`; // cadena local sin zona horaria
      const d = new Date(`${fecha}T${hora}`);
      if (Number.isNaN(d.getTime())) throw new Error('Fecha u hora inválida');
      const dFin = new Date(d.getTime() + Number(duracionMin) * 60000);
      const finStr = formatLocalNaive(dFin);
      await areasApi.createReserva({ area: areaId, unidad: unidadId, fecha_inicio: inicioStr, fecha_fin: finStr });
      setOk('Reserva creada');
      setUnidadId(''); setFecha(''); setHora(''); setDuracionMin(60);
      onCreated?.();
    } catch (e) {
      setErr(e?.response?.data ? JSON.stringify(e.response.data) : 'Error al crear');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-4 gap-2">
        <select className="select select-bordered" value={unidadId} onChange={e=>setUnidadId(e.target.value)}>
          <option value="">Seleccione una unidad</option>
          {unidades.map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
        <input type="date" className="input input-bordered" value={fecha} onChange={e=>setFecha(e.target.value)} />
        <input type="time" className="input input-bordered" value={hora} onChange={e=>setHora(e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="number" min={15} step={15} className="input input-bordered w-28" value={duracionMin} onChange={e=>setDuracionMin(e.target.value)} />
          <span className="text-sm opacity-70">min</span>
        </div>
      </div>
      <button className={`btn btn-primary ${loading && 'loading'}`} disabled={!unidadId || !fecha || !hora || !duracionMin} onClick={reservar}>Reservar</button>
      {ok && <div className="text-green-600 text-sm">{ok}</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}

function TurnosReserva({ areaId, turnos, ocupaciones = {}, onCreated }) {
  const [cupos, setCupos] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const reservar = async (turnoId) => {
    setOk(''); setErr(''); setLoading(true);
    try {
      await areasApi.createReserva({ area: areaId, turno: turnoId, cupos });
      setOk('Reserva creada');
      onCreated?.();
    } catch (e) {
      setErr(e?.response?.data ? JSON.stringify(e.response.data) : 'Error al crear');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span>Cupos:</span>
        <input type="number" min={1} className="input input-bordered w-24" value={cupos} onChange={e=>setCupos(Number(e.target.value))} />
      </div>
      <ul className="divide-y">
        {turnos.map(t => {
          const occ = ocupaciones[t.id] || { capacidad: t.capacidad, ocupados: 0, disponibles: t.capacidad };
          return (
          <li key={t.id} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-medium">{t.titulo || 'Turno'}</div>
              <div className="text-xs opacity-70">{new Date(t.fecha_inicio).toLocaleString()} — {new Date(t.fecha_fin).toLocaleString()} | Capacidad: {occ.capacidad} | Ocupados: {occ.ocupados} | Disponibles: {occ.disponibles}</div>
            </div>
            <button className={`btn btn-primary btn-sm ${loading && 'loading'}`} onClick={()=>reservar(t.id)}>Reservar</button>
          </li>
          );
        })}
      </ul>
      {ok && <div className="text-green-600 text-sm">{ok}</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
