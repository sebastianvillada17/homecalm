import { Resend } from "resend";

function withEmailTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout de conexión con servicio de correo excedido")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "HOMECALM <onboarding@resend.dev>";
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  console.log(`[HOMECALM] Solicitud de restablecimiento para: ${to}`);
  console.log(`[HOMECALM] Enlace de recuperación generado: ${resetLink}`);

  if (!apiKey || apiKey.trim() === "") {
    console.warn(
      "[HOMECALM] RESEND_API_KEY no está configurada. El correo no fue enviado por red, pero el enlace está disponible en la consola para pruebas locales."
    );
    return {
      success: true,
      id: "mock-console-id",
    };
  }

  try {
    const resend = new Resend(apiKey.trim());

    const { data, error } = await withEmailTimeout(
      resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: "Recupera tu contraseña en HOMECALM",
        html: `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Recupera tu contraseña</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf8; margin: 0; padding: 40px 20px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2ece5; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
              <tr>
                <td style="padding: 36px 40px; background-color: #174a3f; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">HOMECALM</h1>
                  <p style="color: #cae5d4; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Gestión y armonía para el hogar</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1b2721; font-size: 19px; margin-top: 0; font-weight: 600;">Hola, ${name || "compañero/a de hogar"}:</h2>
                  <p style="color: #55665d; font-size: 14px; line-height: 1.6; margin: 16px 0 24px;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en HOMECALM.
                  </p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px;">
                        <a href="${resetLink}" style="background-color: #174a3f; color: #ffffff; padding: 13px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
                          Restablecer mi contraseña
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #7b8c82; font-size: 12px; line-height: 1.5; margin: 0 0 16px;">
                    Este enlace estará vigente durante <strong>1 hora</strong> por motivos de seguridad. Si no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña seguirá segura.
                  </p>
                  <p style="color: #9aa8a0; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #edf2ee; word-break: break-all;">
                    Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br />
                    <a href="${resetLink}" style="color: #174a3f;">${resetLink}</a>
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    }));

    if (error) {
      console.error("[HOMECALM] Error de envío con Resend:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[HOMECALM] Error llamando API de Resend:", err.message);
    return { success: false, error: "No se pudo enviar el correo de recuperación." };
  }
}

