import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'portal.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT    NOT NULL,
    email               TEXT    UNIQUE NOT NULL,
    password_hash       TEXT    NOT NULL,
    rol                 TEXT    DEFAULT 'usuario',

    acceso_tareas       INTEGER DEFAULT 0,
    rol_tareas          TEXT    DEFAULT '',
    direccion_tareas    TEXT    DEFAULT '',

    acceso_oficios      INTEGER DEFAULT 0,
    rol_oficios         TEXT    DEFAULT 'usuario',

    acceso_diligencias  INTEGER DEFAULT 0,
    rol_diligencias     TEXT    DEFAULT 'usuario',
    area_diligencias    TEXT    DEFAULT '',

    puesto              TEXT    DEFAULT '',

    activo              INTEGER DEFAULT 1,
    created_at          TEXT    DEFAULT (datetime('now'))
  )
`)

try { db.exec("ALTER TABLE usuarios ADD COLUMN puesto TEXT DEFAULT ''") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN reset_token TEXT") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN reset_token_expires TEXT") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN reset_code TEXT") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN reset_code_expires TEXT") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN primer_acceso INTEGER DEFAULT 0") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN area_oficios TEXT DEFAULT ''") } catch (_) {}

// ── Módulo Relevantes (Seguimiento Diario) ──────────────────────────────────
try { db.exec("ALTER TABLE usuarios ADD COLUMN acceso_relevantes INTEGER DEFAULT 0") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN rol_relevantes TEXT DEFAULT 'usuario'") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN direccion_relevantes TEXT DEFAULT ''") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN subdireccion_relevantes TEXT DEFAULT ''") } catch (_) {}
// Los administradores del portal tienen acceso a todos los módulos (convención del seed).
try { db.exec("UPDATE usuarios SET acceso_relevantes = 1, rol_relevantes = 'admin' WHERE rol = 'admin'") } catch (_) {}

// ── Módulo Criterios (Criterios de Resolución) ──────────────────────────────
try { db.exec("ALTER TABLE usuarios ADD COLUMN acceso_criterios INTEGER DEFAULT 0") } catch (_) {}
// Seguimiento: subdirección de un Subdirector/a, como clave del catálogo de Seguimiento
// (litigio, recursos, convenios, contratos). Solo ve lo de su subdirección.
try { db.exec("ALTER TABLE usuarios ADD COLUMN subdireccion_tareas TEXT DEFAULT ''") } catch (_) {}
{
  // Los que ya tenían la subdirección escrita a mano en "puesto" se pasan a la clave
  const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const clave = (dir, puesto) => {
    const p = sinAcentos(puesto)
    if (dir === 'asuntos_laborales') return p.includes('litigio') ? 'litigio' : p.includes('recurso') ? 'recursos' : ''
    if (dir === 'contratos_convenios') return p.includes('convenio') ? 'convenios' : p.includes('contrato') ? 'contratos' : ''
    return ''
  }
  const upd = db.prepare('UPDATE usuarios SET subdireccion_tareas = ? WHERE id = ?')
  for (const u of db.prepare("SELECT id, direccion_tareas, puesto FROM usuarios WHERE rol_tareas = 'subdirector' AND COALESCE(subdireccion_tareas, '') = ''").all()) {
    const k = clave(u.direccion_tareas, u.puesto)
    if (k) upd.run(k, u.id)
  }
}
try { db.exec("ALTER TABLE usuarios ADD COLUMN rol_criterios TEXT DEFAULT 'usuario'") } catch (_) {}
try { db.exec("ALTER TABLE usuarios ADD COLUMN materia_criterios TEXT DEFAULT ''") } catch (_) {}
try { db.exec("UPDATE usuarios SET acceso_criterios = 1, rol_criterios = 'admin' WHERE rol = 'admin'") } catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS subdirecciones (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    direccion_key TEXT NOT NULL,
    nombre        TEXT NOT NULL,
    activo        INTEGER NOT NULL DEFAULT 1
  )
`)

/* Seed inicial */
const exists = db.prepare('SELECT COUNT(*) as n FROM usuarios').get()
if (exists.n === 0) {
  const rnd = () => crypto.randomBytes(12).toString('base64url')
  const adminPwd = process.env.ADMIN_SEED_PASSWORD || rnd()
  const hash = (p) => bcrypt.hashSync(p, 10)
  const ins = db.prepare(`
    INSERT INTO usuarios
      (nombre, email, password_hash, rol,
       acceso_tareas, rol_tareas, direccion_tareas,
       acceso_oficios, rol_oficios,
       acceso_diligencias, rol_diligencias, area_diligencias)
    VALUES (?,?,?,?, ?,?,?, ?,?, ?,?,?)
  `)
  ins.run('Administrador','admin@ine.mx', hash(adminPwd), 'admin',
          1,'admin','',  1,'admin',  1,'admin','')
  ins.run('Anahí Silva Tosca','anahi.silva@ine.mx', hash(rnd()), 'usuario',
          1,'ejecutiva','',  1,'admin',  1,'admin','')
  ins.run('Usuario Tareas','tareas@ine.mx', hash(rnd()), 'usuario',
          1,'director','asuntos_laborales',  0,'',  0,'','')
  ins.run('Usuario Oficios','oficios@ine.mx', hash(rnd()), 'usuario',
          0,'','',  1,'usuario',  0,'','')
  ins.run('Usuario Diligencias','diligencias@ine.mx', hash(rnd()), 'usuario',
          0,'','',  0,'',  1,'usuario','DAL')
  console.log(`👤 Admin portal creado: admin@ine.mx / ${adminPwd}  ← guarda esta contraseña`)
}

export default db
