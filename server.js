import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, appendFileSync } from 'fs'
import db from './db.js'
import { sendWelcomeEmail, sendResetCode } from './mailer.js'

const LOG_FILE = join(dirname(fileURLToPath(import.meta.url)), 'portal.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  appendFileSync(LOG_FILE, line)
}

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

/* ── Diligencias DB sync ────────────────────────────────────────────────────
   Mirror portal user changes into diligencias.sqlite immediately on save.
 ─────────────────────────────────────────────────────────────────────────── */
const diligenciasDbPath = join(__dirname, '..', 'diligencias', 'diligencias.sqlite')
let diligenciasDb = null
try {
  if (existsSync(diligenciasDbPath)) {
    diligenciasDb = new Database(diligenciasDbPath)
    console.log('✅ diligencias.db conectado para sincronización')
  }
} catch (e) {
  console.warn('⚠️  No se pudo abrir diligencias.sqlite:', e.message)
}

function syncToDiligencias(u) {
  if (!diligenciasDb) return
  try {
    const activo = u.acceso_diligencias ? 1 : 0
    const rol    = u.rol_diligencias || 'usuario'
    const area   = u.area_diligencias || ''
    const exists = diligenciasDb.prepare('SELECT id FROM usuarios WHERE email = ?').get(u.email)
    if (exists) {
      diligenciasDb.prepare(
        'UPDATE usuarios SET nombre=?, rol=?, area=?, activo=? WHERE email=?'
      ).run(u.nombre, rol, area, activo, u.email)
    } else if (u.acceso_diligencias) {
      const hash = u.password_hash || 'sso_placeholder'
      diligenciasDb.prepare(
        'INSERT INTO usuarios (nombre, email, password, rol, area, activo) VALUES (?,?,?,?,?,?)'
      ).run(u.nombre, u.email, hash, rol, area, 1)
    }
  } catch (e) {
    console.error('Error sincronizando a diligencias:', e.message)
  }
}

// On startup: sync every portal user that has diligencias access
if (diligenciasDb) {
  const all = db.prepare('SELECT * FROM usuarios WHERE acceso_diligencias = 1').all()
  all.forEach(u => syncToDiligencias(u))
  console.log(`✅ ${all.length} usuarios de diligencias sincronizados al arranque`)
}

const app  = express()
const PORT = process.env.PORT || 3004

const PORTAL_SECRET  = process.env.PORTAL_SECRET
const TAREAS_SECRET  = process.env.TAREAS_SECRET
const OFICIOS_SECRET = process.env.OFICIOS_SECRET
const DILIG_SECRET   = process.env.DILIG_SECRET

if (!PORTAL_SECRET || !TAREAS_SECRET || !OFICIOS_SECRET || !DILIG_SECRET) {
  console.error('FATAL: Faltan variables de entorno de seguridad (PORTAL_SECRET, TAREAS_SECRET, OFICIOS_SECRET, DILIG_SECRET)')
  process.exit(1)
}

/* App URLs — todos pasan por el gateway */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const APP_URLS = {
  tareas:      process.env.URL_TAREAS      || `${BASE_URL}/tareas/`,
  tareas2:     process.env.URL_TAREAS2     || `${BASE_URL}/tareas2/`,
  oficios:     process.env.URL_OFICIOS     || `${BASE_URL}/oficios`,
  diligencias: process.env.URL_DILIGENCIAS || `${BASE_URL}/diligencias`,
}

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
})

