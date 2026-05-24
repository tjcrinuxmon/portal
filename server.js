import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ── Tareas DB sync ─────────────────────────────────────────────────────────
   The portal is the source of truth. Any create/update here is mirrored into
   tareas.db so users appear in task assignment dropdowns without needing to
   log in via SSO first.
 ─────────────────────────────────────────────────────────────────────────── */
const tareasDbPath = join(__dirname, '..', 'tareas', 'tareas.db')
let tareasDb = null
try {
  if (existsSync(tareasDbPath)) {
    tareasDb = new Database(tareasDbPath)
    console.log('✅ tareas.db conectado para sincronización')
  }
} catch (e) {
  console.warn('⚠️  No se pudo abrir tareas.db:', e.message)
}

function syncToTareas(u) {
  if (!tareasDb || !u.acceso_tareas) return
  try {
    // Look up by portal_id first (survives email changes), fall back to email for legacy records
    const exists = tareasDb.prepare('SELECT id FROM users WHERE portal_id = ?').get(u.id)
              ?? tareasDb.prepare('SELECT id FROM users WHERE email = ?').get(u.email)
    if (exists) {
      tareasDb.prepare(
        'UPDATE users SET name=?, email=?, username=?, role=?, direccion=?, puesto=?, portal_id=? WHERE id=?'
      ).run(u.nombre, u.email, u.email, u.rol_tareas || 'director',
            u.direccion_tareas || null, u.puesto || null, u.id, exists.id)
    } else {
      tareasDb.prepare(
        'INSERT INTO users (username, email, name, password_hash, role, direccion, puesto, portal_id) VALUES (?,?,?,?,?,?,?,?)'
      ).run(u.email, u.email, u.nombre, u.password_hash || 'sso_user',
            u.rol_tareas || 'director', u.direccion_tareas || null, u.puesto || null, u.id)
    }
  } catch (e) {
    console.error('Error sincronizando a tareas:', e.message)
  }
}

// Add portal_id column to tareas.users if it doesn't exist yet
if (tareasDb) {
  try { tareasDb.exec('ALTER TABLE users ADD COLUMN portal_id INTEGER') } catch (_) {}
}

// On startup: sync every portal user that has tareas access, fixing any gap
if (tareasDb) {
  const all = db.prepare('SELECT * FROM usuarios WHERE acceso_tareas = 1').all()
  all.forEach(u => syncToTareas(u))
  console.log(`✅ ${all.length} usuarios de tareas sincronizados al arranque`)
}

const app  = express()
const PORT = process.env.PORT || 3004

const PORTAL_SECRET  = process.env.PORTAL_SECRET  || 'ine_portal_jwt_secret_2026'
const TAREAS_SECRET  = process.env.TAREAS_SECRET   || 'ine_portal_sso_tareas_2026'
const OFICIOS_SECRET = process.env.OFICIOS_SECRET  || 'ine_portal_sso_oficios_2026'
const DILIG_SECRET   = process.env.DILIG_SECRET    || 'ine_portal_sso_dilig_2026'

/* App URLs — todos pasan por el gateway */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const APP_URLS = {
  tareas:      process.env.URL_TAREAS      || `${BASE_URL}/tareas/`,
  oficios:     process.env.URL_OFICIOS     || `${BASE_URL}/oficios`,
  diligencias: process.env.URL_DILIGENCIAS || `${BASE_URL}/diligencias`,
}

app.use(cors())
app.use(express.json())

/* ── Auth middleware ────────────────────────────────────────────────────── */
function auth(req, res, next) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autenticado' })
  try {
    req.user = jwt.verify(h.slice(7), PORTAL_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}
function adminOnly(req, res, next) {
  if (req.user?.rol !== 'admin') return res.status(403).json({ error: 'Sin permiso' })
  next()
}

/* ── POST /api/auth/login ───────────────────────────────────────────────── */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' })

  const u = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email.trim().toLowerCase())
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'Credenciales incorrectas' })

  const token = jwt.sign(
    { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, puesto: u.puesto || '',
      acceso_tareas: !!u.acceso_tareas, rol_tareas: u.rol_tareas, direccion_tareas: u.direccion_tareas,
      acceso_oficios: !!u.acceso_oficios, rol_oficios: u.rol_oficios,
      acceso_diligencias: !!u.acceso_diligencias, rol_diligencias: u.rol_diligencias, area_diligencias: u.area_diligencias,
    },
    PORTAL_SECRET, { expiresIn: '8h' }
  )
  res.json({ token, user: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, puesto: u.puesto || '',
    acceso_tareas: !!u.acceso_tareas, rol_tareas: u.rol_tareas, direccion_tareas: u.direccion_tareas,
    acceso_oficios: !!u.acceso_oficios, rol_oficios: u.rol_oficios,
    acceso_diligencias: !!u.acceso_diligencias, rol_diligencias: u.rol_diligencias, area_diligencias: u.area_diligencias,
  }})
})

/* ── GET /api/auth/me ───────────────────────────────────────────────────── */
app.get('/api/auth/me', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id)
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, puesto: u.puesto || '',
    acceso_tareas: !!u.acceso_tareas, rol_tareas: u.rol_tareas, direccion_tareas: u.direccion_tareas,
    acceso_oficios: !!u.acceso_oficios, rol_oficios: u.rol_oficios,
    acceso_diligencias: !!u.acceso_diligencias, rol_diligencias: u.rol_diligencias, area_diligencias: u.area_diligencias,
  })
})

