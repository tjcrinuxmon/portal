import React, { useState } from 'react'
import { getSsoToken } from '../api.js'

const APPS = [
  {
    key: 'tareas2',
    title: 'Módulo de Tareas',
    desc: 'Seguimiento de tareas y actividades de la Dirección Ejecutiva de Asuntos Jurídicos.',
    color: '#7040A0',
    bg: '#F5F0FB',
    border: '#D9C8EE',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
        <rect x="14" y="12" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'diligencias',
    title: 'Módulo de Notificaciones',
    desc: 'Calendarización y control de notificaciones judiciales, términos legales y seguimiento de entrega.',
    color: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    key: 'oficios',
    title: 'Módulo de Gestión Documental',
    desc: 'Generación y control correlativo de oficios, opiniones, dictámenes y certificaciones.',
    color: '#047857',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
]

const ACCESS_KEY = {
  tareas:      'acceso_tareas',
  tareas2:     'acceso_tareas',
  diligencias: 'acceso_diligencias',
  oficios:     'acceso_oficios',
}

export default function Portal({ user, onLogout, onManageUsers }) {
  const [loading, setLoading] = useState(null)
  const [error,   setError]   = useState(null)

  const accessible = APPS.filter(a => user[ACCESS_KEY[a.key]])

  const handleAccess = async (appKey) => {
    setLoading(appKey); setError(null)
    try {
      const { token, url } = await getSsoToken(appKey)
      window.location.href = `${url}?sso_token=${token}`
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al conectar con el sistema.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-ine-bg flex flex-col">
      {/* Header */}
      <header className="bg-white flex items-center px-6 h-14 flex-shrink-0"
        style={{ borderBottom:'1px solid #E2D9EE', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div className="flex items-center gap-2.5 mr-auto">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-black"
            style={{ background:'#582E73' }}>INE</div>
          <div>
            <p className="text-sm font-black text-ine-purple leading-none">INE · DEAJ</p>
            <p className="text-xs text-ine-muted leading-none mt-0.5">Sistema de Control Documental</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.rol === 'admin' && (
            <button onClick={onManageUsers} className="btn-ghost text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Gestión de Usuarios
            </button>
          )}
          <div className="flex items-center gap-2 pl-3" style={{ borderLeft:'1px solid #E2D9EE' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background:'#582E73' }}>
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-ine-text hidden sm:block">{user.nombre}</span>
            <button onClick={onLogout} title="Cerrar sesión"
              className="p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10 fade-in">
          <h1 className="text-2xl font-black text-ine-purple mb-2">
            Bienvenido, {user.nombre.split(' ')[0]}
          </h1>
          <p className="text-ine-muted text-sm">Selecciona el sistema al que deseas acceder</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm fade-in"
            style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {accessible.length === 0 ? (
          <div className="ine-card p-8 text-center max-w-sm">
            <p className="text-3xl mb-3">🔒</p>
            <p className="font-semibold text-ine-text mb-2">Sin acceso asignado</p>
            <p className="text-ine-muted text-sm">Contacta al administrador para que te asigne acceso a los sistemas.</p>
          </div>
        ) : (
          <div className={`grid gap-5 fade-in ${accessible.length === 1 ? 'grid-cols-1 max-w-sm' : accessible.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' : 'grid-cols-1 sm:grid-cols-3 max-w-4xl'} w-full`}>
            {accessible.map(app => (
              <div key={app.key} className="ine-card overflow-hidden flex flex-col"
                style={{ borderTop:`3px solid ${app.color}` }}>
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: app.bg, border:`1.5px solid ${app.border}`, color: app.color }}>
                    {app.icon}
                  </div>
                  <h2 className="text-base font-bold mb-2" style={{ color: app.color }}>{app.title}</h2>
                  <p className="text-ine-muted text-sm leading-relaxed">{app.desc}</p>
                </div>
                <div className="px-6 pb-6">
                  <button
                    onClick={() => handleAccess(app.key)}
                    disabled={!!loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: loading === app.key ? app.bg : app.color,
                      color: loading === app.key ? app.color : 'white',
                      border: `1.5px solid ${app.color}`,
                      opacity: loading && loading !== app.key ? 0.5 : 1,
                    }}>
                    {loading === app.key
                      ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Conectando...</>
                      : <>Acceder
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background:'#2A1239' }}>
        <span className="text-xs font-semibold" style={{ color:'rgba(255,255,255,.45)' }}>
          INE · DEAJ — Dirección Ejecutiva de Asuntos Jurídicos
        </span>
        <span className="text-xs" style={{ color:'rgba(255,255,255,.3)' }}>
          © {new Date().getFullYear()} Instituto Nacional Electoral
        </span>
      </footer>
    </div>
  )
}
