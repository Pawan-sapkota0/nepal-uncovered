import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = "Hidden Nepal <notifications@hiddennepal.app>";
const APP_URL = process.env.APP_URL ?? "https://hiddennepal.app";

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hidden Nepal</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:#1c3a5e;border-radius:12px 12px 0 0;padding:28px 36px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">🏔 Hidden Nepal</span>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:36px;border-radius:0 0 12px 12px;">
            ${content}
            <hr style="border:none;border-top:1px solid #ede8e3;margin:32px 0 24px;">
            <p style="margin:0;font-size:12px;color:#9c8f84;text-align:center;">
              You're receiving this because you submitted a place to Hidden Nepal.<br>
              <a href="${APP_URL}" style="color:#c2612b;text-decoration:none;">Visit Hidden Nepal</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface SubmissionEmailContext {
  to: string;
  contributorName: string;
  placeTitle: string;
  placeSlug: string;
  feedback?: string | null;
}

export async function sendApprovedEmail(ctx: SubmissionEmailContext): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping approval email");
    return;
  }
  const placeUrl = `${APP_URL}/places/${ctx.placeSlug}`;
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c3a5e;">Your place is live!</h1>
      <p style="margin:0;color:#6b5e52;font-size:15px;">Great news, ${ctx.contributorName}.</p>
    </div>
    <p style="color:#3d3028;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Your submission <strong>"${ctx.placeTitle}"</strong> has been reviewed and approved by our team.
      It's now part of the Hidden Nepal atlas and visible to the whole community.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${placeUrl}" style="display:inline-block;background:#c2612b;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;">View your place →</a>
    </div>
    <p style="color:#6b5e52;font-size:14px;margin:0;">
      Thank you for helping map the Nepal you love. Every contribution makes the atlas richer for everyone.
    </p>
  `);
  await client.emails.send({
    from: FROM,
    to: ctx.to,
    subject: `✅ "${ctx.placeTitle}" is now live on Hidden Nepal`,
    html,
  });
}

export async function sendRejectedEmail(ctx: SubmissionEmailContext): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping rejection email");
    return;
  }
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">📋</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c3a5e;">Submission update</h1>
      <p style="margin:0;color:#6b5e52;font-size:15px;">Hi ${ctx.contributorName},</p>
    </div>
    <p style="color:#3d3028;font-size:15px;line-height:1.6;margin:0 0 20px;">
      After careful review, your submission <strong>"${ctx.placeTitle}"</strong> was not approved at this time.
    </p>
    ${ctx.feedback ? `
    <div style="background:#fdf6f0;border-left:4px solid #c2612b;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#c2612b;text-transform:uppercase;letter-spacing:0.05em;">Reviewer feedback</p>
      <p style="margin:0;color:#3d3028;font-size:14px;line-height:1.6;">${ctx.feedback}</p>
    </div>` : ""}
    <p style="color:#6b5e52;font-size:14px;margin:0 0 20px;">
      We appreciate your effort to contribute to the atlas. You're welcome to submit a revised version or a different place anytime.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/contribute" style="display:inline-block;background:#1c3a5e;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;">Submit another place</a>
    </div>
  `);
  await client.emails.send({
    from: FROM,
    to: ctx.to,
    subject: `Update on your Hidden Nepal submission: "${ctx.placeTitle}"`,
    html,
  });
}

export async function sendChangesRequestedEmail(ctx: SubmissionEmailContext): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping changes-requested email");
    return;
  }
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">✏️</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c3a5e;">Changes needed</h1>
      <p style="margin:0;color:#6b5e52;font-size:15px;">Hi ${ctx.contributorName},</p>
    </div>
    <p style="color:#3d3028;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Our team reviewed your submission <strong>"${ctx.placeTitle}"</strong> and would like a few adjustments before it goes live.
    </p>
    ${ctx.feedback ? `
    <div style="background:#f0f6fd;border-left:4px solid #1c3a5e;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#1c3a5e;text-transform:uppercase;letter-spacing:0.05em;">What to update</p>
      <p style="margin:0;color:#3d3028;font-size:14px;line-height:1.6;">${ctx.feedback}</p>
    </div>` : ""}
    <p style="color:#6b5e52;font-size:14px;margin:0 0 20px;">
      Once you've made the updates, re-submit and we'll take another look. Thank you for helping keep the atlas accurate!
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/contribute" style="display:inline-block;background:#1c3a5e;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;">Submit updated version</a>
    </div>
  `);
  await client.emails.send({
    from: FROM,
    to: ctx.to,
    subject: `Changes needed for your Hidden Nepal submission: "${ctx.placeTitle}"`,
    html,
  });
}
