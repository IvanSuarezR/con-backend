import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const withAuth = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const notificationsApi = {
  list: async (params = {}) => {
    withAuth();
    const res = await axios.get(`${API_URL}/notificaciones/`, { params });
    return res.data;
  },
  markRead: async (ids) => {
    withAuth();
    const res = await axios.post(`${API_URL}/notificaciones/marcar-leidas/`, { ids });
    return res.data;
  },
  send: async (payload) => {
    withAuth();
    const res = await axios.post(`${API_URL}/notificaciones/enviar/`, payload);
    return res.data;
  }
};
