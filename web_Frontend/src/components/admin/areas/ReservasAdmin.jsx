import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function ReservasAdmin() {
  const { id } = useParams(); // area id
  const [area, setArea] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rango, setRango] = useState('hoy'); // hoy | semana | personalizado | todos
  const [orden, setOrden] = useState('reciente'); // reciente | antiguo

  const load = async () => {
    const a = await areasApi.getArea(id);
    setArea(a);
    const params = { area: id };
    // Opcional: backend aun no soporta filtros por fecha/estado por query, filtramos en front por ahora
    const rs = await areasApi.listReservas(params);
    setReservas(rs);
  };
  useEffect(() => { load(); }, [id]);

  // Helpers de formato y calculo de rango
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const setRangeBy = (value) => {
    setRango(value);
    const now = new Date();
    if (value === 'hoy') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      setDesde(toLocalInput(start));
      setHasta(toLocalInput(end));
    } else if (value === 'semana') {
      // Semana con inicio lunes
      const day = now.getDay(); // 0=Dom,1=Lun,...
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      setDesde(toLocalInput(monday));
      setHasta(toLocalInput(sunday));
    } else if (value === 'todos') {
      setDesde('');
      setHasta('');
    } else {
      // personalizado: no tocamos desde/hasta
    }
  };

  // Inicializar rango por defecto (hoy)
  useEffect(() => { setRangeBy('hoy'); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const onDelete = async (rid) => {
    if (!confirm('¿Eliminar reserva?')) return;
    await areasApi.deleteReserva(rid);
    await load();
  };

  if (!area) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reservas - {area.nombre}</h1>
        <Link className="btn" to="/admin/areas">Volver</Link>
      </div>
      <div className="grid md:grid-cols-6 gap-2 items-end">
        <div>
          <label className="label">Buscar</label>
          <input className="input input-bordered w-full" placeholder="Residente o familia" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="select select-bordered w-full" value={estado} onChange={e=>setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="label">Rango</label>
          <select className="select select-bordered w-full" value={rango} onChange={e=>setRangeBy(e.target.value)}>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="personalizado">Fecha personalizada</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        {rango === 'personalizado' && (
          <>
            <div>
              <label className="label">Desde</label>
              <input type="datetime-local" className="input input-bordered w-full" value={desde} onChange={e=>setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="datetime-local" className="input input-bordered w-full" value={hasta} onChange={e=>setHasta(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label className="label">Orden</label>
          <select className="select select-bordered w-full" value={orden} onChange={e=>setOrden(e.target.value)}>
            <option value="reciente">Más recientes primero</option>
            <option value="antiguo">Más antiguos primero</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table min-w-[1000px]">
          <thead>
            <tr>
              <th>Residente</th>
              <th>Familia</th>
              <th>Modalidad</th>
              <th>Detalle</th>
              <th>Estado</th>
              <th>Creada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reservas
              .filter(r => !q || (r.residente_nombre?.toLowerCase().includes(q.toLowerCase()) || r.familia_nombre?.toLowerCase().includes(q.toLowerCase())))
              .filter(r => !estado || r.estado === estado)
              .filter(r => {
                if (!desde && !hasta) return true;
                const ini = r.fecha_inicio || r.turno_detalle?.fecha_inicio;
                const fin = r.fecha_fin || r.turno_detalle?.fecha_fin;
                const iniT = ini ? new Date(ini).getTime() : 0;
                const finT = fin ? new Date(fin).getTime() : 0;
                const dT = desde ? new Date(desde).getTime() : -Infinity;
                const hT = hasta ? new Date(hasta).getTime() : Infinity;
                // Algun traslape dentro del rango
                return (iniT <= hT) && (finT >= dT);
              })
              .sort((a,b) => {
                const aT = new Date(a.fecha_inicio || a.turno_detalle?.fecha_inicio || a.creado_en || 0).getTime();
                const bT = new Date(b.fecha_inicio || b.turno_detalle?.fecha_inicio || b.creado_en || 0).getTime();
                return orden === 'reciente' ? bT - aT : aT - bT;
              })
              .map(r => (
              <tr key={r.id}>
                <td>{r.residente_nombre || r.residente}</td>
                <td>{r.familia_nombre || r.familia}</td>
                <td>{r.turno ? 'CAPACIDAD' : 'UNIDADES'}</td>
                <td>
                  {r.turno ? (
                    <div className="text-sm">
                      <div>{r.turno_detalle?.titulo || `Turno #${r.turno}`}</div>
                      <div className="opacity-70">{r.turno_detalle?.fecha_inicio && new Date(r.turno_detalle.fecha_inicio).toLocaleString()} — {r.turno_detalle?.fecha_fin && new Date(r.turno_detalle.fecha_fin).toLocaleString()}</div>
                      <div className="opacity-70">Cupos: {r.cupos}</div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div>{r.unidad_nombre || `Unidad #${r.unidad}`}</div>
                      <div className="opacity-70">{r.fecha_inicio && new Date(r.fecha_inicio).toLocaleString()} — {r.fecha_fin && new Date(r.fecha_fin).toLocaleString()}</div>
                    </div>
                  )}
                </td>
                <td>{r.estado}</td>
                <td>{r.creado_en && new Date(r.creado_en).toLocaleString()}</td>
                <td>
                  <button className="btn btn-error btn-xs" onClick={()=>onDelete(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
