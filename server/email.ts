import nodemailer from 'nodemailer';

interface AppointmentEmailData {
  type: 'appointment';
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  treatmentName: string;
  dentistName?: string;
  preferredDate?: string;
  notes?: string;
}

interface ContactEmailData {
  type: 'contact';
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  message?: string;
}

type EmailNotificationData = AppointmentEmailData | ContactEmailData;

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  clinicName: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
  const to = process.env.NOTIFICATION_EMAIL || from;
  const clinicName = process.env.CLINIC_NAME || 'Odonto Ramalho';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  if (!host || !user || !pass || !from) {
    return null;
  }
  
  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to: to || from,
    clinicName
  };
}

function sanitizeInput(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

function buildClinicAppointmentEmail(data: AppointmentEmailData, clinicName: string): { subject: string; html: string; text: string } {
  const formattedDate = data.preferredDate 
    ? new Date(data.preferredDate).toLocaleDateString('pt-BR')
    : 'Não especificada';

  const subject = `Nova Solicitação de Agendamento - ${sanitizeInput(data.patientName)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-row { display: flex; border-bottom: 1px solid #eee; padding: 15px 0; }
        .info-label { font-weight: 600; color: #374151; width: 150px; flex-shrink: 0; }
        .info-value { color: #6b7280; }
        .notes-section { margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 6px; }
        .notes-section h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; }
        .notes-section p { margin: 0; color: #6b7280; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nova Solicitação de Agendamento</h1>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="info-label">Paciente:</span>
            <span class="info-value">${sanitizeInput(data.patientName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${sanitizeInput(data.patientPhone)}</span>
          </div>
          ${data.patientEmail ? `
          <div class="info-row">
            <span class="info-label">E-mail:</span>
            <span class="info-value">${sanitizeInput(data.patientEmail)}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Tratamento:</span>
            <span class="info-value">${sanitizeInput(data.treatmentName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Agendamento:</span>
            <span class="info-value">${sanitizeInput(data.dentistName) || 'Com a Clínica'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data Preferida:</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          ${data.notes ? `
          <div class="notes-section">
            <h3>Observações:</h3>
            <p>${sanitizeInput(data.notes)}</p>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>Esta é uma notificação automática do sistema ${clinicName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nova Solicitação de Agendamento - ${clinicName}

Paciente: ${sanitizeInput(data.patientName)}
Telefone: ${sanitizeInput(data.patientPhone)}
${data.patientEmail ? `E-mail: ${sanitizeInput(data.patientEmail)}` : ''}
Tratamento: ${sanitizeInput(data.treatmentName)}
Agendamento: ${sanitizeInput(data.dentistName) || 'Com a Clínica'}
Data Preferida: ${formattedDate}
${data.notes ? `\nObservações: ${sanitizeInput(data.notes)}` : ''}
  `.trim();

  return { subject, html, text };
}

function buildClinicContactEmail(data: ContactEmailData, clinicName: string): { subject: string; html: string; text: string } {
  const subject = `Nova Mensagem de Contato - ${sanitizeInput(data.patientName)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2E86AB 0%, #1a5276 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-row { display: flex; border-bottom: 1px solid #eee; padding: 15px 0; }
        .info-label { font-weight: 600; color: #374151; width: 150px; flex-shrink: 0; }
        .info-value { color: #6b7280; }
        .message-section { margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 6px; }
        .message-section h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; }
        .message-section p { margin: 0; color: #6b7280; white-space: pre-wrap; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nova Mensagem de Contato</h1>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value">${sanitizeInput(data.patientName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${sanitizeInput(data.patientPhone)}</span>
          </div>
          ${data.patientEmail ? `
          <div class="info-row">
            <span class="info-label">E-mail:</span>
            <span class="info-value">${sanitizeInput(data.patientEmail)}</span>
          </div>
          ` : ''}
          ${data.message ? `
          <div class="message-section">
            <h3>Mensagem:</h3>
            <p>${sanitizeInput(data.message)}</p>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>Esta é uma notificação automática do sistema ${clinicName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nova Mensagem de Contato - ${clinicName}

Nome: ${sanitizeInput(data.patientName)}
Telefone: ${sanitizeInput(data.patientPhone)}
${data.patientEmail ? `E-mail: ${sanitizeInput(data.patientEmail)}` : ''}
${data.message ? `\nMensagem:\n${sanitizeInput(data.message)}` : ''}
  `.trim();

  return { subject, html, text };
}

function buildClientConfirmationEmail(data: EmailNotificationData, clinicName: string): { subject: string; html: string; text: string } {
  const isAppointment = data.type === 'appointment';
  const subject = isAppointment 
    ? `${clinicName} - Recebemos sua solicitação de agendamento`
    : `${clinicName} - Recebemos sua mensagem`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2E86AB 0%, #1a5276 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; color: #374151; margin-bottom: 20px; }
        .message { color: #6b7280; line-height: 1.6; margin-bottom: 20px; }
        .highlight { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
        .highlight p { margin: 0; color: #166534; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${clinicName}</h1>
        </div>
        <div class="content">
          <p class="greeting">Olá, ${sanitizeInput(data.patientName)}!</p>
          <p class="message">
            ${isAppointment 
              ? 'Recebemos sua solicitação de agendamento com sucesso. Nossa equipe está analisando sua solicitação e entraremos em contato em breve para confirmar a data e horário do seu atendimento.'
              : 'Recebemos sua mensagem com sucesso. Nossa equipe está analisando e entraremos em contato em breve para atendê-lo(a).'
            }
          </p>
          <div class="highlight">
            <p>Em breve um de nossos atendentes entrará em contato com você!</p>
          </div>
          <p class="message">
            Agradecemos pela preferência e confiança em nosso trabalho.
          </p>
        </div>
        <div class="footer">
          <p>Atenciosamente,</p>
          <p><strong>${clinicName}</strong></p>
          <p style="margin-top: 15px; font-size: 11px;">Este é um e-mail automático. Por favor, não responda a esta mensagem.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Olá, ${sanitizeInput(data.patientName)}!

${isAppointment 
  ? 'Recebemos sua solicitação de agendamento com sucesso. Nossa equipe está analisando sua solicitação e entraremos em contato em breve para confirmar a data e horário do seu atendimento.'
  : 'Recebemos sua mensagem com sucesso. Nossa equipe está analisando e entraremos em contato em breve para atendê-lo(a).'
}

Em breve um de nossos atendentes entrará em contato com você!

Agradecemos pela preferência e confiança em nosso trabalho.

Atenciosamente,
${clinicName}

Este é um e-mail automático. Por favor, não responda a esta mensagem.
  `.trim();

  return { subject, html, text };
}

export async function sendEmailNotification(
  data: EmailNotificationData
): Promise<{ success: boolean; message: string }> {
  const config = getEmailConfig();
  
  if (!config) {
    console.log("Email credentials not configured. Notification data:");
    console.log("Type:", data.type);
    console.log("Name:", data.patientName);
    console.log("Phone:", data.patientPhone);
    if (data.type === 'appointment') {
      console.log("Treatment:", data.treatmentName);
      console.log("Dentist:", data.dentistName || "Clínica");
      console.log("Preferred Date:", data.preferredDate || "Não especificada");
      console.log("Notes:", data.notes || "Nenhuma");
    } else {
      console.log("Message:", data.message || "Nenhuma");
    }
    return { success: true, message: "Email credentials not configured - logged to console" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const clinicEmailContent = data.type === 'appointment' 
      ? buildClinicAppointmentEmail(data, config.clinicName)
      : buildClinicContactEmail(data, config.clinicName);

    await transporter.sendMail({
      from: `"${config.clinicName}" <${config.from}>`,
      to: config.to,
      subject: clinicEmailContent.subject,
      text: clinicEmailContent.text,
      html: clinicEmailContent.html,
    });

    console.log(`Clinic notification email sent successfully for: ${data.patientName}`);

    if (data.patientEmail) {
      const clientEmailContent = buildClientConfirmationEmail(data, config.clinicName);

      await transporter.sendMail({
        from: `"${config.clinicName}" <${config.from}>`,
        to: data.patientEmail,
        subject: clientEmailContent.subject,
        text: clientEmailContent.text,
        html: clientEmailContent.html,
      });

      console.log(`Client confirmation email sent to: ${data.patientEmail}`);
    }

    return { success: true, message: "Email sent successfully" };
  } catch (error: any) {
    console.error("Error sending email notification:", error);
    return { success: false, message: error.message || "Failed to send email" };
  }
}
