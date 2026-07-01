import nodemailer from 'nodemailer';
import { env } from '../config/env';

function makeTransport() {
  if (!env.emailConfigured) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

const transport = makeTransport();

export async function sendCollaboratorInvite(opts: {
  toEmail: string;
  toName: string;
  projectName: string;
  invitedByName: string;
  projectUrl: string;
}): Promise<void> {
  if (!transport) {
    console.log(`[email] SMTP not configured — skipping invite to ${opts.toEmail}`);
    return;
  }

  const { toEmail, toName, projectName, invitedByName, projectUrl } = opts;

  await transport.sendMail({
    from: `"ADGVC" <${env.smtp.user}>`,
    to: toEmail,
    subject: `You've been added to "${projectName}" on ADGVC`,
    text: [
      `Hi ${toName},`,
      ``,
      `${invitedByName} has added you as an editor on the project "${projectName}" on ADGVC.`,
      ``,
      `Log in to view and contribute to the documentation:`,
      `${projectUrl}`,
      ``,
      `— The ADGVC team`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e">
        <h2 style="margin-bottom:4px">You've been added as a collaborator</h2>
        <p style="color:#555;margin-top:0">on <strong>${projectName}</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>
          <strong>${invitedByName}</strong> has added you as an <strong>editor</strong>
          on the project <strong>"${projectName}"</strong> in ADGVC.
        </p>
        <p>You can now view, edit, and version the documentation for this project.</p>
        <a href="${projectUrl}"
           style="display:inline-block;margin-top:8px;padding:10px 22px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Open project →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          ADGVC – Documentation that keeps up with your code.
        </p>
      </div>
    `,
  });

  console.log(`[email] Collaborator invite sent to ${toEmail}`);
}
