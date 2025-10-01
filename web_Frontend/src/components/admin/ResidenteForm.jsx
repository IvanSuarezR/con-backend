import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { residentService } from '../../api/residentService';

const ResidenteForm = () => {
	const navigate = useNavigate();
	const location = useLocation();
		const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();
	const [familias, setFamilias] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
		const tipo = watch('tipo');
		const autoFamily = watch('auto_family');
		const watchTipo = watch('tipo');

		useEffect(() => {
			// Para PRINCIPAL, ambas opciones siempre activas por defecto
			// Activar permisos por defecto
			const defaults = {
				puede_abrir_porton: true,
				puede_abrir_puerta: true,
				puede_generar_qr_peatonal: true,
				puede_generar_qr_vehicular: true,
				puede_reservar_areas: true,
			};
			Object.entries(defaults).forEach(([k,v]) => setValue(k, v, { shouldValidate: false }));
		}, [watchTipo, setValue]);

	useEffect(() => {
		const load = async () => {
			try {
				const fams = await residentService.listFamilies();
				setFamilias(fams);
				// Si viene familia preseleccionada por query, pre-cargar en el form
				const params = new URLSearchParams(location.search);
				const fid = params.get('familia');
				if (fid) {
					setValue('familia', String(fid), { shouldValidate: false, shouldDirty: false });
					// Por defecto, cuando se crea desde una familia, asumimos tipo FAMILIAR
					setValue('tipo', 'FAMILIAR', { shouldValidate: false, shouldDirty: false });
				}
			} catch (e) {
				setError('No se pudieron cargar las familias');
			}
		};
		load();
	}, [location.search, setValue]);

		const onSubmit = async (data) => {
		setError(null);
		setLoading(true);
		try {
				if (data.password !== data.password2) {
					setLoading(false);
					setError('Las contraseñas no coinciden');
					return;
				}
							// Si elige crear familia automáticamente para PRINCIPAL, primero creamos familia
							let familiaId = data.familia ? Number(data.familia) : null;
							if (data.tipo === 'PRINCIPAL' && data.auto_family) {
								const apellido = (data.last_name || '').trim();
								if (!apellido) throw new Error('Para crear familia automáticamente, el apellido del residente principal es requerido.');
								const nuevaFamilia = await residentService.createFamily({
									nombre: apellido,
									departamento: data.departamento || 'S/N',
									torre: data.torre || null,
									activo: true,
								});
								familiaId = nuevaFamilia.id;
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
								tipo: data.tipo || 'FAMILIAR',
	                puede_abrir_porton: (data.tipo === 'PRINCIPAL') ? true : !!data.puede_abrir_porton,
	                puede_abrir_puerta: (data.tipo === 'PRINCIPAL') ? true : !!data.puede_abrir_puerta,
	                puede_generar_qr_peatonal: (data.tipo === 'PRINCIPAL') ? true : !!data.puede_generar_qr_peatonal,
								puede_generar_qr_vehicular: (data.tipo === 'PRINCIPAL') ? true : !!data.puede_generar_qr_vehicular,
								puede_reservar_areas: (data.tipo === 'PRINCIPAL') ? true : !!data.puede_reservar_areas,
				activo: true,
			};

			await residentService.createResident(payload);
			reset();
			navigate(`/admin/residentes${location.search || ''}`);
		} catch (e) {
			setError(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al crear residente'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-3xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold">Nuevo Residente</h1>
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
						<div>
							<label className="block text-sm text-gray-700">Contraseña</label>
							<input type="password" className="mt-1 w-full border rounded px-3 py-2" {...register('password', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })} />
							{errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
						</div>
						<div>
							<label className="block text-sm text-gray-700">Repetir Contraseña</label>
							<input type="password" className="mt-1 w-full border rounded px-3 py-2" {...register('password2', { required: 'Requerido' })} />
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
									{tipo === 'PRINCIPAL' && !new URLSearchParams(location.search).get('familia') && (
										<>
											<div className="md:col-span-2">
												<label className="inline-flex items-center gap-2 text-sm text-gray-700">
													<input type="checkbox" {...register('auto_family')} />
													Crear familia automáticamente con el apellido del residente principal
												</label>
											</div>
											{autoFamily && (
												<>
													<div>
														<label className="block text-sm text-gray-700">Departamento</label>
														<input className="mt-1 w-full border rounded px-3 py-2" {...register('departamento')} placeholder="Ej: 12B" />
													</div>
													<div>
														<label className="block text-sm text-gray-700">Torre</label>
														<input className="mt-1 w-full border rounded px-3 py-2" {...register('torre')} placeholder="Ej: A" />
													</div>
												</>
											)}
										</>
									)}

													{/* Permisos de Acceso */}
													<div className="md:col-span-2 border-t pt-4">
														<h3 className="text-sm font-medium mb-2">Permisos de Acceso</h3>
														<label className="flex items-center gap-2 text-sm text-gray-700">
															<input type="checkbox" {...register('puede_abrir_porton')} disabled={watchTipo === 'PRINCIPAL'} />
															Puede abrir portón {watchTipo === 'PRINCIPAL' && <span className="text-xs text-gray-500">(siempre activo para Principal)</span>}
														</label>
														<label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
															<input type="checkbox" {...register('puede_abrir_puerta')} disabled={watchTipo === 'PRINCIPAL'} />
															Puede abrir puerta peatonal {watchTipo === 'PRINCIPAL' && <span className="text-xs text-gray-500">(siempre activo para Principal)</span>}
														</label>
														<label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
															<input type="checkbox" {...register('puede_generar_qr_peatonal')} disabled={watchTipo === 'PRINCIPAL'} />
															Puede generar QR peatonal {watchTipo === 'PRINCIPAL' && <span className="text-xs text-gray-500">(siempre activo para Principal)</span>}
														</label>
														<label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
															<input type="checkbox" {...register('puede_generar_qr_vehicular')} disabled={watchTipo === 'PRINCIPAL'} />
															Puede generar QR vehicular {watchTipo === 'PRINCIPAL' && <span className="text-xs text-gray-500">(siempre activo para Principal)</span>}
														</label>
														<label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
															<input type="checkbox" {...register('puede_reservar_areas')} disabled={watchTipo === 'PRINCIPAL'} />
															Puede reservar áreas comunes {watchTipo === 'PRINCIPAL' && <span className="text-xs text-gray-500">(siempre activo para Principal)</span>}
														</label>
													</div>
					</div>
				</div>

				<div className="flex items-center justify-end gap-3">
					<button type="button" onClick={() => navigate(`/admin/residentes${location.search || ''}`)} className="px-4 py-2 rounded border">Cancelar</button>
					<button disabled={loading} type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
						{loading ? 'Guardando...' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default ResidenteForm;
