import React, { useState, useEffect } from 'react'
import { validateResetToken, resetPassword } from '../api.js'
import BrandLogo from './BrandLogo.jsx'

export default function ResetPassword({ token, onDone }) {
  const [status,   setStatus]   = useState('loading') // loading | valid | invalid | saving | done
  const [user,     setUser]     = useState(null)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    validateResetToken(token)
      .then(u => { setUser(u); setStatus('valid') })
      .catch(() => setStatus('invalid'))
  }, [token])

  const rules = [
    { ok: password.length >= 10,        label: 'Mínimo 10 caracteres' },
    { ok: /[A-Z]/.test(password),       label: 'Al menos una mayúscula (A-Z)' },
    { ok: /[a-z]/.test(password),       label: 'Al menos una minúscula (a-z)' },
    { ok: /[0-9]/.test(password),       label: 'Al menos un número (0-9)' },
    { ok: /[!@#$%&*\-_]/.test(password), label: 'Al menos un carácter especial (!@#$%&*-_)' },
  ]
  const allRulesMet = rules.every(r => r.ok)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRulesMet) { setError('La contraseña no cumple todos los requisitos'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setStatus('saving'); setError(null)
    try {
      await resetPassword(token, password)
      setStatus('done')
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al establecer la contraseña')
      setStatus('valid')
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
                Sistema de Control Documental
              </p>
            </div>
          </div>
        </div>

        <div className="px-10 pb-10">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-4 rounded-full animate-spin"
                style={{ borderColor:'#E2D9EE', borderTopColor:'#582E73' }} />
              <p className="text-sm text-ine-muted">Validando enlace…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background:'rgba(220,38,38,.08)' }}>
                <svg className="w-6 h-6" fill="none" stroke="#B91C1C" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="font-bold text-ine-text mb-1">Enlace inválido o expirado</p>
              <p className="text-sm text-ine-muted mb-5">Solicita al administrador que te envíe un nuevo enlace.</p>
              <button className="btn-ine" onClick={onDone}>Ir al inicio de sesión</button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background:'rgba(5,150,105,.08)' }}>
                <svg className="w-6 h-6" fill="none" stroke="#059669" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-ine-text mb-1">Contraseña establecida</p>
              <p className="text-sm text-ine-muted mb-5">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button className="btn-ine" onClick={onDone}>Iniciar sesión</button>
            </div>
          )}

          {(status === 'valid' || status === 'saving') && user && (
            <>
              <p className="text-sm font-semibold text-ine-text mb-1">Hola, {user.nombre.split(' ')[0]}</p>
              <p className="text-xs text-ine-muted mb-5">Establece la contraseña para tu cuenta <strong>{user.email}</strong></p>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
                  style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="ine-label">Nueva contraseña <span style={{ color:'#B91C1C' }}>*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Escribe tu contraseña"
                      className="ine-input" style={{ paddingRight:'36px' }} />
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
                  {/* Requisitos en tiempo real */}
                  <div className="mt-2 space-y-1">
                    {rules.map(({ ok, label }) => {
                      const color = password.length === 0 ? '#9CA3AF' : ok ? '#059669' : '#DC2626'
                      return (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke={color} viewBox="0 0 24 24">
                            {ok && password.length > 0
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            }
                          </svg>
                          <span style={{ color }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="ine-label">Confirmar contraseña <span style={{ color:'#B91C1C' }}>*</span></label>
                  <input type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="ine-input" />
                  {confirm.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none"
                        stroke={password === confirm ? '#059669' : '#DC2626'} viewBox="0 0 24 24">
                        {password === confirm
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        }
                      </svg>
                      <span style={{ color: password === confirm ? '#059669' : '#DC2626' }}>
                        {password === confirm ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                      </span>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={status === 'saving'} className="btn-ine w-full justify-center mt-2" style={{ padding:'12px 24px' }}>
                  {status === 'saving'
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                    : <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Establecer contraseña
                      </>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs text-ine-dim">© {new Date().getFullYear()} Instituto Nacional Electoral — Uso interno</p>
    </div>
  )
}
