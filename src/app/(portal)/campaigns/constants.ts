export const CAMPAIGN_STATUSES = [
  'draft',
  'active',
  'in_review',
  'live',
  'completed',
  'archived',
] as const

export type VfCampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CREATOR_STATUSES = [
  'invited',
  'script_submitted',
  'script_changes',
  'script_approved',
  'video_submitted',
  'video_changes',
  'video_approved',
  'live',
  'dropped',
] as const

export type CreatorStatus = (typeof CREATOR_STATUSES)[number]

export const STATUS_LABEL: Record<CreatorStatus, string> = {
  invited: 'Invited',
  script_submitted: 'Script submitted',
  script_changes: 'Script changes requested',
  script_approved: 'Script approved',
  video_submitted: 'Video submitted',
  video_changes: 'Video changes requested',
  video_approved: 'Ready to post',
  live: 'Live on Instagram',
  dropped: 'Dropped',
}

export function publicOrigin() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'https://viralflight.cloud'
  ).replace(/\/$/, '')
}
