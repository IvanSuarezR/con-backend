import React, { useEffect, useState } from 'react';
import { Link, Outlet, Navigate, useLocation, NavLink } from 'react-router-dom';
import { userService } from '../../api/userService';
import { authService } from '../../api/authService';
import { AccessControlProvider, useAccessControl } from '../../context/AccessControlContext';
import NotificationsBell from '../shared/NotificationsBell';

const Banner = () => {
	const { openState, busy, formatTime, closePorton, closePuerta } = useAccessControl();
	if (!openState) return null;
	const base = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg text-white text-lg font-semibold';
	const color = openState.tipo === 'porton' ? 'bg-green-700' : 'bg-emerald-700';
	return (
		<div className={`${base} ${color}`}>
			<div className="flex flex-col md:flex-row md:items-center gap-3">
				<div>{openState.tipo === 'porton' ? 'Portón' : 'Puerta peatonal'} ABIERTO</div>
				<div className="text-base font-normal opacity-90">Se cerrará automáticamente en {formatTime(openState.remaining)}</div>
				<div className="flex-1" />
				{openState.tipo === 'porton' ? (
					<button disabled={busy} onClick={() => closePorton(false)} className="px-3 py-1.5 rounded bg-black/30 hover:bg-black/40 text-white">Cerrar ahora</button>
				) : (
					<button disabled={busy} onClick={() => closePuerta(false)} className="px-3 py-1.5 rounded bg-black/30 hover:bg-black/40 text-white">Cerrar ahora</button>
				)}
			</div>
		</div>
	);
};

const ResidenteLayoutInner = () => {
	const location = useLocation();
	const [allowed, setAllowed] = useState(null);
	const [me, setMe] = useState(null);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const profile = await userService.getMe();
				if (!mounted) return;
				setMe(profile);
				// Permitir navegar por todo el modulo residente; los permisos se validan dentro de cada pantalla
				setAllowed(true);
			} catch {
				if (mounted) setAllowed(false);
			}
		};
		load();
		return () => { mounted = false; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname]);

	if (allowed === false) return <Navigate to="/home" replace />;
	if (allowed === null) return <div className="p-6">Cargando...</div>;

	const handleLogout = () => {
		try { authService.logout(); } finally { window.location.href = '/login'; }
	};

	const isActive = (path) => location.pathname.startsWith(path);

	const initial = me?.first_name?.[0] || me?.username?.[0] || '?';
	const fullName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username : '...';
	const email = me?.email || '';

	return (
		<div className="min-h-screen bg-gray-100">
			<Banner />
			<div className="flex">
				<aside className="w-64 bg-white shadow-md h-screen sticky top-0">
					<div className="p-4 border-b">
						<h2 className="text-xl font-semibold">Residente</h2>
						<div className="mt-4 flex items-center gap-3">
							{me?.residente?.foto_perfil_url ? (
								<img src={me.residente.foto_perfil_url} alt="Perfil" className="h-10 w-10 rounded-full object-cover" />
							) : (
								<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
									{initial}
								</div>
							)}
							<div>
								<div className="text-sm font-medium text-gray-900">{fullName}</div>
								<div className="text-xs text-gray-500">{email}</div>
								<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Residente</span>
							</div>
						</div>
					</div>
					<nav className="mt-4">
						<ul className="space-y-2">
							<li>
								<NavLink to="/residente/familia" className={`flex items-center px-4 py-2 ${isActive('/residente/familia') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Mi familia</span>
								</NavLink>
							</li>
							<li>
								<NavLink to="/residente/accesos" className={`flex items-center px-4 py-2 ${isActive('/residente/accesos') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Accesos</span>
								</NavLink>
							</li>
							<li>
								<NavLink to="/residente/areas" className={`flex items-center px-4 py-2 ${isActive('/residente/areas') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Áreas comunes</span>
								</NavLink>
							</li>
							<li>
								<button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700">
									<span className="mx-4">Cerrar sesión</span>
								</button>
							</li>
						</ul>
					</nav>
				</aside>
				<main className="flex-1 p-6">
					<div className="flex items-center justify-end mb-4">
						<NotificationsBell />
					</div>
					<Outlet />
				</main>
			</div>
		</div>
	);
};

const ResidenteLayout = () => (
  <AccessControlProvider>
    <ResidenteLayoutInner />
  </AccessControlProvider>
);

export default ResidenteLayout;
