import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function AreasAdmin() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await areasApi.listAreas({});
      setAreas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let f = areas;
    if (q) f = f.filter(a => (a.nombre || '').toLowerCase().includes(q.toLowerCase()));
    if (tipo) f = f.filter(a => a.tipo === tipo);
    return f;
  }, [areas, q, tipo]);

  const onDelete = async (id) => {
  if (!confirm('¿Eliminar esta área?')) return;
    await areasApi.deleteArea(id);
    await load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Áreas Comunes</h1>
        <Link to="nuevo" className="btn btn-primary">Nueva Área</Link>
      </div>
      <div className="flex gap-3">
        <input className="input input-bordered w-full max-w-sm" placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="select select-bordered" value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="">Todas</option>
          <option value="UNIDADES">Grupo: unidades</option>
          <option value="AFORO">Grupo: capacidad/turnos</option>
        </select>
      </div>
      {loading ? <div>Cargando...</div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="card bg-base-100 shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{a.nombre}</div>
                  <div className="text-xs opacity-70">{a.tipo === 'UNIDADES' ? 'Grupo: unidades' : 'Grupo: capacidad/turnos'}</div>
                </div>
                <div className="flex gap-2">
                  <Link className="btn btn-xs" to={`${a.id}/editar`}>Editar</Link>
                  <button className="btn btn-xs btn-error" onClick={()=>onDelete(a.id)}>Eliminar</button>
                </div>
              </div>
                <div className="mt-3 text-sm">{a.descripcion}</div>
              <div className="mt-3 flex gap-2">
                {a.tipo === 'UNIDADES' && (
                  <Link className="btn btn-sm" to={`${a.id}/unidades`}>Unidades</Link>
                )}
                {a.tipo === 'AFORO' && (
                  <Link className="btn btn-sm" to={`${a.id}/turnos`}>Turnos</Link>
                )}
                <Link className="btn btn-sm" to={`${a.id}/reservas`}>Reservas</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
