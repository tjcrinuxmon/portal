import React, { useState, useEffect, useCallback } from 'react'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getSubdirecciones, createSubdireccion, updateSubdireccion, deleteSubdireccion } from '../api.js'

const DIRECCIONES = [
  { key: 'instruccion_recusal',             label: 'Dir. de Instrucción Recursal',       color: '#3B82F6' },
  { key: 'contratos_convenios',             label: 'Dir. de Contratos y Convenios',      color: '#10B981' },
  { key: 'asuntos_hasl',                    label: 'Dir. de Asuntos HASL',               color: '#F59E0B' },
  { key: 'normatividad_consulta',           label: 'Dir. de Normatividad y Consulta',    color: '#8B5CF6' },
  { key: 'asuntos_laborales',               label: 'Dir. de Asuntos Laborales',          color: '#EF4444' },
  { key: 'servicios_legales',               label: 'Dir. de Servicios Legales',          color: '#14B8A6' },
  { key: 'coordinacion_administrativa',     label: 'Coord. Administrativa',              color: '#D97706' },
  { key: 'secretaria_particular',           label: 'Secretaría Particular',              color: '#EC4899' },
  { key: 'coordinacion_gestion_documental', label: 'Coord. de Gestión Documental',       color: '#6366F1' },
  { key: 'enlace_interinstitucional',       label: 'Líder de Enlace Interinstitucional', color: '#F97316' },
]

const ROLES_TAREAS = [
  { key: 'admin',       label: 'Administrador',                    color: '#7C3AED' },
  { key: 'ejecutiva',   label: 'Directora Ejecutiva',              color: '#E4007B' },
  { key: 'director',    label: 'Director/a de Área-Coordinador/a', color: '#582E73' },
  { key: 'subdirector', label: 'Subdirector/a',                    color: '#2563EB' },
  { key: 'secretaria',  label: 'Secretaría Particular',            color: '#EC4899' },
]

const ROLES_DILIGENCIAS = [
  { key: 'usuario',     label: 'Usuario' },
  { key: 'notificador', label: 'Notificador' },
  { key: 'coordinador', label: 'Coordinador' },
]

const ROLES_OFICIOS = [
  { key: 'admin',   label: 'Administrador' },
  { key: 'usuario', label: 'Usuario' },
]

const AREAS_DILIGENCIAS = [
  'Coordinación de Análisis de Información y Control Documental',
  'Coordinación Administrativa',
  'Dirección de Instrucción Recursal',
  'Dirección de Servicios Legales',
  'Dirección de Asuntos Laborales',
  'Dirección de Normatividad y Consulta',
  'Dirección de Asuntos HASL',
  'Dirección de Contratos y Convenios',
]

const GROUPS = [
  { key: 'admin',       label: 'Administrador',                    color: '#7C3AED' },
  { key: 'ejecutiva',   label: 'Directora Ejecutiva',              color: '#E4007B' },
  { key: 'director',    label: 'Director/a de Área-Coordinador/a', color: '#582E73' },
  { key: 'subdirector', label: 'Subdirector/a',                    color: '#2563EB' },
  { key: 'secretaria',  label: 'Secretaría Particular',            color: '#EC4899' },
  { key: null,          label: 'Sin acceso a Tareas',              color: '#6B7280' },
]

const needsDireccion = (rol) => rol === 'director' || rol === 'subdirector'
const needsPuesto    = (rol) => rol === 'subdirector'
const dirCfg         = (key) => DIRECCIONES.find(d => d.key === key)

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? '#582E73' : '#D1C4E2', cursor: 'pointer' }}>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </div>
      <span className="text-sm font-semibold text-ine-text">{label}</span>
    </label>
  )
}

// ── Small app badge ───────────────────────────────────────────────────────────

