/** Shared options for /lab/apply — budget/timeline match production ApplicationForm. */

export const MIN_DETAILS = 50;

export const PROJECT_TYPES = [
  'Website',
  'Brand',
  'Both',
  'Something else',
] as const;

export const BUDGETS = [
  '$0 – $1k',
  '$1k – $5k',
  '$5k – $10k',
  '$10k – $20k',
  '$20k+',
] as const;

export const TIMELINES = [
  'ASAP',
  'Within 30 days',
  '1–2 months',
  'Just researching',
  'Flexible',
] as const;

export type FaqItem = { q: string; a: string };

/** FAQ below the 6-screen form on /lab/apply (not a step). */
export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What happens after I apply?',
    a: "I read it myself and reply within 24 hours if it's a fit.",
  },
  {
    q: 'How much does it cost?',
    a: 'Every project is different, so I quote after I understand what you need.',
  },
  {
    q: 'How long does it take?',
    a: "Depends on the project. You'll get a real timeline once we talk.",
  },
  {
    q: 'Do you work with small businesses?',
    a: 'Yes. What matters is the idea, not the size.',
  },
];

export type CountryCode = { iso: string; dial: string; label: string };

/** Compact dial list — not a giant inline picker. */
export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'US', dial: '+1', label: 'US/CA' },
  { iso: 'GB', dial: '+44', label: 'UK' },
  { iso: 'IN', dial: '+91', label: 'IN' },
  { iso: 'AU', dial: '+61', label: 'AU' },
  { iso: 'AE', dial: '+971', label: 'AE' },
  { iso: 'SG', dial: '+65', label: 'SG' },
  { iso: 'DE', dial: '+49', label: 'DE' },
  { iso: 'FR', dial: '+33', label: 'FR' },
  { iso: 'NL', dial: '+31', label: 'NL' },
  { iso: 'NZ', dial: '+64', label: 'NZ' },
  { iso: 'ZA', dial: '+27', label: 'ZA' },
  { iso: 'JP', dial: '+81', label: 'JP' },
  { iso: 'OTHER', dial: '+', label: 'Other' },
];

/** Simple timezone / locale → ISO guess for dial default. */
export function detectCountryIso(): string {
  if (typeof window === 'undefined') return 'US';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzMap: Record<string, string> = {
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Toronto': 'US',
      'America/Vancouver': 'US',
      'Europe/London': 'GB',
      'Europe/Dublin': 'GB',
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Pacific/Auckland': 'NZ',
      'Asia/Dubai': 'AE',
      'Asia/Singapore': 'SG',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Amsterdam': 'NL',
      'Africa/Johannesburg': 'ZA',
      'Asia/Tokyo': 'JP',
    };
    if (tzMap[tz]) return tzMap[tz];
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/London') || tz.startsWith('Europe/Dublin')) return 'GB';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('Pacific/Auckland')) return 'NZ';
  } catch {
    /* ignore */
  }

  const lang =
    typeof navigator !== 'undefined'
      ? (navigator.languages?.[0] || navigator.language || '').toLowerCase()
      : '';
  if (lang.includes('-in') || lang.startsWith('hi')) return 'IN';
  if (lang.includes('-gb') || lang === 'en-gb') return 'GB';
  if (lang.includes('-au')) return 'AU';
  if (lang.includes('-nz')) return 'NZ';
  if (lang.includes('-ae')) return 'AE';
  if (lang.includes('-sg')) return 'SG';
  if (lang.includes('-de')) return 'DE';
  if (lang.includes('-fr')) return 'FR';
  if (lang.includes('-nl')) return 'NL';
  if (lang.includes('-za')) return 'ZA';
  if (lang.includes('-jp')) return 'JP';

  return 'US';
}
