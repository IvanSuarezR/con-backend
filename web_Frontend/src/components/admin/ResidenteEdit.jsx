import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { residentService } from '../../api/residentService';

const ResidenteEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [original, setOriginal] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [fams, residente] = await Promise.all([
          residentService.listFamilies(),
          residentService.getResident(id)
        ]);
        setFamilias(fams);
        // Guardar valores originales para calcular cambios
        const orig = {
          user: {
            username: residente.user?.username || '',
            email: residente.user?.email || '',
            first_name: residente.user?.first_name || '',
            last_name: residente.user?.last_name || '',
            is_active: residente.user?.is_active ?? true,
          },
          residente: {
            documento_identidad: residente.documento_identidad || '',
            familia: residente.familia ?? null,
            tipo: residente.tipo || 'FAMILIAR',
            puede_abrir_porton: !!residente.puede_abrir_porton,
            puede_abrir_puerta: !!residente.puede_abrir_puerta,
            puede_generar_qr_peatonal: !!residente.puede_generar_qr_peatonal,
            puede_generar_qr_vehicular: !!residente.puede_generar_qr_vehicular,
            puede_reservar_areas: !!residente.puede_reservar_areas,
          }
        };
        setOriginal(orig);
        // Preload form values
        reset({
          username: residente.user?.username || '',
          email: residente.user?.email || '',
          first_name: residente.user?.first_name || '',
          last_name: residente.user?.last_name || '',
          documento_identidad: residente.documento_identidad || '',
          familia: residente.familia ?? '',
          tipo: residente.tipo || 'FAMILIAR',
          is_active: residente.user?.is_active ?? true,
          puede_abrir_porton: !!residente.puede_abrir_porton,
          puede_abrir_puerta: !!residente.puede_abrir_puerta,
          puede_generar_qr_peatonal: !!residente.puede_generar_qr_peatonal,
          puede_generar_qr_vehicular: !!residente.puede_generar_qr_vehicular,
          puede_reservar_areas: !!residente.puede_reservar_areas,
        });
      } catch (e) {
        setError(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al cargar residente'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, reset]);

  const onSubmit = async (data) => {
    setError(null);
    setSaving(true);
    try {
      // Construir payload solo con cambios
      const payload = {};
      const norm = (v) => (typeof v === 'string' ? v.trim() : v);
      if (original) {
        const userChanges = {};
        const username = norm(data.username);
        if (username !== original.user.username) userChanges.username = username;
        const email = norm(data.email);
        if (email !== original.user.email) userChanges.email = email;
        const first_name = norm(data.first_name);
        if (first_name !== original.user.first_name) userChanges.first_name = first_name;
        const last_name = norm(data.last_name);
        if (last_name !== original.user.last_name) userChanges.last_name = last_name;
        if (data.password) userChanges.password = data.password;
  const is_active = Boolean(data.is_active);
  if (is_active !== original.user.is_active) userChanges.is_active = is_active;
  if (Object.keys(userChanges).length > 0) payload.user = userChanges;

        const resChanges = {};
        const doc = norm(data.documento_identidad);
        if (doc !== original.residente.documento_identidad) resChanges.documento_identidad = doc;
        // familia: normalizar a numero o null
        const famVal = data.familia === '' ? null : Number(data.familia);
        if (famVal !== original.residente.familia) resChanges.familia = famVal;
        const tipo = data.tipo || 'FAMILIAR';
        if (tipo !== original.residente.tipo) resChanges.tipo = tipo;
  // activo se maneja via user.is_active ahora
        const puede_abrir_porton = Boolean(data.puede_abrir_porton);
        if (puede_abrir_porton !== original.residente.puede_abrir_porton) resChanges.puede_abrir_porton = puede_abrir_porton;
        const puede_abrir_puerta = Boolean(data.puede_abrir_puerta);
        if (puede_abrir_puerta !== original.residente.puede_abrir_puerta) resChanges.puede_abrir_puerta = puede_abrir_puerta;
  const puede_generar_qr_peatonal = Boolean(data.puede_generar_qr_peatonal);
  if (puede_generar_qr_peatonal !== original.residente.puede_generar_qr_peatonal) resChanges.puede_generar_qr_peatonal = puede_generar_qr_peatonal;
  const puede_generar_qr_vehicular = Boolean(data.puede_generar_qr_vehicular);
  if (puede_generar_qr_vehicular !== original.residente.puede_generar_qr_vehicular) resChanges.puede_generar_qr_vehicular = puede_generar_qr_vehicular;
  const puede_reservar_areas = Boolean(data.puede_reservar_areas);
  if (puede_reservar_areas !== original.residente.puede_reservar_areas) resChanges.puede_reservar_areas = puede_reservar_areas;
        Object.assign(payload, resChanges);
      }

  await residentService.updateResident(id, payload);
  navigate(`/admin/residentes${location.search || ''}`);
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al actualizar residente'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Editar Residente</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Datos de Usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700">Nueva contraseña (opcional)</label>
              <input type="password" className="mt-1 w-full border rounded px-3 py-2" {...register('password')} placeholder="Dejar en blanco para no cambiar" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Datos de Residente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700">Documento Identidad</label>
              <input className="mt-1 w-full border rounded px-3 py-2" {...register('documento_identidad', { required: 'Requerido' })} />
              {errors.documento_identidad && <p className="text-sm text-red-600">{errors.documento_identidad.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-700">Tipo de Residente</label>
              <select className="mt-1 w-full border rounded px-3 py-2" {...register('tipo', { required: true })}>
                <option value="FAMILIAR">Familiar</option>
                <option value="PRINCIPAL">Principal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Familia</label>
              <select className="mt-1 w-full border rounded px-3 py-2" {...register('familia')}>
                <option value="">Sin familia</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre} - Dpto {f.departamento}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="is_active" type="checkbox" {...register('is_active')} />
              <label htmlFor="is_active" className="text-sm text-gray-700">Activo</label>
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Permisos de Acceso</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('puede_abrir_porton')} />
                Puede abrir portón
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                <input type="checkbox" {...register('puede_abrir_puerta')} />
                Puede abrir puerta peatonal
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                <input type="checkbox" {...register('puede_generar_qr_peatonal')} />
                Puede generar QR peatonal
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                <input type="checkbox" {...register('puede_generar_qr_vehicular')} />
                Puede generar QR vehicular
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                <input type="checkbox" {...register('puede_reservar_areas')} />
                Puede reservar áreas comunes
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(`/admin/residentes${location.search || ''}`)} className="px-4 py-2 rounded border">Cancelar</button>
          <button disabled={saving} type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResidenteEdit;
