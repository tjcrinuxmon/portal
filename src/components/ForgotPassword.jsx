import React, { useState, useRef, useEffect } from 'react'
import { forgotPassword, verifyResetCode, resetPassword } from '../api.js'
import BrandLogo from './BrandLogo.jsx'

// ── Entrada de 6 dígitos ─────────────────────────────────────────────────────

function CodeInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  useEffect(() => { refs[0].current?.focus() }, [])

  const handleChange = (i, val) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) refs[i + 1].current?.focus()
    if (next.every(x => x !== '')) onComplete(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs[i - 1].current?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs[i + 1].current?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setDigits(next)
    const focus = Math.min(pasted.length, 5)
    refs[focus].current?.focus()
    if (pasted.length === 6) onComplete(pasted)
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center my-5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: '44px', height: '52px',
            textAlign: 'center', fontSize: '22px', fontWeight: '700',
            border: `2px solid ${d ? '#582E73' : '#D1C4E2'}`,
            borderRadius: '8px', outline: 'none',
            background: d ? '#F8F5FB' : '#fff',
            color: '#2A1239',
            transition: 'border-color .15s',
            fontFamily: 'monospace',
          }}
          onFocus={e => e.target.style.borderColor = '#582E73'}
          onBlur={e => e.target.style.borderColor = d ? '#582E73' : '#D1C4E2'}
        />
      ))}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ForgotPassword({ onBack }) {
  const [step,     setStep]     = useState('email')   // email | code | password | done
  const [email,    setEmail]    = useState('')
  const [code,     setCode]     = useState('')
  const [token,    setToken]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [resendCd, setResendCd] = useState(0)

  // Countdown para reenviar código
  useEffect(() => {
    if (resendCd <= 0) return
    const t = setTimeout(() => setResendCd(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCd])

  // Paso 1 — enviar código
  const handleSendCode = async (e) => {
    e?.preventDefault()
    if (!email.trim()) { setError('Ingresa tu correo electrónico'); return }
    setLoading(true); setError(null)
    try {
      await forgotPassword(email.trim())
      setStep('code')
      setResendCd(60)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al enviar el código')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2 — verificar código
  const handleVerifyCode = async (codeVal) => {
    const c = codeVal ?? code
    if (c.length !== 6) return
    setLoading(true); setError(null)
    try {
      const { token: t } = await verifyResetCode(email.trim(), c)
      setToken(t)
      setStep('password')
    } catch (err) {
      setError(err?.response?.data?.error || 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  // Paso 3 — nueva contraseña
  const handleSetPassword = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError(null)
    try {
      await resetPassword(token, password)
      setStep('done')
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = {
    email:    '¿Olvidaste tu contraseña?',
    code:     'Verifica tu identidad',
    password: 'Nueva contraseña',
    done:     'Contraseña restablecida',
  }

  return (
    <div className="min-h-screen bg-ine-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl overflow-hidden"
        style={{ border:'1.5px solid #E2D9EE', borderTop:'4px solid #582E73',
          boxShadow:'0 8px 40px rgba(88,46,115,.13), 0 2px 8px rgba(0,0,0,.05)' }}>

        {/* Header */}
        <div className="px-10 pt-8 pb-5 flex flex-col items-center">
          <div className="inline-flex items-center gap-4 mb-5">
            <BrandLogo size={48} />
            <div className="text-left">
              <p className="text-2xl font-black leading-none tracking-tight" style={{ color:'#575453' }}>DEAJ</p>
              <p className="text-xs font-semibold mt-1.5 leading-snug" style={{ color:'#D5007F' }}>Portal de Sistemas</p>
            </div>
          </div>

          {/* Indicador de pasos */}
          {step !== 'done' && (
            <div className="flex items-center gap-1.5 mb-1">
              {['email', 'code', 'password'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                    style={{
                      background: step === s ? '#582E73' : ['email','code','password'].indexOf(step) > i ? '#C4B0DA' : '#EDE8F4',
                      color: step === s || ['email','code','password'].indexOf(step) > i ? '#fff' : '#9B8AB5',
                    }}>
                    {['email','code','password'].indexOf(step) > i
                      ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      : i + 1}
                  </div>
                  {i < 2 && <div className="w-6 h-px" style={{ background: ['email','code','password'].indexOf(step) > i ? '#C4B0DA' : '#EDE8F4' }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="px-10 pb-10">
          <p className="text-sm font-bold text-ine-text mb-1">{stepTitle[step]}</p>

          {/* ── Paso 1: correo ─────────────────────────────────────────── */}
          {step === 'email' && (
            <>
              <p className="text-xs text-ine-muted mb-5">Ingresa tu correo y te enviaremos un código de verificación.</p>
              {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>{error}</div>}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="ine-label">Correo electrónico</label>
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="correo@ine.mx" autoComplete="email"
                      className="ine-input" style={{ paddingLeft:'36px' }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-ine w-full justify-center" style={{ padding:'11px 24px' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</>
                    : <>Enviar código
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Paso 2: código 6 dígitos ───────────────────────────────── */}
          {step === 'code' && (
            <>
              <p className="text-xs text-ine-muted mb-1">
                Enviamos un código de 6 dígitos a <strong>{email}</strong>.
              </p>
              <p className="text-xs text-ine-dim mb-2">Revisa también tu carpeta de spam.</p>
              {error && <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>{error}</div>}
              <CodeInput key={error} onComplete={c => { setCode(c); handleVerifyCode(c) }} />
              {loading && (
                <div className="flex justify-center mb-3">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor:'#E2D9EE', borderTopColor:'#582E73' }} />
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <button onClick={() => { setStep('email'); setError(null) }}
                  className="text-xs text-ine-dim hover:text-ine-purple transition-colors">
                  Cambiar correo
                </button>
                {resendCd > 0
                  ? <span className="text-xs text-ine-dim">Reenviar en {resendCd}s</span>
                  : <button onClick={handleSendCode} disabled={loading}
                      className="text-xs font-semibold hover:text-ine-purple transition-colors" style={{ color:'#582E73' }}>
                      Reenviar código
                    </button>
                }
              </div>
            </>
          )}

          {/* ── Paso 3: nueva contraseña ───────────────────────────────── */}
          {step === 'password' && (
            <>
              <p className="text-xs text-ine-muted mb-5">Elige una contraseña segura para tu cuenta.</p>
              {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>{error}</div>}
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="ine-label">Nueva contraseña <span style={{ color:'#B91C1C' }}>*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
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
                </div>
                <div>
                  <label className="ine-label">Confirmar contraseña <span style={{ color:'#B91C1C' }}>*</span></label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña" className="ine-input" />
                </div>
                <button type="submit" disabled={loading} className="btn-ine w-full justify-center" style={{ padding:'11px 24px' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                    : <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Guardar contraseña
                      </>
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Paso 4: listo ──────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background:'rgba(5,150,105,.08)' }}>
                <svg className="w-6 h-6" fill="none" stroke="#059669" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-ine-text mb-1">¡Contraseña actualizada!</p>
              <p className="text-sm text-ine-muted mb-5">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button className="btn-ine" onClick={onBack}>Iniciar sesión</button>
            </div>
          )}

          {/* Volver al login */}
          {step !== 'done' && (
            <button onClick={onBack}
              className="mt-5 flex items-center gap-1.5 text-xs text-ine-dim hover:text-ine-purple transition-colors mx-auto">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs text-ine-dim">© {new Date().getFullYear()} Instituto Nacional Electoral — Uso interno</p>
    </div>
  )
}
