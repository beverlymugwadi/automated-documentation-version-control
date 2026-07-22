import nodemailer from 'nodemailer';
import { promises as dnsPromises } from 'dns';
import { env } from '../config/env';

if (!env.emailConfigured) {
  console.log('[email] SMTP not configured at startup — emailConfigured=false (SMTP_HOST/SMTP_USER missing)');
} else {
  console.log(`[email] SMTP configured at startup — host=${env.smtp.host} port=${env.smtp.port} user=${env.smtp.user}`);
}

/**
 * Some container hosts (e.g. Render) report a local network interface with
 * IPv6 support even though there is no actual outbound IPv6 route. Nodemailer
 * does its own dual-stack DNS resolution and decides whether to try IPv6 based
 * on os.networkInterfaces() rather than real reachability, so it can pick an
 * unreachable AAAA address for smtp.gmail.com and fail with ENETUNREACH.
 * Resolving the A record ourselves and connecting to the literal IPv4 address
 * bypasses that resolver entirely (a literal IP short-circuits it); the real
 * hostname is kept only for TLS SNI / certificate validation via `servername`.
 */
async function resolveIPv4(hostname: string): Promise<string> {
  try {
    const addresses = await dnsPromises.resolve4(hostname);
    return addresses[0] ?? hostname;
  } catch (err) {
    console.warn(`[email] could not resolve A record for ${hostname}, connecting by hostname instead:`, (err as Error).message);
    return hostname;
  }
}

export async function sendCollaboratorInvite(opts: {
  toEmail: string;
  toName: string;
  projectName: string;
  invitedByName: string;
  projectUrl: string;
}): Promise<void> {
  if (!env.emailConfigured) {
    console.log(`[email] SMTP not configured — skipping invite to ${opts.toEmail}`);
    return;
  }

  const { toEmail, toName, projectName, invitedByName, projectUrl } = opts;

  const host = await resolveIPv4(env.smtp.host);
  const transport = nodemailer.createTransport({
    host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    tls: { servername: env.smtp.host },
    // Fail fast instead of hanging on the default ~2 minute nodemailer timeouts —
    // makes network-level blocks show up in logs within seconds.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  console.log(`[email] attempting invite to ${toEmail} via ${env.smtp.host} (${host}):${env.smtp.port}`);

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
