import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
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

    activo              INTEGER DEFAULT 1,
    created_at          TEXT    DEFAULT (datetime('now'))
  )
`)

/* Seed inicial */
const exists = db.prepare('SELECT COUNT(*) as n FROM usuarios').get()
if (exists.n === 0) {
  const hash = (p) => bcrypt.hashSync(p, 10)
  const ins = db.prepare(`
    INSERT INTO usuarios
      (nombre, email, password_hash, rol,
       acceso_tareas, rol_tareas, direccion_tareas,
       acceso_oficios, rol_oficios,
       acceso_diligencias, rol_diligencias, area_diligencias)
    VALUES (?,?,?,?, ?,?,?, ?,?, ?,?,?)
  `)
  ins.run('Administrador','admin@ine.mx', hash('Admin1234!'), 'admin',
          1,'admin','',  1,'admin',  1,'admin','')
  ins.run('Anahí Silva Tosca','anahi.silva@ine.mx', hash('Ejecutiva1234!'), 'usuario',
          1,'ejecutiva','',  1,'admin',  1,'admin','')
  ins.run('Usuario Tareas','tareas@ine.mx', hash('Usuario1234!'), 'usuario',
          1,'director','asuntos_laborales',  0,'',  0,'','')
  ins.run('Usuario Oficios','oficios@ine.mx', hash('Usuario1234!'), 'usuario',
          0,'','',  1,'usuario',  0,'','')
  ins.run('Usuario Diligencias','diligencias@ine.mx', hash('Usuario1234!'), 'usuario',
          0,'','',  0,'',  1,'usuario','DAL')
}

export default db
