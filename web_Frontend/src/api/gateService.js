import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

const withAuth = () => {
  const token = localStorage.getItem('token');
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const gateService = {
  abrir: async (modo = 'PEATONAL', placa) => {
    withAuth();
    const res = await axios.post(`${API_URL}/porton/abrir/`, { modo, placa });
    return res.data;
  },
  cerrar: async (modo = 'PEATONAL') => {
    withAuth();
    const res = await axios.post(`${API_URL}/porton/cerrar/`, { modo });
    return res.data;
  },
  abrirPeatonal: async () => {
    withAuth();
    const res = await axios.post(`${API_URL}/puerta/abrir/`);
    return res.data;
  },
  cerrarPeatonal: async () => {
    withAuth();
    const res = await axios.post(`${API_URL}/puerta/cerrar/`);
    return res.data;
  },
  reconocerFacial: async (documento_identidad) => {
    const res = await axios.post(`${API_URL}/ia/peatonal/reconocer/`, { documento_identidad });
    return res.data;
  },
  reconocerPlaca: async (placa) => {
    const res = await axios.post(`${API_URL}/ia/vehicular/placa/`, { placa });
    return res.data;
  }
};
