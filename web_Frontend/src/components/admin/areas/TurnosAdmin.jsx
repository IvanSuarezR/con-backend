import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function TurnosAdmin() {
  const { id } = useParams(); // area id
  const [area, setArea] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [form, setForm] = useState({ titulo: '', fecha_inicio: '', fecha_fin: '', capacidad: 10 });

  const load = async () => {
    const a = await areasApi.getArea(id);
    setArea(a);
    const ts = await areasApi.listTurnos({ area: id });
    setTurnos(ts);
  };
  useEffect(() => { load(); }, [id]);

  const onCreate = async () => {
    const payload = { ...form, area: id };
    await areasApi.createTurno(payload);
    setForm({ titulo: '', fecha_inicio: '', fecha_fin: '', capacidad: 10 });
    await load();
  };
  const onDelete = async (tid) => {
    if (!confirm('¿Eliminar turno?')) return;
    await areasApi.deleteTurno(tid);
    await load();
  };

  if (!area) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Turnos - {area.nombre}</h1>
        <Link className="btn" to="/admin/areas">Volver</Link>
      </div>
      <div className="grid md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="label">Título</label>
          <input className="input input-bordered w-full" value={form.titulo} onChange={e=>setForm(f=>({...f, titulo: e.target.value}))} />
        </div>
        <div>
          <label className="label">Inicio</label>
          <input type="datetime-local" className="input input-bordered w-full" value={form.fecha_inicio} onChange={e=>setForm(f=>({...f, fecha_inicio: e.target.value}))} />
        </div>
        <div>
          <label className="label">Fin</label>
          <input type="datetime-local" className="input input-bordered w-full" value={form.fecha_fin} onChange={e=>setForm(f=>({...f, fecha_fin: e.target.value}))} />
        </div>
        <div>
          <label className="label">Capacidad</label>
          <input type="number" className="input input-bordered w-full" value={form.capacidad} onChange={e=>setForm(f=>({...f, capacidad: Number(e.target.value)}))} />
        </div>
      </div>
      <div>
        <button className="btn btn-primary" onClick={onCreate}>Crear turno</button>
      </div>
      <ul className="divide-y">
        {turnos.map(t => (
          <li key={t.id} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-medium">{t.titulo || 'Turno'}</div>
              <div className="text-xs opacity-70">{new Date(t.fecha_inicio).toLocaleString()} — {new Date(t.fecha_fin).toLocaleString()} | Capacidad: {t.capacidad}</div>
            </div>
            <button className="btn btn-error btn-xs" onClick={()=>onDelete(t.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
