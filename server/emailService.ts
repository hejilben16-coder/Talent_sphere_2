import nodemailer from 'nodemailer';
import { dbStore } from './db.js';

interface SendCredentialsOptions {
  toEmail: string;
  userName: string;
  userRole: string;
  rawPassword?: string;
  loginUrl?: string;
}

export async function sendCredentialsEmail(
  options: SendCredentialsOptions
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  const { toEmail, userName, userRole, rawPassword, loginUrl } = options;
  const appUrl = loginUrl || process.env.APP_URL || 'https://talentsphere.ai';

  try {
    const settings = dbStore.getSettings();
    const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
    const smtpPort = settings.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const smtpUser = settings.smtpUser || process.env.SMTP_USER;
    const smtpPass = settings.smtpPass || process.env.SMTP_PASS;
    const smtpFrom = settings.smtpFrom || process.env.SMTP_FROM || '"Talent Sphere AI" <no-reply@talentsphere.ai>';

    let transporter: nodemailer.Transporter;
    let isEthereal = false;

    if (smtpHost && smtpUser) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass || ''
        }
      });
    } else {
      // Create Ethereal test account automatically if no custom SMTP credentials are set
      isEthereal = true;
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 22px; font-weight: 800; color: #4f46e5; text-decoration: none; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 8px; }
          .card { background: #f1f5f9; border-radius: 12px; padding: 20px; border: 1px solid #cbd5e1; margin: 20px 0; }
          .cred-row { font-size: 14px; margin: 8px 0; }
          .label { font-weight: 700; color: #475569; display: inline-block; width: 120px; }
          .val { font-family: monospace; font-weight: 700; color: #4f46e5; background: #e0e7ff; padding: 2px 8px; border-radius: 6px; }
          .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin-top: 16px; font-size: 14px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">⚡ Talent Sphere AI</div>
            <div class="title">Welcome, ${userName}!</div>
          </div>
          <p>An account has been created for you on <strong>Talent Sphere AI Platform</strong> with <strong>${userRole.toUpperCase()}</strong> access permissions.</p>

          <div class="card">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">🔐 Your Login Credentials</div>
            <div class="cred-row"><span class="label">User Name:</span> <strong>${userName}</strong></div>
            <div class="cred-row"><span class="label">Email Address:</span> <span class="val">${toEmail}</span></div>
            <div class="cred-row"><span class="label">Role Assignment:</span> <span class="val" style="background: #e0e7ff; color: #4338ca;">${userRole.toUpperCase()}</span></div>
            <div class="cred-row"><span class="label">Password:</span> <span class="val" style="background: #fef3c7; color: #b45309;">${rawPassword || 'Password set by Administrator'}</span></div>
          </div>

          <p>Please log in to access your weekly study plans, RAG materials, AI voice interview modules, and assessments.</p>

          <div style="text-align: center;">
            <a href="${appUrl}" class="btn">Sign In to Talent Sphere AI</a>
          </div>

          <div class="footer">
            Sent by Talent Sphere AI Platform • If you did not request this, please contact your administrator.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `🎉 Account Credentials Created - Talent Sphere AI (${userRole.toUpperCase()})`,
      html: htmlContent
    });

    const rawPreview = isEthereal ? nodemailer.getTestMessageUrl(info) : undefined;
    const previewUrl = typeof rawPreview === 'string' ? rawPreview : undefined;

    console.log(`[Email Dispatch] Email sent to ${toEmail}. MessageId: ${info.messageId}`);

    return {
      success: true,
      message: isEthereal
        ? `Sent via Sandboxed Email. Configure custom SMTP Server in Settings for direct inbox delivery.`
        : `Email delivered directly to ${toEmail} via configured SMTP server (${smtpHost}).`,
      previewUrl
    };
  } catch (err: any) {
    console.error('[Email Dispatch Error]', err);
    return {
      success: false,
      message: `Failed to dispatch email: ${err.message || 'Unknown transport error'}`
    };
  }
}