function AppBadge({ label, color }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: color + '18', color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const EMPTY = {
  nombre: '', email: '', password: '',
  rol: 'usuario', puesto: '', activo: true,
  acceso_tareas: false, rol_tareas: 'director', direccion_tareas: 'instruccion_recusal',
  acceso_diligencias: false, rol_diligencias: 'usuario', area_diligencias: '',
  acceso_oficios: false, rol_oficios: 'usuario',
}

function UserModal({ user, onSaved, onClose, subdirecciones = [] }) {
  const isEdit = !!user
  const [f, setF] = useState(isEdit ? {
    nombre:             user.nombre           || '',
    email:              user.email            || '',
    password:           '',
    rol:                user.rol              || 'usuario',
    puesto:             user.puesto           || '',
    activo:             user.activo           ?? true,
    acceso_tareas:      !!user.acceso_tareas,
    rol_tareas:         user.rol_tareas       || 'director',
    direccion_tareas:   user.direccion_tareas || 'instruccion_recusal',
    acceso_diligencias: !!user.acceso_diligencias,
    rol_diligencias:    user.rol_diligencias  || 'usuario',
    area_diligencias:   user.area_diligencias || '',
    acceso_oficios:     !!user.acceso_oficios,
    rol_oficios:        user.rol_oficios      || 'usuario',
  } : { ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [showPass, setShowPass] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const roleColor = f.acceso_tareas
    ? (ROLES_TAREAS.find(r => r.key === f.rol_tareas)?.color ?? '#6B7280')
    : '#6B7280'

  const dirSubs = subdirecciones.filter(s => s.direccion_key === f.direccion_tareas)

  const handleSubmit = async () => {
    if (!f.nombre.trim() || !f.email.trim()) { setError('Nombre y correo son obligatorios'); return }
    setSaving(true); setError(null)
    try {
      const data = { ...f }
      if (!data.password) delete data.password
      if (!needsDireccion(f.rol_tareas)) data.direccion_tareas = ''
      if (!needsPuesto(f.rol_tareas))    data.puesto = ''
      if (isEdit) await updateUsuario(user.id, data)
      else        await createUsuario(data)
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(42,18,57,.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden fade-in"
        style={{ border: '1.5px solid #E2D9EE', boxShadow: '0 20px 60px rgba(88,46,115,.20)' }}>

        {/* Color bar */}
        <div className="h-1 flex-shrink-0" style={{ background: roleColor }} />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid #EDE8F4' }}>
          <h3 className="text-base font-bold text-ine-text">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.22)', color: '#B91C1C' }}>
              {error}
            </div>
          )}

          {/* ── Datos generales ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ine-label">Nombre completo <span style={{ color: '#B91C1C' }}>*</span></label>
              <input className="ine-input" value={f.nombre}
                onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="ine-label">Correo electrónico <span style={{ color: '#B91C1C' }}>*</span></label>
              <input type="email" className="ine-input" value={f.email}
                onChange={e => set('email', e.target.value)} placeholder="correo@ine.mx" />
            </div>
            {isEdit ? (
              <div>
                <label className="ine-label">
                  Contraseña
                  <span className="text-ine-dim font-normal normal-case"> (vacío = sin cambio)</span>
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="ine-input" value={f.password}
                    onChange={e => set('password', e.target.value)} placeholder="••••••••"
                    style={{ paddingRight: '36px' }} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ine-dim hover:text-ine-purple transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPass
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </>
                      }
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="col-span-2 flex items-start gap-2.5 rounded-lg px-4 py-3"
                style={{ background: 'rgba(88,46,115,.06)', border: '1px solid #E2D9EE' }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-ine-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-ine-text leading-relaxed">
                  Se enviará un correo a <strong>{f.email || 'la dirección indicada'}</strong> con un enlace para que el usuario establezca su contraseña.
                </p>
              </div>
            )}
            <div>
              <label className="ine-label">Rol en el portal</label>
              <select className="ine-input" value={f.rol} onChange={e => set('rol', e.target.value)}>
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {isEdit && (
              <div className="col-span-2 flex items-center justify-between rounded-lg px-4 py-3"
                style={{ background: '#F8F5FB', border: '1.5px solid #E2D9EE' }}>
                <span className="text-sm font-medium text-ine-text">Cuenta activa</span>
                <Toggle checked={!!f.activo} onChange={v => set('activo', v)} label={f.activo ? 'Activo' : 'Inactivo'} />
              </div>
            )}
          </div>

          {/* ── Acceso: Tareas ───────────────────────────────────────── */}
          <section className="rounded-xl p-4 space-y-3" style={{ background: '#F8F5FB', border: '1.5px solid #E2D9EE' }}>
            <Toggle checked={f.acceso_tareas} onChange={v => set('acceso_tareas', v)} label="Acceso al Sistema de Tareas" />
            {f.acceso_tareas && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className={needsDireccion(f.rol_tareas) ? '' : 'col-span-2'}>
                  <label className="ine-label">Rol en Tareas</label>
                  <select className="ine-input" value={f.rol_tareas} onChange={e => set('rol_tareas', e.target.value)}>
                    {ROLES_TAREAS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                {needsDireccion(f.rol_tareas) && (
                  <div>
                    <label className="ine-label">Dirección de Área / Coordinación</label>
                    <select className="ine-input" value={f.direccion_tareas} onChange={e => set('direccion_tareas', e.target.value)}>
                      {DIRECCIONES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                {needsPuesto(f.rol_tareas) && (
                  <div className="col-span-2">
                    <label className="ine-label">Subdirección</label>
                    {dirSubs.length > 0 ? (
                      <select className="ine-input" value={f.puesto} onChange={e => set('puesto', e.target.value)}>
                        <option value="">— Seleccionar subdirección —</option>
                        {dirSubs.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                      </select>
                    ) : (
                      <input className="ine-input" value={f.puesto} onChange={e => set('puesto', e.target.value)}
                        placeholder="Ej. Subdirector/a de Resoluciones y Análisis" />
                    )}
                    {dirSubs.length === 0 && (
                      <p className="text-xs text-ine-muted mt-1">
                        No hay subdirecciones para esta dirección. Cierra este formulario y ve al <strong>Catálogo de Subdirecciones</strong> al final de la página para agregarlas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Acceso: Diligencias ──────────────────────────────────── */}
          <section className="rounded-xl p-4 space-y-3" style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD' }}>
            <Toggle checked={f.acceso_diligencias} onChange={v => set('acceso_diligencias', v)} label="Acceso al Sistema de Notificaciones" />
            {f.acceso_diligencias && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="ine-label">Rol en Notificaciones</label>
                  <select className="ine-input" value={f.rol_diligencias} onChange={e => {
                    const rol = e.target.value
                    set('rol_diligencias', rol)
                    if (rol === 'coordinador' || rol === 'notificador') {
                      set('area_diligencias', 'Coordinación de Análisis de Información y Control Documental')
                    }
                  }}>
                    {ROLES_DILIGENCIAS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ine-label">Área</label>
                  <select className="ine-input" value={f.area_diligencias} onChange={e => set('area_diligencias', e.target.value)}>
                    <option value="">— Seleccionar área —</option>
                    {AREAS_DILIGENCIAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ── Acceso: Oficios ──────────────────────────────────────── */}
          <section className="rounded-xl p-4 space-y-3" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
            <Toggle checked={f.acceso_oficios} onChange={v => set('acceso_oficios', v)} label="Acceso a SiCoDEAJ" />
            {f.acceso_oficios && (
              <div className="pt-1">
                <label className="ine-label">Rol en SiCoDEAJ</label>
                <select className="ine-input w-1/2" value={f.rol_oficios} onChange={e => set('rol_oficios', e.target.value)}>
                  {ROLES_OFICIOS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #E2D9EE', background: '#F8F5FB' }}>
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-ine" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEdit ? 'Guardar cambios' : 'Crear usuario'}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Subdirecciones management panel ─────────────────────────────────────────

function SubdireccionesPanel({ subdirecciones = [], onRefresh }) {
  const [newDir,     setNewDir]     = useState('')
  const [newNombre,  setNewNombre]  = useState('')
  const [adding,     setAdding]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId,  setEditingId]  = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [savingId,   setSavingId]   = useState(null)
  const [error,      setError]      = useState(null)

  const handleAdd = async () => {
    if (!newDir || !newNombre.trim()) { setError('Selecciona una dirección e ingresa el nombre'); return }
    setAdding(true); setError(null)
    try {
      await createSubdireccion(newDir, newNombre.trim())
      setNewDir(''); setNewNombre('')
      onRefresh()
    } catch { setError('Error al agregar subdirección') }
    finally { setAdding(false) }
  }

  const handleEdit = (s) => { setEditingId(s.id); setEditNombre(s.nombre); setError(null) }
  const handleEditCancel = () => { setEditingId(null); setEditNombre('') }
  const handleEditSave = async (id) => {
    if (!editNombre.trim()) return
    setSavingId(id)
    try { await updateSubdireccion(id, editNombre.trim()); setEditingId(null); onRefresh() }
    catch { setError('Error al guardar') }
    finally { setSavingId(null) }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try { await deleteSubdireccion(id); onRefresh() } catch {}
    setDeletingId(null)
  }

  const grouped = DIRECCIONES.map(d => ({
    ...d,
    subs: subdirecciones.filter(s => s.direccion_key === d.key),
  })).filter(d => d.subs.length > 0)

  return (
    <div className="ine-card overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#F8F5FB', borderBottom: '1px solid #EDE8F4' }}>
        <svg className="w-4 h-4 text-ine-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="text-sm font-bold text-ine-text">Subdirecciones registradas</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Add form */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="ine-label">Dirección</label>
            <select className="ine-input" value={newDir} onChange={e => setNewDir(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {DIRECCIONES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="ine-label">Nombre de la subdirección</label>
            <input className="ine-input" value={newNombre} onChange={e => setNewNombre(e.target.value)}
              placeholder="Ej. Subdirección de Resoluciones y Análisis"
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <button className="btn-ine flex-shrink-0" onClick={handleAdd} disabled={adding}>
            {adding
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </>
            }
          </button>
        </div>

        {error && (
          <p className="text-xs rounded px-3 py-1.5" style={{ background: 'rgba(220,38,38,.07)', color: '#B91C1C' }}>
            {error}
          </p>
        )}

        {/* List */}
        {grouped.length === 0 ? (
          <p className="text-sm text-ine-muted text-center py-4">No hay subdirecciones registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ key, label, color, subs }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs font-bold text-ine-muted uppercase tracking-wide">{label}</span>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #EDE8F4' }}>
                  {subs.map((s, i) => (
                    <div key={s.id}
                      className="flex items-center gap-2 px-4 py-2"
                      style={{ borderBottom: i < subs.length - 1 ? '1px solid #EDE8F4' : undefined }}>
                      {editingId === s.id ? (
                        <>
                          <input
                            className="ine-input flex-1 text-sm py-1"
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEditSave(s.id); if (e.key === 'Escape') handleEditCancel() }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditSave(s.id)}
                            disabled={savingId === s.id}
                            className="p-1 rounded text-white transition-colors flex-shrink-0"
                            style={{ background: '#582E73' }}
                            title="Guardar">
                            {savingId === s.id
                              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            }
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-1 rounded text-ine-dim hover:text-ine-text hover:bg-ine-bg transition-colors flex-shrink-0"
                            title="Cancelar">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-ine-text flex-1">{s.nombre}</span>
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-1 rounded text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors flex-shrink-0"
                            title="Editar">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="p-1 rounded text-ine-dim hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                            title="Eliminar">
                            {deletingId === s.id
                              ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            }
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserManagement({ onBack, me }) {
  const [users,         setUsers]         = useState([])
  const [subdirecciones, setSubdirecciones] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(null)
  const [toggling,      setToggling]      = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(null)

  const loadSubs = useCallback(async () => {
    try {
      const data = await getSubdirecciones()
      if (Array.isArray(data)) setSubdirecciones(data)
    } catch {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await getUsuarios()) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(); loadSubs() }, [load, loadSubs])

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await deleteUsuario(id)
      setUsers(prev => prev.filter(x => x.id !== id))
    } catch {}
    setDeleting(null)
    setConfirmDelete(null)
  }

  const handleToggleActive = async (u) => {
    setToggling(u.id)
    try {
      await updateUsuario(u.id, { activo: !u.activo })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x))
    } catch {}
    setToggling(null)
  }

  const grouped = GROUPS.map(g => ({
    ...g,
    items: g.key === null
      ? users.filter(u => !u.acceso_tareas)
      : users.filter(u => u.acceso_tareas && u.rol_tareas === g.key),
  })).filter(g => g.items.length > 0)

  const isAdmin = me?.rol === 'admin'

  return (
    <div className="min-h-screen bg-ine-bg flex flex-col">
      <header className="bg-white flex items-center px-6 h-14 flex-shrink-0"
        style={{ borderBottom: '1px solid #E2D9EE', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <button onClick={onBack} className="btn-ghost mr-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Portal
        </button>
        <div>
          <p className="text-sm font-bold text-ine-purple leading-none">Gestión de Usuarios</p>
          <p className="text-xs text-ine-muted mt-0.5">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrados en el sistema
          </p>
        </div>
        <div className="flex-1" />
        <button className="btn-ine" onClick={() => setModal('create')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-4 rounded-full animate-spin mb-3"
                style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
              <p className="text-ine-muted text-sm">Cargando usuarios…</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ key, label, color, items }) => (
                <div key={key ?? 'none'}>
                  {/* Group header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <h3 className="text-sm font-bold text-ine-text">{label}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: color + '18', color }}>
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-ine-border" />
                  </div>

                  {/* Group table */}
                  <div className="ine-card overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#F8F5FB', borderBottom: '1px solid #EDE8F4' }}>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide">Nombre</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide">Correo</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide hidden md:table-cell">Dirección de Área</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide hidden sm:table-cell">Notificaciones</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide hidden sm:table-cell">SiCoDEAJ</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide">Estado</th>
                          <th className="px-4 py-2.5 text-right text-xs font-bold text-ine-muted uppercase tracking-wide">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((u, i) => {
                          const dir = dirCfg(u.direccion_tareas)
                          return (
                            <tr key={u.id}
                              style={{ borderBottom: i < items.length - 1 ? '1px solid #EDE8F4' : undefined }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F8F5FB'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}>

                              {/* Nombre */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                    style={{ background: u.activo ? color : '#9CA3AF' }}>
                                    {u.nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-semibold text-ine-text">{u.nombre}</span>
                                      {u.rol === 'admin' && (
                                        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                                          style={{ background: '#EDE8F4', color: '#582E73' }}>ADMIN</span>
                                      )}
                                    </div>
                                    {needsPuesto(u.rol_tareas) && u.puesto && (
                                      <p className="text-xs text-ine-muted leading-tight mt-0.5">{u.puesto}</p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Correo */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-ine-muted">{u.email}</span>
                              </td>

                              {/* Dirección */}
                              <td className="px-4 py-3 hidden md:table-cell">
                                {dir && needsDireccion(u.rol_tareas) ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                    style={{ background: dir.color + '15', color: dir.color }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dir.color }} />
                                    {dir.label}
                                  </span>
                                ) : <span className="text-xs text-ine-dim">—</span>}
                              </td>

                              {/* Diligencias */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {u.acceso_diligencias
                                  ? <AppBadge label={u.rol_diligencias} color="#0369A1" />
                                  : <span className="text-xs text-ine-dim">—</span>}
                              </td>

                              {/* Oficios */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {u.acceso_oficios
                                  ? <AppBadge label={u.rol_oficios} color="#047857" />
                                  : <span className="text-xs text-ine-dim">—</span>}
                              </td>

                              {/* Estado */}
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={u.activo
                                    ? { background: '#D1FAE5', color: '#065F46' }
                                    : { background: '#FEE2E2', color: '#B91C1C' }}>
                                  {u.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>

                              {/* Acciones */}
                              <td className="px-4 py-3 text-right">
                                {confirmDelete === u.id ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-xs text-ine-muted mr-1">¿Eliminar?</span>
                                    <button
                                      onClick={() => handleDelete(u.id)}
                                      disabled={deleting === u.id}
                                      className="px-2 py-1 rounded text-xs font-semibold text-white transition-colors"
                                      style={{ background: '#DC2626' }}>
                                      {deleting === u.id
                                        ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : 'Sí, eliminar'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(null)}
                                      className="px-2 py-1 rounded text-xs font-semibold transition-colors"
                                      style={{ background: '#F3F4F6', color: '#374151' }}>
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => setModal(u)}
                                      className="p-1.5 rounded-lg transition-colors text-ine-dim hover:text-ine-purple hover:bg-ine-bg"
                                      title="Editar">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleToggleActive(u)}
                                      disabled={toggling === u.id}
                                      className="p-1.5 rounded-lg transition-colors"
                                      title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                      style={{ color: u.activo ? '#D97706' : '#059669' }}
                                      onMouseEnter={e => e.currentTarget.style.background = u.activo ? 'rgba(217,119,6,.08)' : 'rgba(5,150,105,.08)'}
                                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                                      {toggling === u.id
                                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        : u.activo
                                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                      }
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(u.id)}
                                      className="p-1.5 rounded-lg transition-colors text-ine-dim hover:text-red-600 hover:bg-red-50"
                                      title="Eliminar usuario">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Subdirecciones management (admin only) ──────────────── */}
          {isAdmin && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#582E73' }} />
                <h3 className="text-sm font-bold text-ine-text">Catálogo de Subdirecciones</h3>
                <div className="flex-1 h-px bg-ine-border" />
              </div>
              <SubdireccionesPanel subdirecciones={subdirecciones} onRefresh={loadSubs} />
            </div>
          )}
        </div>
      </main>

      {modal !== null && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onSaved={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
          subdirecciones={subdirecciones}
        />
      )}
    </div>
  )
}
