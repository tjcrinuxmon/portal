import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
})

export async function sendWelcomeEmail({ nombre, email, resetUrl }) {
  await transporter.sendMail({
    from: `"Portal DEAJ" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Bienvenido al Portal DEAJ — Establece tu contraseña',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#582E73;padding:16px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-.5px">INE · DEAJ</span>
          <span style="color:rgba(255,255,255,.6);font-size:12px;margin-left:10px">Portal de Sistemas</span>
        </div>
        <div style="border:1.5px solid #E2D9EE;border-top:none;border-radius:0 0 8px 8px;padding:28px 24px">
          <h2 style="color:#2A1239;font-size:17px;margin:0 0 12px">Hola, ${nombre}</h2>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px">
            Tu cuenta en el <strong>Portal de Sistemas DEAJ</strong> ha sido creada por un administrador.
            Para activarla y establecer tu contraseña, haz clic en el siguiente botón:
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#582E73;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-size:14px;font-weight:700">
            Establecer contraseña
          </a>
          <p style="color:#888;font-size:12px;margin:20px 0 0;line-height:1.5">
            Este enlace es válido por <strong>24 horas</strong>. Si no solicitaste esta cuenta, puedes ignorar este correo.
          </p>
          <hr style="border:none;border-top:1px solid #EDE8F4;margin:20px 0" />
          <p style="color:#aaa;font-size:11px;margin:0">Instituto Nacional Electoral — Dirección Ejecutiva de Asuntos Jurídicos</p>
        </div>
      </div>
    `,
  })
}
