import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { areasApi } from '../../../api/areas';

export default function AreaForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { tipo: 'UNIDADES', activo: true } });

  useEffect(() => {
    if (editing) {
      areasApi.getArea(id).then(data => reset(data));
    }
  }, [id]);

  const onSubmit = async (values) => {
    if (editing) await areasApi.updateArea(id, values);
    else await areasApi.createArea(values);
    navigate('/admin/areas');
  };

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-xl font-semibold mb-4">{editing ? 'Editar Área' : 'Nueva Área'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input input-bordered w-full" {...register('nombre', { required: true })} />
        </div>
        <div>
          <label className="label">Grupo</label>
          <select className="select select-bordered w-full" {...register('tipo', { required: true })}>
            <option value="UNIDADES">Por unidades (churrasqueras, canchas)</option>
            <option value="AFORO">Por capacidad/turnos</option>
          </select>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="textarea textarea-bordered w-full" {...register('descripcion')} />
        </div>
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input type="checkbox" className="checkbox" {...register('activo')} />
            <span className="label-text">Activa</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">Guardar</button>
          <button className="btn" type="button" onClick={() => navigate('/admin/areas')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
