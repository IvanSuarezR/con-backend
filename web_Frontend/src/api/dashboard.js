import axios from 'axios';
import { authService } from './authService';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
	const token = authService.getToken?.();
    console.log(`[Dashboard API] Request to ${config.url}`, { tokenExists: !!token });
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export const dashboardApi = {
	getAdminMetrics: () => api.get('/admin/metrics/').then(r => r.data),
	getAdminDetail: (detail) => api.get('/admin/metrics/', { params: { detail } }).then(r => r.data),
};
