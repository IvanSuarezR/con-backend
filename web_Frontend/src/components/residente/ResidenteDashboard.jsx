import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { residentService } from '../../api/residentService';
import { userService } from '../../api/userService';

const ResidenteDashboard = () => {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [me, setMe] = useState(null);
	const [savingId, setSavingId] = useState(null);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [editData, setEditData] = useState({});
	const [editBusy, setEditBusy] = useState(false);
	const [editErr, setEditErr] = useState(null);
	const [permModalOpen, setPermModalOpen] = useState(false);
	const [permBusy, setPermBusy] = useState(false);
	const [draftPerms, setDraftPerms] = useState({
		puede_abrir_porton: false,
		puede_abrir_puerta: false,
		puede_generar_qr_peatonal: false,
			puede_generar_qr_vehicular: false,
			puede_reservar_areas: false,
	});
  const navigate = useNavigate();

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const [profile, data] = await Promise.all([
					userService.getMe(),
					residentService.listResidents(),
				]);
				setMe(profile);
				setItems(data);
			} catch (e) {
				setError(e?.message || 'Error al cargar');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const isPrincipal = useMemo(() => me?.residente?.tipo === 'PRINCIPAL', [me]);

	const refresh = async () => {
		try {
			setLoading(true);
			const data = await residentService.listResidents();
			setItems(data);
		} catch (e) {
			setError(e?.message || 'Error al recargar');
		} finally {
			setLoading(false);
		}
	};

	const openEdit = (residente) => {
		setSelected(residente);
		setEditData({
			first_name: residente?.user?.first_name || '',
			last_name: residente?.user?.last_name || '',
			email: residente?.user?.email || '',
			documento_identidad: residente?.documento_identidad || '',
			is_active: residente?.user?.is_active ?? true,
		});
		setEditErr(null);
		setEditModalOpen(true);
	};
	const closeEdit = () => { setEditModalOpen(false); setSelected(null); setEditData({}); setEditErr(null); };

    const openPerms = (residente) => {
        setSelected(residente);
        setDraftPerms({
            puede_abrir_porton: !!residente.puede_abrir_porton,
            puede_abrir_puerta: !!residente.puede_abrir_puerta,
            puede_generar_qr_peatonal: !!residente.puede_generar_qr_peatonal,
			puede_generar_qr_vehicular: !!residente.puede_generar_qr_vehicular,
			puede_reservar_areas: !!residente.puede_reservar_areas,
        });
        setPermModalOpen(true);
    };
    const closePerms = () => { setPermModalOpen(false); setSelected(null); };

	const saveEdit = async () => {
		if (!selected) return;
		setEditBusy(true);
		setEditErr(null);
		try {
			const payload = {
				user: {
					first_name: editData.first_name,
					last_name: editData.last_name,
					email: editData.email,
					is_active: !!editData.is_active,
				},
				documento_identidad: editData.documento_identidad,
			};
			await residentService.updateResident(selected.id, payload);
			await refresh();
			closeEdit();
		} catch (e) {
			setEditErr(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al guardar'));
		} finally {
			setEditBusy(false);
		}
	};

	const savePerms = async () => {
		if (!selected) return;
		setPermBusy(true);
		try {
			await residentService.updateResident(selected.id, {
				puede_abrir_porton: !!draftPerms.puede_abrir_porton,
				puede_abrir_puerta: !!draftPerms.puede_abrir_puerta,
				puede_generar_qr_peatonal: !!draftPerms.puede_generar_qr_peatonal,
						puede_generar_qr_vehicular: !!draftPerms.puede_generar_qr_vehicular,
						puede_reservar_areas: !!draftPerms.puede_reservar_areas,
			});
			await refresh();
			closePerms();
		} catch (e) {
			alert(e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Error al guardar permisos'));
		} finally {
			setPermBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<section>
				<h1 className="text-2xl font-semibold mb-4">Bienvenido</h1>
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<Link to="/residente/familia" className="card bg-base-100 shadow hover:shadow-md transition">
						<div className="card-body">
							<h3 className="card-title">Mi familia</h3>
							<p className="text-sm opacity-70">Gestiona integrantes y permisos</p>
						</div>
					</Link>
					<Link to="/residente/accesos" className="card bg-base-100 shadow hover:shadow-md transition">
						<div className="card-body">
							<h3 className="card-title">Accesos</h3>
							<p className="text-sm opacity-70">Controla portón/puerta y visitas</p>
						</div>
					</Link>
					<Link to="/residente/areas" className="card bg-base-100 shadow hover:shadow-md transition">
						<div className="card-body">
							<h3 className="card-title">Áreas comunes</h3>
							<p className="text-sm opacity-70">Reserva churrasqueras, capacidad, canchas</p>
						</div>
					</Link>
				</div>
			</section>

			<section className="bg-white rounded-lg shadow">
				<div className="p-4 border-b flex items-center justify-between">
					<h2 className="text-lg font-semibold">Mi familia</h2>
					{isPrincipal && (
						<button onClick={() => navigate('/residente/familia/nuevo')} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">Agregar familiar</button>
					)}
				</div>
				<div className="p-4">
					{loading && <p>Cargando...</p>}
					{error && <p className="text-red-600">{error}</p>}
					{!loading && !error && (
						<ul className="divide-y">
							{items.map((r) => (
								<li key={r.id} className="py-3">
									<div className="flex items-center justify-between">
										<div>
											<div className="font-medium">{r?.user?.first_name} {r?.user?.last_name}</div>
											<div className="text-sm text-gray-500">{r?.documento_identidad} · {r?.tipo}</div>
										</div>
										<div className="flex items-center gap-2">
											<div className="text-sm text-gray-600">{r?.user?.username}</div>
											{isPrincipal && (
												<>
													{/* Editar */}
													<button
														className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
														onClick={() => openEdit(r)}
														disabled={r.tipo === 'PRINCIPAL'}
														title={r.tipo === 'PRINCIPAL' ? 'No puedes editar a un Principal' : 'Editar datos'}
													>
														Editar
													</button>
													{/* Permisos */}
													<button
														className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
														onClick={() => openPerms(r)}
														disabled={r.tipo === 'PRINCIPAL'}
														title={r.tipo === 'PRINCIPAL' ? 'No puedes cambiar permisos de un Principal' : 'Permisos'}
													>
														Permisos
													</button>
												</>
											)}
										</div>
									</div>
								</li>
							))}
							{items.length === 0 && (
								<li className="py-3 text-gray-500">Aún no hay familiares</li>
							)}
						</ul>
					)}
				</div>
			</section>

			{/* Modal de permisos */}
			{permModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={closePerms} />
					<div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
						<h4 className="text-lg font-semibold mb-2">Permisos</h4>
						<div className="space-y-3">
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={!!draftPerms.puede_abrir_porton} onChange={e=>setDraftPerms(p=>({...p, puede_abrir_porton: e.target.checked}))} />
								Puede abrir portón
							</label>
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={!!draftPerms.puede_abrir_puerta} onChange={e=>setDraftPerms(p=>({...p, puede_abrir_puerta: e.target.checked}))} />
								Puede abrir puerta
							</label>
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={!!draftPerms.puede_generar_qr_peatonal} onChange={e=>setDraftPerms(p=>({...p, puede_generar_qr_peatonal: e.target.checked}))} />
								Puede generar QR peatonal
							</label>
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={!!draftPerms.puede_generar_qr_vehicular} onChange={e=>setDraftPerms(p=>({...p, puede_generar_qr_vehicular: e.target.checked}))} />
								Puede generar QR vehicular
							</label>
										<label className="flex items-center gap-2">
											<input type="checkbox" checked={!!draftPerms.puede_reservar_areas} onChange={e=>setDraftPerms(p=>({...p, puede_reservar_areas: e.target.checked}))} />
											Puede reservar áreas comunes
										</label>
						</div>
						<div className="mt-5 flex justify-end gap-2">
							<button onClick={closePerms} className="px-4 py-2 rounded border">Cancelar</button>
							<button disabled={permBusy} onClick={savePerms} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{permBusy ? 'Guardando...' : 'Guardar'}</button>
						</div>
					</div>
				</div>
			)}
		{/* Edit modal */}
		{editModalOpen && (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				<div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
				<div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
					<h4 className="text-lg font-semibold mb-2">Editar familiar</h4>
					{editErr && <div className="mb-3 p-2 text-sm rounded bg-red-50 text-red-700">{editErr}</div>}
					<div className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-sm text-gray-700">Nombre</label>
								<input className="mt-1 border rounded px-3 py-2 w-full" value={editData.first_name||''} onChange={e=>setEditData(p=>({...p, first_name: e.target.value}))} />
							</div>
							<div>
								<label className="block text-sm text-gray-700">Apellido</label>
								<input className="mt-1 border rounded px-3 py-2 w-full" value={editData.last_name||''} onChange={e=>setEditData(p=>({...p, last_name: e.target.value}))} />
							</div>
						</div>
						<div>
							<label className="block text-sm text-gray-700">Correo</label>
							<input type="email" className="mt-1 border rounded px-3 py-2 w-full" value={editData.email||''} onChange={e=>setEditData(p=>({...p, email: e.target.value}))} />
						</div>
						<div>
							<label className="block text-sm text-gray-700">Documento Identidad</label>
							<input className="mt-1 border rounded px-3 py-2 w-full" value={editData.documento_identidad||''} onChange={e=>setEditData(p=>({...p, documento_identidad: e.target.value}))} />
						</div>
						<label className="flex items-center gap-2 text-sm text-gray-700">
							<input type="checkbox" checked={!!editData.is_active} onChange={e=>setEditData(p=>({...p, is_active: e.target.checked}))} />
							Activo (usuario)
						</label>
					</div>
					<div className="mt-5 flex justify-end gap-2">
						<button onClick={closeEdit} className="px-4 py-2 rounded border">Cancelar</button>
						<button disabled={editBusy} onClick={saveEdit} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{editBusy ? 'Guardando...' : 'Guardar'}</button>
					</div>
				</div>
			</div>
		)}
	</div>
	);
};

export default ResidenteDashboard;
