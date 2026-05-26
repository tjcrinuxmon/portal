import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_FROM = process.env.EMAIL_FROM || 'SiCoDEAJ <noreply@sicodeaj.org>'

async function sendMail({ to, subject, html }) {
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html })
  if (error) throw new Error(error.message)
}

function header() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#582E73">
      <tr>
        <td style="padding:16px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:-0.5px;">INE &middot; DEAJ</span>
          <span style="color:rgba(255,255,255,0.6);font-size:12px;font-family:Arial,sans-serif;padding-left:10px;">Sistema de Control Documental</span>
        </td>
      </tr>
    </table>`
}

function footer() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #E2D9EE;">
          <p style="margin:0;font-size:11px;color:#aaaaaa;font-family:Arial,sans-serif;">
            Instituto Nacional Electoral &mdash; Direcci&oacute;n Ejecutiva de Asuntos Jur&iacute;dicos
          </p>
        </td>
      </tr>
    </table>`
}

export async function sendResetCode({ nombre, email, code }) {
  const digits = String(code).split('')
  const digitCells = digits.map(d =>
    `<td width="36" height="46" align="center" valign="middle"
        style="width:36px;height:46px;background-color:#F8F5FB;border:1px solid #C4B0DA;font-size:26px;font-weight:bold;font-family:Courier New,monospace;color:#582E73;text-align:center;">
      ${d}
    </td>
    <td width="6" style="width:6px;"></td>`
  ).join('')

  await sendMail({
    to: email,
    subject: 'SiCoDEAJ — Código para restablecer contraseña',
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F4F0F8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F0F8">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background-color:#ffffff;border:1px solid #E2D9EE;">
        <tr><td>${header()}</td></tr>
        <tr>
          <td style="padding:28px 28px 8px 28px;">
            <p style="margin:0 0 8px 0;font-size:16px;font-weight:bold;color:#2A1239;font-family:Arial,sans-serif;">
              Hola, ${nombre}
            </p>
            <p style="margin:0 0 24px 0;font-size:14px;color:#555555;font-family:Arial,sans-serif;line-height:1.6;">
              Recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta en el
              <strong>Portal DEAJ</strong>. Usa el siguiente c&oacute;digo de verificaci&oacute;n:
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 28px 24px 28px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${digitCells}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 28px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF8E7">
              <tr>
                <td style="padding:12px 16px;border-left:3px solid #F59E0B;">
                  <p style="margin:0;font-size:12px;color:#92400E;font-family:Arial,sans-serif;line-height:1.5;">
                    Este c&oacute;digo es v&aacute;lido por <strong>15 minutos</strong>.
                    Si no solicitaste este cambio, ignora este correo.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td>${footer()}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  })
}

export async function sendWelcomeEmail({ nombre, email, resetUrl }) {
  await sendMail({
    to: email,
    subject: 'Bienvenido a SiCoDEAJ — Establece tu contraseña',
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F4F0F8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F0F8">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background-color:#ffffff;border:1px solid #E2D9EE;">
        <tr><td>${header()}</td></tr>
        <tr>
          <td style="padding:28px 28px 20px 28px;">
            <p style="margin:0 0 8px 0;font-size:16px;font-weight:bold;color:#2A1239;font-family:Arial,sans-serif;">
              Hola, ${nombre}
            </p>
            <p style="margin:0 0 24px 0;font-size:14px;color:#555555;font-family:Arial,sans-serif;line-height:1.6;">
              Tu cuenta en el <strong>Sistema de Control Documental DEAJ (SiCoDEAJ)</strong> ha sido creada por un administrador.
              Para activarla y establecer tu contrase&ntilde;a, haz clic en el siguiente bot&oacute;n:
            </p>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#582E73" style="background-color:#582E73;padding:12px 28px;">
                  <a href="${resetUrl}"
                    style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;display:block;">
                    Establecer contrase&ntilde;a
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;font-size:12px;color:#888888;font-family:Arial,sans-serif;line-height:1.5;">
              Si el bot&oacute;n no funciona, copia y pega este enlace en tu navegador:<br>
              <span style="color:#582E73;word-break:break-all;">${resetUrl}</span>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF8E7" style="margin-top:16px;">
              <tr>
                <td style="padding:12px 16px;border-left:3px solid #F59E0B;">
                  <p style="margin:0;font-size:12px;color:#92400E;font-family:Arial,sans-serif;line-height:1.5;">
                    Este enlace es v&aacute;lido por <strong>24 horas</strong>.
                    Si no esperabas esta cuenta, puedes ignorar este correo.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td>${footer()}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  })
}
