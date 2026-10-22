import React, { useState } from 'react'
import LoginPage      from './components/LoginPage.jsx'
import Portal         from './components/Portal.jsx'
import UserManagement from './components/UserManagement.jsx'
import ResetPassword  from './components/ResetPassword.jsx'
import ForgotPassword from './components/ForgotPassword.jsx'
import { getToken, getUser, setAuth, clearAuth, vencido } from './auth.js'

// Un módulo cuya sesión venció manda aquí con ?ir=<app>&ruta=<#/pantalla>: al iniciar sesión
// se entra de nuevo a ese módulo, en esa pantalla.
function leerDestino() {
  const p = new URLSearchParams(window.location.search)
  const ir = p.get('ir')
  if (!ir) return null
  const ruta = p.get('ruta') || ''
  return { ir, ruta: /^#\/[\w\-\/?=&%.]*$/.test(ruta) ? ruta : '' }
}
// Al abrir: si la sesión guardada ya venció, se descarta (se pide iniciar sesión)
if (getToken() && vencido(getToken())) clearAuth()

function getResetToken() {
  return new URLSearchParams(window.location.search).get('token')
}

export default function App() {
  const [token,      setToken]      = useState(() => getToken())
  const [user,       setUser]       = useState(() => getUser())
  const [view,       setView]       = useState('portal')
  const [resetToken, setResetToken] = useState(() => getResetToken())
  const [destino,    setDestino]    = useState(() => leerDestino())
  const destinoUsado = () => { setDestino(null); window.history.replaceState({}, '', window.location.pathname) }

  const handleLogin = (tok, usr) => {
    setAuth(tok, usr); setToken(tok); setUser(usr); setView('portal')
  }
  const handleLogout = () => {
    clearAuth(); setToken(null); setUser(null); setView('portal')
  }
  const handleResetDone = () => {
    setResetToken(null)
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (resetToken) return <ResetPassword token={resetToken} onDone={handleResetDone} />

  if (!token || !user) {
    if (view === 'forgot') return <ForgotPassword onBack={() => setView('portal')} />
    return <LoginPage onLogin={handleLogin} onForgot={() => setView('forgot')} />
  }

  if (view === 'users' && user.rol === 'admin')
    return <UserManagement onBack={() => setView('portal')} me={user} />

  return (
    <Portal
      user={user}
      destino={destino}
      onDestinoUsado={destinoUsado}
      onLogout={handleLogout}
      onManageUsers={() => setView('users')}
    />
  )
}
