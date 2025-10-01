import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

// Layout de Accesos con sub-navegación a Controles, Visitas e Historial
const AccesosLayout = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accesos</h2>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-4">
          <nav className="-mb-px flex gap-4">
            <NavLink
              to="/residente/accesos"
              end
              className={({ isActive: isExact }) =>
                `px-3 py-3 border-b-2 text-sm ${isExact ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`
              }
            >
              Controles
            </NavLink>
            <NavLink
              to="/residente/accesos/visitas"
              className={() =>
                `px-3 py-3 border-b-2 text-sm ${isActive('/residente/accesos/visitas') ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`
              }
            >
              Visitas
            </NavLink>
            <NavLink
              to="/residente/accesos/historial"
              className={() =>
                `px-3 py-3 border-b-2 text-sm ${isActive('/residente/accesos/historial') ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`
              }
            >
              Historial de Visitas
            </NavLink>
          </nav>
        </div>
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AccesosLayout;
