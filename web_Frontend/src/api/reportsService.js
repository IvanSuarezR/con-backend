import { authService } from './authService';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const base = `${API_URL}/reportes`;

async function get(url, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}${qs ? `?${qs}` : ''}`, {
    headers: {
      'Authorization': `Bearer ${authService.getToken()}`,
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    return res.text();
  }
  return res.json();
}

export const reportsService = {
  residentes: (params) => get(`${base}/residentes/`, params),
  familias: (params) => get(`${base}/familias/`, params),
  accesos: (params) => get(`${base}/accesos/`, params),
  reservas: (params) => get(`${base}/reservas/`, params),
  visitas: (params) => get(`${base}/visitas/`, params),
  downloadCsv: async (endpoint, params = {}) => {
    const qs = new URLSearchParams({ ...params, format: 'csv' }).toString();
    const url = `${endpoint}${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = 'reporte.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
};
