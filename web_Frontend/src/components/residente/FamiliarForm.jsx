import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { residentService } from '../../api/residentService';
import { userService } from '../../api/userService';

const FamiliarForm = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [familiaId, setFamiliaId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await userService.getMe();
        setFamiliaId(me?.familia?.id || me?.residente?.familia_id || null);
      } catch (e) {
        setError('No se pudo obtener la familia actual');
      }
    };
    load();
  }, []);

  const onSubmit = async (data) => {
    setError(null);
    setLoading(true);
    try {
      if (!familiaId) throw new Error('No hay familia asociada');
  // Validar confirmacion de contrasena
      if (data.password !== data.confirm_password) {
        throw new Error('La confirmación de contraseña no coincide');
      }
      const payload = {
        user: {
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
        },
        documento_identidad: data.documento_identidad,
        familia: familiaId,
        tipo: 'FAMILIAR',
        activo: true,
      };
      await residentService.createResident(payload);
      reset();
      navigate('/residente/familia');
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al crear familiar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Agregar Familiar</h2>
      </div>
      <div className="p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Usuario</label>
            <input className="mt-1 w-full border rounded px-3 py-2" {...register('username', { required: 'Requerido' })} />
            {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Correo</label>
            <input type="email" className="mt-1 w-full border rounded px-3 py-2" {...register('email', { required: 'Requerido' })} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Nombre</label>
            <input className="mt-1 w-full border rounded px-3 py-2" {...register('first_name', { required: 'Requerido' })} />
            {errors.first_name && <p className="text-sm text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Apellido</label>
            <input className="mt-1 w-full border rounded px-3 py-2" {...register('last_name', { required: 'Requerido' })} />
            {errors.last_name && <p className="text-sm text-red-600">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Contraseña</label>
            <input type="password" className="mt-1 w-full border rounded px-3 py-2" {...register('password', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Confirmar contraseña</label>
            <input type="password" className="mt-1 w-full border rounded px-3 py-2" {...register('confirm_password', { required: 'Requerido' })} />
            {errors.confirm_password && <p className="text-sm text-red-600">{errors.confirm_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-700">Documento Identidad</label>
            <input className="mt-1 w-full border rounded px-3 py-2" {...register('documento_identidad', { required: 'Requerido' })} />
            {errors.documento_identidad && <p className="text-sm text-red-600">{errors.documento_identidad.message}</p>}
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/residente/familia')} className="px-4 py-2 rounded border">Cancelar</button>
            <button disabled={loading} type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamiliarForm;