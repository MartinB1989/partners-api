import { EmailTemplate } from '../../../aws/ses/ses.interface';

export const welcomeTemplate = (userName: string): EmailTemplate => ({
  subject: '¡Bienvenido a nuestra plataforma!',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenido</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50;">¡Bienvenido ${userName}!</h1>
          <p>Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
          <p>Con tu cuenta podrás:</p>
          <ul>
            <li>Publicar productos</li>
            <li>Realizar compras</li>
            <li>Gestionar tu perfil</li>
          </ul>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p style="margin-top: 30px; color: #7f8c8d;">Saludos,<br>El equipo de la plataforma</p>
        </div>
      </body>
    </html>
  `,
  text: `¡Bienvenido ${userName}!\n\nGracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte como parte de nuestra comunidad.\n\nCon tu cuenta podrás:\n- Publicar productos\n- Realizar compras\n- Gestionar tu perfil\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\nSaludos,\nEl equipo de la plataforma`,
});
