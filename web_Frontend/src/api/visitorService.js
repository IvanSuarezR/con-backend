import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

const withAuth = () => {
  const token = localStorage.getItem('token');
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const visitorService = {
  generarQR: async (payload) => {
    withAuth();
    const res = await axios.post(`${API_URL}/autorizaciones/generar-qr/`, payload);
    return res.data;
  },
  listAutorizaciones: async () => {
    withAuth();
    const res = await axios.get(`${API_URL}/autorizaciones/`);
    return res.data;
  },
  cancelar: async (id) => {
    withAuth();
    const res = await axios.post(`${API_URL}/autorizaciones/${id}/cancelar/`);
    return res.data;
  },
  validarQR: async ({ codigo_qr, evento = 'ENTRADA', modalidad = 'PEATONAL' }) => {
    const res = await axios.post(`${API_URL}/ia/qr/validar/`, { codigo_qr, evento, modalidad });
    return res.data;
  }
};
