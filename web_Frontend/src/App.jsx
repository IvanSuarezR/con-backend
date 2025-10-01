// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import PrivateRoute from './components/PrivateRoute';
import { authService } from './api/authService';
import AdminLayout from './components/admin/AdminLayout';
import ResidentesList from './components/admin/ResidentesList';
import ResidenteForm from './components/admin/ResidenteForm';
import ResidenteLayout from './components/residente/ResidenteLayout';
import ResidenteDashboard from './components/residente/ResidenteDashboard';
import FamiliarForm from './components/residente/FamiliarForm';
import AccesosPanel from './components/residente/AccesosPanel';
import AccesosLayout from './components/residente/AccesosLayout';
import VisitasPanel from './components/residente/VisitasPanel';
import HistorialVisitas from './components/residente/HistorialVisitas';
import ResidenteEdit from './components/admin/ResidenteEdit';
import AreasAdmin from './components/admin/areas/AreasAdmin';
import AreaForm from './components/admin/areas/AreaForm';
import UnidadesAdmin from './components/admin/areas/UnidadesAdmin';
import TurnosAdmin from './components/admin/areas/TurnosAdmin';
import ReservasAdmin from './components/admin/areas/ReservasAdmin';
import AreasLista from './components/residente/areas/AreasLista';
import AreaDetalle from './components/residente/areas/AreaDetalle';
import AdminHome from './components/admin/AdminHome';
import AdminHistorialVisitas from './components/admin/AdminHistorialVisitas';
import CampaignsAdmin from './components/admin/notifications/CampaignsAdmin';
import NotificationsHistoryAdmin from './components/admin/notifications/NotificationsHistoryAdmin';
import ReportesAdmin from './components/admin/ReportesAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          authService.isAuthenticated() ? <Navigate to="/home" /> : <Login />
        } />
        <Route path="/home" element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } />
        {/* Resident section */}
        <Route path="/residente" element={
          <PrivateRoute>
            <ResidenteLayout />
          </PrivateRoute>
        }>
          <Route index element={<ResidenteDashboard />} />
          <Route path="familia" element={<ResidenteDashboard />} />
          <Route path="familia/nuevo" element={<FamiliarForm />} />
          <Route path="accesos" element={<AccesosLayout />}>
            <Route index element={<AccesosPanel />} />
            <Route path="controles" element={<AccesosPanel />} />
            <Route path="visitas" element={<VisitasPanel />} />
            <Route path="historial" element={<HistorialVisitas />} />
          </Route>
          <Route path="areas" element={<AreasLista />} />
          <Route path="areas/:id" element={<AreaDetalle />} />
        </Route>
        {/* Admin section */}
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<AdminHome />} />
          <Route path="residentes" element={<ResidentesList />} />
          <Route path="residentes/nuevo" element={<ResidenteForm />} />
          <Route path="residentes/:id/editar" element={<ResidenteEdit />} />
          <Route path="areas" element={<AreasAdmin />} />
          <Route path="areas/nuevo" element={<AreaForm />} />
          <Route path="areas/:id/editar" element={<AreaForm />} />
          <Route path="areas/:id/unidades" element={<UnidadesAdmin />} />
          <Route path="areas/:id/turnos" element={<TurnosAdmin />} />
          <Route path="areas/:id/reservas" element={<ReservasAdmin />} />
          <Route path="accesos" element={<AccesosPanel />} />
          <Route path="historial-visitas" element={<AdminHistorialVisitas />} />
          <Route path="notificaciones" element={<CampaignsAdmin />} />
          <Route path="notificaciones/historial" element={<NotificationsHistoryAdmin />} />
          <Route path="reportes" element={<ReportesAdmin />} />
        </Route>
        <Route path="/" element={
          authService.isAuthenticated() ? <Navigate to="/home" /> : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;