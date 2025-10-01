import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const userService = {
  getMe: async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${API_URL}/users/me/`, { headers });
    return res.data;
  },
};
