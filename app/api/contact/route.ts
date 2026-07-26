import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { BRAND } from '@/lib/content/brand';

const MIN_DETAILS = 50;

type ContactPayload = {
  name?: string;
  email?: string;
  companyWebsite?: string;
  company?: string;
  phone?: string;
  budget?: string;
  timeline?: string;
  details?: string;
  message?: string;
};

function validate(body: ContactPayload): string | null {
  if (!body.name?.trim()) return 'Name is required.';
  if (!body.email?.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'Invalid email address.';
  if (!body.budget?.trim()) return 'Budget is required.';
  if (!body.timeline?.trim()) return 'Timeline is required.';
  const message = (body.details ?? body.message ?? '').trim();
  if (message.length < MIN_DETAILS) {
    return `Project details need at least ${MIN_DETAILS} characters.`;
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: NextRequest) {
  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const err = validate(body);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.CONTACT_TO_EMAIL?.trim() || BRAND.email;

  if (!apiKey || !from) {
    console.error(
      '[contact] Missing RESEND_API_KEY or RESEND_FROM — cannot deliver enquiry.'
    );
    return NextResponse.json(
      { error: 'Email delivery is not configured.' },
      { status: 500 }
    );
  }

  const enquiry = {
    name: body.name!.trim(),
    email: body.email!.trim(),
    companyWebsite: (body.companyWebsite ?? body.company ?? '').trim(),
    phone: (body.phone ?? '').trim(),
    budget: body.budget!.trim(),
    timeline: body.timeline!.trim(),
    message: (body.details ?? body.message ?? '').trim(),
    receivedAt: new Date().toISOString(),
  };

  const text = [
    `New application from ${enquiry.name}`,
    ``,
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Company Website: ${enquiry.companyWebsite || '—'}`,
    `WhatsApp / Telegram: ${enquiry.phone || '—'}`,
    `Budget: ${enquiry.budget}`,
    `Timeline: ${enquiry.timeline}`,
    ``,
    `Project details:`,
    enquiry.message,
    ``,
    `Received: ${enquiry.receivedAt}`,
  ].join('\n');

  const html = `
    <h2>New application from ${escapeHtml(enquiry.name)}</h2>
    <p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
    <p><strong>Company Website:</strong> ${escapeHtml(enquiry.companyWebsite || '—')}</p>
    <p><strong>WhatsApp / Telegram:</strong> ${escapeHtml(enquiry.phone || '—')}</p>
    <p><strong>Budget:</strong> ${escapeHtml(enquiry.budget)}</p>
    <p><strong>Timeline:</strong> ${escapeHtml(enquiry.timeline)}</p>
    <p><strong>Project details:</strong></p>
    <p>${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}</p>
    <p><em>Received: ${escapeHtml(enquiry.receivedAt)}</em></p>
  `;

  let emailId: string | undefined;
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: enquiry.email,
      subject: `New application — ${enquiry.name}`,
      text,
      html,
    });

    if (error) {
      console.error('[contact] Resend error:', error);
      return NextResponse.json({ error: 'Unable to deliver request.' }, { status: 502 });
    }
    emailId = data?.id;
  } catch (sendErr) {
    console.error('[contact] Resend send failed:', sendErr);
    return NextResponse.json({ error: 'Unable to deliver request.' }, { status: 502 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...enquiry, to }),
      });
    } catch {
      // Email already delivered; webhook is optional secondary.
      console.warn('[contact] Optional webhook delivery failed.');
    }
  }

  return NextResponse.json({ ok: true, id: emailId });
}
