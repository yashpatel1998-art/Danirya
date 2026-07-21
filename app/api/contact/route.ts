import { NextRequest, NextResponse } from 'next/server';

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

  const enquiry = {
    name: body.name!.trim(),
    email: body.email!.trim(),
    companyWebsite: (body.companyWebsite ?? body.company ?? '').trim(),
    phone: (body.phone ?? '').trim(),
    budget: body.budget!.trim(),
    timeline: body.timeline!.trim(),
    message: (body.details ?? body.message ?? '').trim(),
    to: 'hello@daniryastudio.com',
    receivedAt: new Date().toISOString(),
  };

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquiry),
      });
    } catch {
      return NextResponse.json({ error: 'Unable to deliver request.' }, { status: 502 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.info('[contact]', JSON.stringify(enquiry));
  }

  return NextResponse.json({ ok: true });
}
