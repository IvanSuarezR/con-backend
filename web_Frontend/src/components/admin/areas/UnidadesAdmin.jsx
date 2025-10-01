import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function UnidadesAdmin() {
  const { id } = useParams(); // area id
  const [area, setArea] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [nombre, setNombre] = useState('');

  const load = async () => {
    const a = await areasApi.getArea(id);
    setArea(a);
    const us = await areasApi.listUnidades({ area: id });
    setUnidades(us);
  };
  useEffect(() => { load(); }, [id]);

  const onCreate = async () => {
    if (!nombre.trim()) return;
    await areasApi.createUnidad({ area: id, nombre });
    setNombre('');
    await load();
  };
  const onDelete = async (uid) => {
    if (!confirm('¿Eliminar esta unidad?')) return;
    await areasApi.deleteUnidad(uid);
    await load();
  };

  if (!area) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Unidades - {area.nombre}</h1>
        <Link className="btn" to="/admin/areas">Volver</Link>
      </div>
      <div className="flex gap-2">
        <input className="input input-bordered" placeholder="Nombre de unidad" value={nombre} onChange={e=>setNombre(e.target.value)} />
        <button className="btn btn-primary" onClick={onCreate}>Agregar</button>
      </div>
      <ul className="divide-y">
        {unidades.map(u => (
          <li key={u.id} className="py-2 flex justify-between items-center">
            <div>{u.nombre}</div>
            <button className="btn btn-error btn-xs" onClick={()=>onDelete(u.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
