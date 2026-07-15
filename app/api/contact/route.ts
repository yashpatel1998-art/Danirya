import { NextRequest, NextResponse } from 'next/server';

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  details?: string;
};

function validate(body: ContactPayload): string | null {
  if (!body.name?.trim()) return 'Name is required.';
  if (!body.email?.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'Invalid email address.';
  if (!body.projectType?.trim()) return 'Project type is required.';
  if (!body.budget?.trim()) return 'Budget is required.';
  if (!body.details?.trim()) return 'Project details are required.';
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
    company: body.company?.trim() || null,
    projectType: body.projectType!.trim(),
    budget: body.budget!.trim(),
    timeline: body.timeline?.trim() || 'Flexible',
    details: body.details!.trim(),
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
      return NextResponse.json({ error: 'Unable to deliver enquiry.' }, { status: 502 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.info('[contact]', JSON.stringify(enquiry));
  }

  return NextResponse.json({ ok: true });
}
