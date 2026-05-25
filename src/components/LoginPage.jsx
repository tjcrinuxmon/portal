import React, { useState } from 'react'
import { login } from '../api.js'
import BrandLogo from './BrandLogo.jsx'

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Ingresa tu correo y contraseña.'); return }
    setLoading(true); setError(null)
    try {
      const { token, user } = await login(email.trim(), password)
      onLogin(token, user)
    } catch (err) {
      setError(err?.response?.data?.error || 'Credenciales incorrectas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ine-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl overflow-hidden"
        style={{ border:'1.5px solid #E2D9EE', borderTop:'4px solid #582E73',
          boxShadow:'0 8px 40px rgba(88,46,115,.13), 0 2px 8px rgba(0,0,0,.05)' }}>

        <div className="px-10 pt-10 pb-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-4 mb-5">
            <BrandLogo size={52} />
            <div className="text-left">
              <p className="text-2xl font-black leading-none tracking-tight" style={{ color:'#575453' }}>DEAJ</p>
              <p className="text-xs font-semibold mt-1.5 leading-snug" style={{ color:'#D5007F' }}>
                Portal de Sistemas
              </p>
            </div>
          </div>
          <div className="w-full flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-px bg-ine-border" />
            <p className="text-xs font-semibold text-ine-muted uppercase tracking-wider px-2 whitespace-nowrap">
              Instituto Nacional Electoral
            </p>
            <div className="flex-1 h-px bg-ine-border" />
          </div>
          <p className="text-xs text-ine-dim">Dirección Ejecutiva de Asuntos Jurídicos</p>
        </div>

        <div className="px-10 pb-10">
          <p className="text-sm font-semibold text-ine-text mb-1">Iniciar sesión</p>
          <p className="text-xs text-ine-muted mb-6">Acceso unificado a todos los sistemas DEAJ</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
              style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ine-label">Correo electrónico</label>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ine.mx" autoComplete="email"
                  className="ine-input" style={{ paddingLeft:'36px' }} />
              </div>
            </div>

            <div>
              <label className="ine-label">Contraseña</label>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="ine-input" style={{ paddingLeft:'36px', paddingRight:'36px' }} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ine-dim hover:text-ine-purple transition-colors" tabIndex={-1}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-ine w-full justify-center mt-2" style={{ padding:'12px 24px' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verificando...</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>Ingresar al Portal</>
              }
            </button>
          </form>

        </div>
      </div>
      <p className="mt-5 text-xs text-ine-dim">© {new Date().getFullYear()} Instituto Nacional Electoral — Uso interno</p>
    </div>
  )
}