/* ── POST /api/auth/login ───────────────────────────────────────────────── */
app.post('/api/auth/login', loginLimiter, (req, res) => {
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
    tareas2: {
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

app.post('/api/usuarios', auth, adminOnly, async (req, res) => {
  const { nombre, email, rol = 'usuario', puesto = '',
    acceso_tareas = false, rol_tareas = '', direccion_tareas = '',
    acceso_oficios = false, rol_oficios = 'usuario',
    acceso_diligencias = false, rol_diligencias = 'usuario', area_diligencias = '' } = req.body
  if (!nombre || !email) return res.status(400).json({ error: 'Faltan campos obligatorios' })
  try {
    const tmpPassword = crypto.randomBytes(12).toString('base64url')
    const hash = bcrypt.hashSync(tmpPassword, 10)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const r = db.prepare(`
      INSERT INTO usuarios (nombre,email,password_hash,rol,puesto,
        acceso_tareas,rol_tareas,direccion_tareas,
        acceso_oficios,rol_oficios,
        acceso_diligencias,rol_diligencias,area_diligencias,
        reset_token,reset_token_expires)
      VALUES (?,?,?,?,?, ?,?,?, ?,?, ?,?,?, ?,?)
    `).run(nombre, email.toLowerCase(), hash, rol, puesto,
           acceso_tareas ? 1 : 0, rol_tareas, direccion_tareas,
           acceso_oficios ? 1 : 0, rol_oficios,
           acceso_diligencias ? 1 : 0, rol_diligencias, area_diligencias,
           resetToken, expires)
    const created = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(r.lastInsertRowid)
    syncToTareas(created)
    syncToDiligencias(created)
    const resetUrl = `${BASE_URL}?token=${resetToken}`
    try {
      await sendWelcomeEmail({ nombre, email: email.toLowerCase() })
      log(`MAIL OK → bienvenida enviada a ${email}`)
    } catch (mailErr) {
      log(`MAIL ERROR → ${email} | ${mailErr.message} | código: ${mailErr.code || 'n/a'} | respuesta: ${mailErr.response || 'n/a'}`)
    }
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
  syncToDiligencias(updated)
  res.json({ ok: true })
})

/* ── Subdirecciones ─────────────────────────────────────────────────────── */
app.get('/api/subdirecciones', auth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM subdirecciones WHERE activo = 1 ORDER BY direccion_key, nombre').all())
})
app.post('/api/subdirecciones', auth, adminOnly, (req, res) => {
  const { direccion_key, nombre } = req.body
  if (!direccion_key || !nombre?.trim()) return res.status(400).json({ error: 'Faltan campos' })
  try {
    const r = db.prepare('INSERT INTO subdirecciones (direccion_key, nombre) VALUES (?, ?)').run(direccion_key, nombre.trim())
    res.json({ id: r.lastInsertRowid })
  } catch { res.status(500).json({ error: 'Error al crear' }) }
})
app.put('/api/subdirecciones/:id', auth, adminOnly, (req, res) => {
  const { nombre } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'Falta el nombre' })
  db.prepare('UPDATE subdirecciones SET nombre = ? WHERE id = ?').run(nombre.trim(), req.params.id)
  res.json({ ok: true })
})
app.delete('/api/subdirecciones/:id', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE subdirecciones SET activo = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.delete('/api/usuarios/:id', auth, adminOnly, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ── Recuperación de contraseña (forgot password) ───────────────────────── */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Ingresa tu correo' })
  const u = db.prepare('SELECT id, nombre, email, activo FROM usuarios WHERE email = ?').get(email.trim().toLowerCase())
  // Respuesta genérica para no revelar si el correo existe
  if (!u || !u.activo) return res.json({ ok: true })
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  db.prepare('UPDATE usuarios SET reset_code = ?, reset_code_expires = ? WHERE id = ?').run(code, expires, u.id)
  try {
    await sendResetCode({ nombre: u.nombre, email: u.email, code })
    log(`RESET CODE OK → código enviado a ${u.email}`)
  } catch (e) {
    log(`RESET CODE ERROR → ${u.email} | ${e.message}`)
  }
  res.json({ ok: true })
})

app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body
  log(`VERIFY CODE → email=${email} code=${code}`)
  if (!email || !code) return res.status(400).json({ error: 'Faltan datos' })
  const u = db.prepare('SELECT id, reset_code, reset_code_expires FROM usuarios WHERE email = ?').get(email.trim().toLowerCase())
  if (!u || u.reset_code !== String(code)) {
    log(`VERIFY CODE FAIL → código incorrecto o usuario no encontrado`)
    return res.status(400).json({ error: 'Código incorrecto' })
  }
  if (new Date(u.reset_code_expires) < new Date()) {
    log(`VERIFY CODE FAIL → código expirado`)
    return res.status(400).json({ error: 'El código ha expirado' })
  }
  const resetTok = crypto.randomBytes(32).toString('hex')
  const tokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  db.prepare('UPDATE usuarios SET reset_token = ?, reset_token_expires = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?').run(resetTok, tokenExpires, u.id)
  log(`VERIFY CODE OK → reset_token generado para ${email}`)
  res.json({ token: resetTok })
})

/* ── Reset de contraseña ────────────────────────────────────────────────── */
app.get('/api/auth/reset-password/:token', (req, res) => {
  const u = db.prepare('SELECT id, nombre, email, reset_token_expires FROM usuarios WHERE reset_token = ?').get(req.params.token)
  if (!u) return res.status(400).json({ error: 'Enlace inválido o expirado' })
  if (new Date(u.reset_token_expires) < new Date()) return res.status(400).json({ error: 'El enlace ha expirado' })
  res.json({ nombre: u.nombre, email: u.email })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body
  log(`RESET PASSWORD → token=${token ? token.slice(0,8) + '...' : 'VACÍO'} pass_len=${password?.length}`)
  if (!token || !password) return res.status(400).json({ error: 'Faltan datos' })
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
  const u = db.prepare('SELECT id, reset_token_expires FROM usuarios WHERE reset_token = ?').get(token)
  if (!u) { log(`RESET PASSWORD FAIL → token no encontrado en DB`); return res.status(400).json({ error: 'Enlace inválido o expirado' }) }
  if (new Date(u.reset_token_expires) < new Date()) { log(`RESET PASSWORD FAIL → token expirado`); return res.status(400).json({ error: 'El enlace ha expirado' }) }
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, u.id)
  log(`RESET PASSWORD OK → usuario id=${u.id} contraseña actualizada`)
  res.json({ ok: true })
})

/* ── Servir frontend en producción ──────────────────────────────────────── */
const dist = join(__dirname, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`Portal API → http://localhost:${PORT}`))
