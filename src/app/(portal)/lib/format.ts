export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function asIso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export const CRM_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'negotiation',
  'won',
  'lost',
  'archived',
] as const

export type CrmStatus = (typeof CRM_STATUSES)[number]

export const CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
  'Indore',
  'Bhopal',
  'Nagpur',
  'Surat',
  'Goa',
  'Dehradun',
  'Patna',
  'Guwahati',
] as const

export const NICHES = [
  'Fashion',
  'Lifestyle',
  'Beauty',
  'Fitness',
  'Food',
  'Travel',
  'Tech',
  'Finance',
  'Gaming',
  'Parenting',
  'Education',
  'Comedy',
  'Music',
  'Dance',
  'Photography',
  'Art & Design',
  'Health & Wellness',
  'Automobile',
  'Real Estate',
  'Sports',
  'Pets',
  'Spirituality',
  'News & Commentary',
  'DIY & Crafts',
] as const