/* ── GET /api/sso/:app ─────────────────────────────────────────────────── */
app.get('/api/sso/:app', auth, (req, res) => {
  const { app: appName } = req.params
  const u = req.user

  const appConfig = {
    tareas: {
      secret: TAREAS_SECRET,
      check: () => u.acceso_tareas,
      payload: () => ({ email: u.email, name: u.nombre, role: u.rol_tareas, direccion: u.direccion_tareas, puesto: u.puesto || '' }),
    },
    oficios: {
      secret: OFICIOS_SECRET,
      check: () => u.acceso_oficios,
      payload: () => ({ email: u.email, nombre: u.nombre, rol: u.rol_oficios }),
    },
    diligencias: {
      secret: DILIG_SECRET,
      check: () => u.acceso_diligencias,
      payload: () => ({ email: u.email, nombre: u.nombre, rol: u.rol_diligencias, area: u.area_diligencias }),
    },
  }

  const cfg = appConfig[appName]
  if (!cfg) return res.status(404).json({ error: 'App desconocida' })
  if (!cfg.check()) return res.status(403).json({ error: 'Sin acceso a esta aplicación' })

  const ssoToken = jwt.sign({ ...cfg.payload(), sso: true }, cfg.secret, { expiresIn: '3m' })
  res.json({ token: ssoToken, url: APP_URLS[appName] })
})

/* ── Usuarios (admin) ───────────────────────────────────────────────────── */
app.get('/api/usuarios', auth, adminOnly, (_req, res) => {
  const rows = db.prepare(
    'SELECT id,nombre,email,rol,puesto,acceso_tareas,rol_tareas,direccion_tareas,acceso_oficios,rol_oficios,acceso_diligencias,rol_diligencias,area_diligencias,activo,created_at FROM usuarios ORDER BY nombre'
  ).all()
  res.json(rows.map(u => ({ ...u, acceso_tareas: !!u.acceso_tareas, acceso_oficios: !!u.acceso_oficios, acceso_diligencias: !!u.acceso_diligencias, activo: !!u.activo })))
})

app.post('/api/usuarios', auth, adminOnly, (req, res) => {
  const { nombre, email, password, rol = 'usuario', puesto = '',
    acceso_tareas = false, rol_tareas = '', direccion_tareas = '',
    acceso_oficios = false, rol_oficios = 'usuario',
    acceso_diligencias = false, rol_diligencias = 'usuario', area_diligencias = '' } = req.body
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' })
  try {
    const hash = bcrypt.hashSync(password, 10)
    const r = db.prepare(`
      INSERT INTO usuarios (nombre,email,password_hash,rol,puesto,
        acceso_tareas,rol_tareas,direccion_tareas,
        acceso_oficios,rol_oficios,
        acceso_diligencias,rol_diligencias,area_diligencias)
      VALUES (?,?,?,?,?, ?,?,?, ?,?, ?,?,?)
    `).run(nombre, email.toLowerCase(), hash, rol, puesto,
           acceso_tareas ? 1 : 0, rol_tareas, direccion_tareas,
           acceso_oficios ? 1 : 0, rol_oficios,
           acceso_diligencias ? 1 : 0, rol_diligencias, area_diligencias)
    const created = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(r.lastInsertRowid)
    syncToTareas(created)
    res.json({ id: r.lastInsertRowid })
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El correo ya existe' })
    res.status(500).json({ error: 'Error al crear usuario' })
  }
})

app.put('/api/usuarios/:id', auth, adminOnly, (req, res) => {
  const { nombre, email, password, rol, puesto,
    acceso_tareas, rol_tareas, direccion_tareas,
    acceso_oficios, rol_oficios,
    acceso_diligencias, rol_diligencias, area_diligencias, activo } = req.body
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
  const hash = password ? bcrypt.hashSync(password, 10) : u.password_hash
  db.prepare(`
    UPDATE usuarios SET nombre=?,email=?,password_hash=?,rol=?,puesto=?,
      acceso_tareas=?,rol_tareas=?,direccion_tareas=?,
      acceso_oficios=?,rol_oficios=?,
      acceso_diligencias=?,rol_diligencias=?,area_diligencias=?,activo=?
    WHERE id=?
  `).run(nombre ?? u.nombre, (email ?? u.email).toLowerCase(), hash, rol ?? u.rol, puesto ?? u.puesto ?? '',
         acceso_tareas != null ? (acceso_tareas ? 1 : 0) : u.acceso_tareas,
         rol_tareas ?? u.rol_tareas, direccion_tareas ?? u.direccion_tareas,
         acceso_oficios != null ? (acceso_oficios ? 1 : 0) : u.acceso_oficios,
         rol_oficios ?? u.rol_oficios,
         acceso_diligencias != null ? (acceso_diligencias ? 1 : 0) : u.acceso_diligencias,
         rol_diligencias ?? u.rol_diligencias, area_diligencias ?? u.area_diligencias,
         activo != null ? (activo ? 1 : 0) : u.activo,
         req.params.id)
  const updated = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)
  syncToTareas(updated)
  res.json({ ok: true })
})

app.delete('/api/usuarios/:id', auth, adminOnly, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ── Servir frontend en producción ──────────────────────────────────────── */
const dist = join(__dirname, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`Portal API → http://localhost:${PORT}`))
