import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Restaurar encabezado Authorization si existe token guardado
const savedToken = localStorage.getItem('token')
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
}

// Interceptor global para manejar 401/403 y redirigir al login
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      try {
        // Limpiar sesión
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
      } finally {
        // Redirección dura para evitar estados inconsistentes/pantalla en blanco
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
