import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { BRAND } from '@/lib/content/brand';
import { GUIDE_PDF_PATH, GUIDE_HEADLINE } from '@/lib/guide/constants';

type GuidePayload = {
  email?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function siteOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return 'https://giltfoundry.com';
}

export async function POST(request: NextRequest) {
  let body: GuidePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const studioTo = process.env.CONTACT_TO_EMAIL?.trim() || BRAND.email;

  if (!apiKey || !from) {
    console.error('[guide] Missing RESEND_API_KEY or RESEND_FROM.');
    return NextResponse.json(
      { error: 'Email delivery is not configured.' },
      { status: 500 }
    );
  }

  const origin = siteOrigin(request);
  const downloadUrl = `${origin}${GUIDE_PDF_PATH}`;
  const resend = new Resend(apiKey);

  const guideText = [
    'Thanks for requesting the guide from Gilt Foundry.',
    '',
    `Download "${GUIDE_HEADLINE}":`,
    downloadUrl,
    '',
    '— Gilt Foundry',
  ].join('\n');

  const guideHtml = `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.6;max-width:520px">
      <p style="margin:0 0 1em">Thanks for requesting the guide from Gilt Foundry.</p>
      <p style="margin:0 0 1em">
        <a href="${escapeHtml(downloadUrl)}" style="color:#9a6b2f;font-weight:600">
          Download ${escapeHtml(GUIDE_HEADLINE)}
        </a>
      </p>
      <p style="margin:0;color:#b8860b">— Gilt Foundry</p>
    </div>
  `;

  let guideEmailId: string | undefined;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: 'Your Gilt Foundry guide',
      text: guideText,
      html: guideHtml,
    });

    if (error) {
      console.error('[guide] Applicant guide email failed:', error);
      return NextResponse.json({ error: 'Unable to deliver guide.' }, { status: 502 });
    }
    guideEmailId = data?.id;
  } catch (sendErr) {
    console.error('[guide] Applicant guide send failed:', sendErr);
    return NextResponse.json({ error: 'Unable to deliver guide.' }, { status: 502 });
  }

  // Studio lead notification — best-effort; never fail the user download.
  try {
    const { error: notifyError } = await resend.emails.send({
      from,
      to: [studioTo],
      replyTo: email,
      subject: 'New guide download',
      text: `New guide download: ${email}`,
      html: `<p>New guide download: <strong>${escapeHtml(email)}</strong></p>`,
    });
    if (notifyError) {
      console.error('[guide] Studio notification failed:', notifyError);
    }
  } catch (notifyErr) {
    console.error('[guide] Studio notification send failed:', notifyErr);
  }

  return NextResponse.json({
    ok: true,
    id: guideEmailId,
    downloadUrl: GUIDE_PDF_PATH,
  });
}
