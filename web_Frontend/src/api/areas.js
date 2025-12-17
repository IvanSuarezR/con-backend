import axios from 'axios';
import { authService } from './authService';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = authService.getToken?.();
  console.log(`[Areas API] Request to ${config.url}`, { tokenExists: !!token });
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const areasApi = {
  // Areas
  listAreas: (params={}) => api.get('/areas', { params }).then(r => r.data),
  getArea: (id) => api.get(`/areas/${id}/`).then(r => r.data),
  getCalendario: (id, params={}) => api.get(`/areas/${id}/calendario/`, { params }).then(r => r.data),
  createArea: (data) => api.post('/areas/', data).then(r => r.data),
  updateArea: (id, data) => api.put(`/areas/${id}/`, data).then(r => r.data),
  deleteArea: (id) => api.delete(`/areas/${id}/`).then(r => r.data),

  // Unidades
  listUnidades: (params={}) => api.get('/unidades-area', { params }).then(r => r.data),
  createUnidad: (data) => api.post('/unidades-area/', data).then(r => r.data),
  updateUnidad: (id, data) => api.put(`/unidades-area/${id}/`, data).then(r => r.data),
  deleteUnidad: (id) => api.delete(`/unidades-area/${id}/`).then(r => r.data),

  // Turnos
  listTurnos: (params={}) => api.get('/turnos-area', { params }).then(r => r.data),
  createTurno: (data) => api.post('/turnos-area/', data).then(r => r.data),
  updateTurno: (id, data) => api.put(`/turnos-area/${id}/`, data).then(r => r.data),
  deleteTurno: (id) => api.delete(`/turnos-area/${id}/`).then(r => r.data),

  // Reservas
  listReservas: (params={}) => api.get('/reservas-area', { params }).then(r => r.data),
  createReserva: (data) => api.post('/reservas-area/', data).then(r => r.data),
  updateReserva: (id, data) => api.put(`/reservas-area/${id}/`, data).then(r => r.data),
  patchReserva: (id, data) => api.patch(`/reservas-area/${id}/`, data).then(r => r.data),
  deleteReserva: (id) => api.delete(`/reservas-area/${id}/`).then(r => r.data),
};
