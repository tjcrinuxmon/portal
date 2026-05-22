import React, { useState, useEffect } from 'react'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../api.js'

const DIRS_TAREAS = [
  '','asuntos_laborales','contratos_convenios','enlace_interinstitucional',
  'asesoria_juridica','normatividad','direccion_ejecutiva',
]
const ROLES_TAREAS      = ['admin','ejecutiva','director','subdirector','secretaria']
const ROLES_OFICIOS     = ['admin','usuario']
const ROLES_DILIGENCIAS = ['admin','usuario','notificador']

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? '#582E73' : '#E2D9EE', cursor:'pointer' }}>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </div>
      <span className="text-sm font-medium text-ine-text">{label}</span>
    </label>
  )
}

function UserForm({ initial, onSave, onClose }) {
  const e = initial
  const [f, setF] = useState({
    nombre: e?.nombre || '', email: e?.email || '', password: '',
    rol: e?.rol || 'usuario',
    acceso_tareas: !!e?.acceso_tareas, rol_tareas: e?.rol_tareas || 'director', direccion_tareas: e?.direccion_tareas || '',
    acceso_oficios: !!e?.acceso_oficios, rol_oficios: e?.rol_oficios || 'usuario',
    acceso_diligencias: !!e?.acceso_diligencias, rol_diligencias: e?.rol_diligencias || 'usuario', area_diligencias: e?.area_diligencias || '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.nombre || !f.email) { setErr('Nombre y correo son obligatorios'); return }
    if (!initial && !f.password) { setErr('La contraseña es obligatoria'); return }
    setSaving(true); setErr(null)
    try {
      const data = { ...f }
      if (!data.password) delete data.password
      if (initial) await updateUsuario(initial.id, data)
      else         await createUsuario(data)
      onSave()
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4"
      style={{ background:'rgba(42,18,57,.55)' }}>
      <div className="ine-card w-full max-w-2xl max-h-[88vh] flex flex-col fade-in"
        style={{ boxShadow:'0 20px 60px rgba(88,46,115,.28)' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom:'1px solid #E2D9EE' }}>
          <h2 className="font-bold text-base text-ine-purple">
            {initial ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-ine-dim hover:text-ine-purple text-xl leading-none px-2">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {err && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.22)', color:'#B91C1C' }}>
              {err}
            </div>
          )}

          {/* Datos básicos */}
          <div>
            <p className="text-xs font-bold text-ine-muted uppercase tracking-wider mb-3">Datos del usuario</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ine-label">Nombre completo <span style={{ color:'#B91C1C' }}>*</span></label>
                <input className="ine-input" value={f.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div>
                <label className="ine-label">Correo electrónico <span style={{ color:'#B91C1C' }}>*</span></label>
                <input type="email" className="ine-input" value={f.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="ine-label">{initial ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" className="ine-input" value={f.password} onChange={e => set('password', e.target.value)} placeholder={initial ? '••••••••' : ''} />
              </div>
              <div>
                <label className="ine-label">Rol en el portal</label>
                <select className="ine-input" value={f.rol} onChange={e => set('rol', e.target.value)}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
          </div>

          {/* Acceso Tareas */}
          <div className="rounded-lg p-4" style={{ background:'#F8F5FB', border:'1.5px solid #E2D9EE' }}>
            <div className="flex items-center justify-between mb-3">
              <Toggle checked={f.acceso_tareas} onChange={v => set('acceso_tareas', v)} label="Acceso a Sistema de Tareas" />
            </div>
            {f.acceso_tareas && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="ine-label">Rol en Tareas</label>
                  <select className="ine-input" value={f.rol_tareas} onChange={e => set('rol_tareas', e.target.value)}>
                    {ROLES_TAREAS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ine-label">Dirección</label>
                  <select className="ine-input" value={f.direccion_tareas} onChange={e => set('direccion_tareas', e.target.value)}>
                    {DIRS_TAREAS.map(d => <option key={d} value={d}>{d || '— General —'}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Acceso Diligencias */}
          <div className="rounded-lg p-4" style={{ background:'#F0F9FF', border:'1.5px solid #BAE6FD' }}>
            <div className="flex items-center justify-between mb-3">
              <Toggle checked={f.acceso_diligencias} onChange={v => set('acceso_diligencias', v)} label="Acceso a Sistema de Diligencias" />
            </div>
            {f.acceso_diligencias && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="ine-label">Rol en Diligencias</label>
                  <select className="ine-input" value={f.rol_diligencias} onChange={e => set('rol_diligencias', e.target.value)}>
                    {ROLES_DILIGENCIAS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ine-label">Área</label>
                  <input className="ine-input" value={f.area_diligencias} onChange={e => set('area_diligencias', e.target.value)} placeholder="Ej. DAL" />
                </div>
              </div>
            )}
          </div>

          {/* Acceso Oficios */}
          <div className="rounded-lg p-4" style={{ background:'#F0FDF4', border:'1.5px solid #BBF7D0' }}>
            <div className="flex items-center justify-between mb-3">
              <Toggle checked={f.acceso_oficios} onChange={v => set('acceso_oficios', v)} label="Acceso a Generador de Oficios" />
            </div>
            {f.acceso_oficios && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="ine-label">Rol en Oficios</label>
                  <select className="ine-input" value={f.rol_oficios} onChange={e => set('rol_oficios', e.target.value)}>
                    {ROLES_OFICIOS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 flex-shrink-0" style={{ borderTop:'1px solid #E2D9EE' }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-ine" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement({ onBack }) {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setUsers(await getUsuarios()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    await deleteUsuario(deleting.id)
    setDeleting(null); load()
  }

  const AppBadge = ({ ok, label, color }) => ok
    ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: color + '20', color }}>{label}</span>
    : null

  return (
    <div className="min-h-screen bg-ine-bg flex flex-col">
      <header className="bg-white flex items-center px-6 h-14 flex-shrink-0"
        style={{ borderBottom:'1px solid #E2D9EE', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <button onClick={onBack} className="btn-ghost mr-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al portal
        </button>
        <span className="text-sm font-bold text-ine-purple">Gestión de Usuarios</span>
        <div className="flex-1" />
        <button className="btn-ine" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Nuevo usuario
        </button>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-ine-muted">Cargando usuarios…</div>
          ) : (
            <div className="ine-card overflow-hidden">
              <table className="w-full text-sm" style={{ borderCollapse:'separate', borderSpacing:0 }}>
                <thead>
                  <tr>
                    {['Usuario','Tareas','Diligencias','Oficios','Estado',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-ine-muted bg-ine-bg"
                        style={{ borderBottom:'1.5px solid #E2D9EE' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom:'1px solid #EDE8F4' }}
                      onMouseEnter={e => e.currentTarget.style.background='#F8F5FB'}
                      onMouseLeave={e => e.currentTarget.style.background=''}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ine-text">{u.nombre}</p>
                        <p className="text-xs text-ine-muted">{u.email}</p>
                        {u.rol === 'admin' && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background:'#EDE8F4', color:'#582E73' }}>ADMIN</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.acceso_tareas
                          ? <div><AppBadge ok color="#582E73" label={u.rol_tareas} />{u.direccion_tareas && <p className="text-xs text-ine-muted mt-0.5">{u.direccion_tareas}</p>}</div>
                          : <span className="text-ine-dim text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.acceso_diligencias
                          ? <div><AppBadge ok color="#0369A1" label={u.rol_diligencias} />{u.area_diligencias && <p className="text-xs text-ine-muted mt-0.5">{u.area_diligencias}</p>}</div>
                          : <span className="text-ine-dim text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.acceso_oficios
                          ? <AppBadge ok color="#047857" label={u.rol_oficios} />
                          : <span className="text-ine-dim text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={u.activo ? { background:'#D1FAE5', color:'#065F46' } : { background:'#FEE2E2', color:'#B91C1C' }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditing(u); setShowForm(true) }}
                            className="btn-ghost text-xs px-2 py-1">✏️</button>
                          <button onClick={() => setDeleting(u)}
                            className="btn-ghost text-xs px-2 py-1 hover:text-red-600">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <UserForm initial={editing} onSave={() => { setShowForm(false); setEditing(null); load() }} onClose={() => { setShowForm(false); setEditing(null) }} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background:'rgba(42,18,57,.55)' }}>
          <div className="ine-card p-7 max-w-sm w-full text-center fade-in">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="font-bold mb-1">¿Eliminar usuario?</p>
            <p className="text-ine-muted text-sm mb-5">{deleting.nombre} — {deleting.email}</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-outline" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn-ine" style={{ background:'#DC2626', boxShadow:'none' }} onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
