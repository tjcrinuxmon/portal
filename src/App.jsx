import React, { useState } from 'react'
import LoginPage      from './components/LoginPage.jsx'
import Portal         from './components/Portal.jsx'
import UserManagement from './components/UserManagement.jsx'
import ResetPassword  from './components/ResetPassword.jsx'
import { getToken, getUser, setAuth, clearAuth } from './auth.js'

function getResetToken() {
  return new URLSearchParams(window.location.search).get('token')
}

export default function App() {
  const [token,      setToken]      = useState(() => getToken())
  const [user,       setUser]       = useState(() => getUser())
  const [view,       setView]       = useState('portal')
  const [resetToken, setResetToken] = useState(() => getResetToken())

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

  if (!token || !user) return <LoginPage onLogin={handleLogin} />

  if (view === 'users' && user.rol === 'admin')
    return <UserManagement onBack={() => setView('portal')} />

  return (
    <Portal
      user={user}
      onLogout={handleLogout}
      onManageUsers={() => setView('users')}
    />
  )
}
