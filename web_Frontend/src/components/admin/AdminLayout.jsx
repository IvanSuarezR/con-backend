import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
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

const AdminLayoutInner = () => {
	const location = useLocation();
	const isActive = (path) => location.pathname.startsWith(path);
	const [allowed, setAllowed] = useState(null);
	const [me, setMe] = useState(null);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const meData = await userService.getMe();
				if (mounted) {
					setAllowed(!!meData?.is_staff);
					setMe(meData);
				}
			} catch {
				if (mounted) setAllowed(false);
			}
		};
		load();
		return () => { mounted = false; };
	}, []);

	if (allowed === false) return <Navigate to="/home" replace />;
	if (allowed === null) return <div className="p-6">Cargando...</div>;

	const handleLogout = () => {
		try { authService.logout(); } finally { window.location.href = '/login'; }
	};

	const initial = me?.first_name?.[0] || me?.username?.[0] || '?';
	const fullName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username : '...';
	const email = me?.email || '';

	return (
		<div className="min-h-screen bg-gray-100">
			<Banner />
			<div className="flex">
				{/* Sidebar */}
				<aside className="w-64 bg-white shadow-md h-screen sticky top-0">
					<div className="p-4 border-b">
						<h2 className="text-xl font-semibold">Panel</h2>
						<div className="mt-4 flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
								{initial}
							</div>
							<div>
								<div className="text-sm font-medium text-gray-900">{fullName}</div>
								<div className="text-xs text-gray-500">{email}</div>
								<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700">Admin</span>
							</div>
						</div>
					</div>
					<nav className="mt-4">
						<ul className="space-y-2">
							<li>
								<Link to="/admin" className={`flex items-center px-4 py-2 ${location.pathname === '/admin' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Dashboard</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/accesos" className={`flex items-center px-4 py-2 ${isActive('/admin/accesos') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Abrir/cerrar puertas principal</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/residentes" className={`flex items-center px-4 py-2 ${isActive('/admin/residentes') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Residentes</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/areas" className={`flex items-center px-4 py-2 ${isActive('/admin/areas') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Áreas comunes</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/historial-visitas" className={`flex items-center px-4 py-2 ${isActive('/admin/historial-visitas') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Historial de visitas</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/notificaciones" className={`flex items-center px-4 py-2 ${isActive('/admin/notificaciones') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Notificaciones</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/notificaciones/historial" className={`flex items-center px-4 py-2 ${isActive('/admin/notificaciones/historial') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Historial de notificaciones</span>
								</Link>
							</li>
							<li>
								<Link to="/admin/reportes" className={`flex items-center px-4 py-2 ${isActive('/admin/reportes') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
									<span className="mx-4">Reportes</span>
								</Link>
							</li>
							<li>
								<button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700">
									<span className="mx-4">Cerrar Sesión</span>
								</button>
							</li>
						</ul>
					</nav>
				</aside>

				{/* Main Content */}
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

const AdminLayout = () => (
	<AccessControlProvider>
		<AdminLayoutInner />
	</AccessControlProvider>
);

export default AdminLayout;
