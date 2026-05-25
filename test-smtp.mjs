import 'dotenv/config'
import nodemailer from 'nodemailer'

const TO = process.argv[2] || process.env.EMAIL_FROM

console.log('─────────────────────────────────────')
console.log('  Prueba de correo — Portal DEAJ')
console.log('─────────────────────────────────────')
console.log('Host :', process.env.EMAIL_HOST)
console.log('Port :', process.env.EMAIL_PORT)
console.log('User :', process.env.EMAIL_USER)
console.log('Pass :', process.env.EMAIL_PASS ? `${'*'.repeat(process.env.EMAIL_PASS.length)} (${process.env.EMAIL_PASS.length} chars)` : '⚠️  vacía')
console.log('Para :', TO)
console.log('─────────────────────────────────────')

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
})

console.log('\n[1/2] Verificando conexión SMTP...')
try {
  await transporter.verify()
  console.log('✅ Conexión OK')
} catch (err) {
  console.error('❌ Error de conexión:', err.message)
  console.error('   Código    :', err.code)
  console.error('   Respuesta :', err.response)
  process.exit(1)
}

console.log('\n[2/2] Enviando correo de prueba a', TO, '...')
try {
  const info = await transporter.sendMail({
    from: `"Portal DEAJ (prueba)" <${process.env.EMAIL_FROM}>`,
    to: TO,
    subject: '✅ Prueba de correo — Portal DEAJ',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;padding:24px">
        <h2 style="color:#582E73">Prueba exitosa</h2>
        <p>Este correo confirma que el servidor SMTP está configurado correctamente.</p>
        <table style="font-size:13px;border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 8px;font-weight:bold;color:#555">Host</td><td style="padding:4px 8px">${process.env.EMAIL_HOST}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;color:#555">Puerto</td><td style="padding:4px 8px">${process.env.EMAIL_PORT}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;color:#555">Usuario</td><td style="padding:4px 8px">${process.env.EMAIL_USER}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;color:#555">Enviado</td><td style="padding:4px 8px">${new Date().toLocaleString('es-MX')}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
        <p style="color:#aaa;font-size:11px">Instituto Nacional Electoral — DEAJ</p>
      </div>
    `,
  })
  console.log('✅ Correo enviado exitosamente')
  console.log('   Message-ID:', info.messageId)
  console.log('   Respuesta :', info.response)
} catch (err) {
  console.error('❌ Error al enviar:', err.message)
  console.error('   Código    :', err.code)
  console.error('   Respuesta :', err.response)
  process.exit(1)
}

console.log('\n─────────────────────────────────────')
console.log('  Prueba completada')
console.log('─────────────────────────────────────')
