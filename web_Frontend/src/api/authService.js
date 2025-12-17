import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

// Configurar axios para incluir credenciales
axios.defaults.withCredentials = true;

export const authService = {
    login: async (username, password) => {
        try {
            console.log('Intentando login con:', { username });
            const response = await axios.post(`${API_URL}/token/`, {
                username,
                password
            });
            
            console.log('Respuesta del servidor:', response.data);
            
            if (response.data.access) {
                const token = response.data.access;
                localStorage.setItem('token', token);
                localStorage.setItem('refreshToken', response.data.refresh);
                
                // Configurar el token en los headers de axios
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Guardamos la información básica del usuario
                const userData = {
                    username,
                    token
                };
                localStorage.setItem('user', JSON.stringify(userData));
                
                return { 
                    success: true, 
                    user: userData,
                    token: token
                };
            }
            
            throw new Error('No se recibió el token de acceso');
        } catch (error) {
            console.error('Error detallado de login:', error.response || error);
            throw error.response?.data || error.message;
        }
    },

    logout: () => {
        try {
            // Eliminar tokens y datos de usuario
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            // Limpiar el header de autorización
            delete axios.defaults.headers.common['Authorization'];
            // Redirección robusta al login para evitar pantallas en blanco
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
            return { success: true };
        } catch (error) {
            console.error('Error during logout:', error);
            return { success: false, error: error.message };
        }
    },

    // Función para refrescar el token
    refreshToken: async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_URL}/token/refresh/`, {
                refresh: refreshToken
            });

            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                return { success: true };
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            // Si hay un error al refrescar, hacemos logout
            authService.logout();
            return { success: false, error: error.message };
        }
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        return !!token;
    },

    // Obtener el token actual
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Obtener el usuario actual
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Añade el token a todas las peticiones
    setAuthHeader: (token) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }
};