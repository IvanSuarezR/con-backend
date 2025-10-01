import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const withAuth = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const residentService = {
  listFamilies: async (params = {}) => {
    withAuth();
    const res = await axios.get(`${API_URL}/familias/`, { params });
    const data = res.data;
    return Array.isArray(data) ? data : (data.results || []);
  },
  getFamily: async (id) => {
    withAuth();
    const res = await axios.get(`${API_URL}/familias/${id}/`);
    return res.data;
  },
  listResidents: async (params = {}) => {
    withAuth();
    const res = await axios.get(`${API_URL}/residentes/`, { params });
    const data = res.data;
    return Array.isArray(data) ? data : (data.results || []);
  },
  getResident: async (id) => {
    withAuth();
    const res = await axios.get(`${API_URL}/residentes/${id}/`);
    return res.data;
  },
  createResident: async (payload) => {
    withAuth();
    const res = await axios.post(`${API_URL}/residentes/`, payload);
    return res.data;
  },
  updateResident: async (id, payload) => {
    withAuth();
    const res = await axios.patch(`${API_URL}/residentes/${id}/`, payload);
    return res.data;
  },
  createFamily: async (payload) => {
    withAuth();
    const res = await axios.post(`${API_URL}/familias/`, payload);
    return res.data;
  },
  updateFamily: async (id, payload) => {
    withAuth();
    const res = await axios.patch(`${API_URL}/familias/${id}/`, payload);
    return res.data;
  },
  deleteFamily: async (id) => {
    withAuth();
    const res = await axios.delete(`${API_URL}/familias/${id}/`);
    return res.data;
  }
};
