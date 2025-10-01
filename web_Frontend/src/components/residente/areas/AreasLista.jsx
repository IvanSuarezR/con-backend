import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function AreasLista() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await areasApi.listAreas();
        setAreas(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">Cargando...</div>;

  if (!areas.length) return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">Áreas comunes</h1>
      <p className="opacity-70">No hay áreas disponibles por ahora.</p>
    </div>
  );

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Áreas comunes</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map(a => (
          <Link key={a.id} to={`/residente/areas/${a.id}`} className="card bg-base-100 shadow hover:shadow-md transition">
            <div className="card-body">
              <h2 className="card-title">{a.nombre}</h2>
              <p className="text-sm opacity-70">Tipo: {a.tipo === 'UNIDADES' ? 'por unidades' : 'por turnos/capacidad'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
