import axios from 'axios'
import { getToken, clearAuth } from './auth.js'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use(cfg => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { clearAuth(); window.location.reload() }
  return Promise.reject(err)
})

export const login              = (email, password) => api.post('/auth/login', { email, password }).then(r => r.data)
export const getMe              = ()                 => api.get('/auth/me').then(r => r.data)
export const getSsoToken        = (app)              => api.get(`/sso/${app}`).then(r => r.data)
export const getUsuarios        = ()                 => api.get('/usuarios').then(r => r.data)
export const createUsuario      = (d)                => api.post('/usuarios', d).then(r => r.data)
export const updateUsuario      = (id, d)            => api.put(`/usuarios/${id}`, d).then(r => r.data)
export const deleteUsuario      = (id)               => api.delete(`/usuarios/${id}`).then(r => r.data)
export const validateResetToken = (token)            => api.get(`/auth/reset-password/${token}`).then(r => r.data)
export const resetPassword      = (token, password)  => api.post('/auth/reset-password', { token, password }).then(r => r.data)
export const forgotPassword        = (email)               => api.post('/auth/forgot-password', { email }).then(r => r.data)
export const verifyResetCode       = (email, code)         => api.post('/auth/verify-code', { email, code }).then(r => r.data)
export const getSubdirecciones     = ()                    => api.get('/subdirecciones').then(r => r.data)
export const createSubdireccion    = (direccion_key, nombre) => api.post('/subdirecciones', { direccion_key, nombre }).then(r => r.data)
export const updateSubdireccion    = (id, nombre)           => api.put(`/subdirecciones/${id}`, { nombre }).then(r => r.data)
export const deleteSubdireccion    = (id)                  => api.delete(`/subdirecciones/${id}`).then(r => r.data)
