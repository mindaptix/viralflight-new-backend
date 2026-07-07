import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const InfluencerProfiles: CollectionConfig = {
  slug: 'influencer-profiles',
  dbName: 'influencer_profiles',
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'name',
    defaultColumns: ['name', 'mobile', 'city', 'isProfileComplete', 'completedAt'],
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    { name: 'userId', type: 'relationship', relationTo: 'app-users' },
    { name: 'mobile', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text' },
    { name: 'city', type: 'text' },
    {
      name: 'platforms',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'username', type: 'text' },
        { name: 'channelName', type: 'text' },
        { name: 'followers', type: 'number', min: 0 },
        { name: 'subscribers', type: 'number', min: 0 },
        { name: 'engagement', type: 'number', min: 0, max: 100, required: true },
      ],
    },
    { name: 'contentCategories', type: 'json' },
    { name: 'contentLanguages', type: 'json' },
    { name: 'bio', type: 'textarea' },
    { name: 'collaborationPreferences', type: 'json' },
    {
      name: 'rateRange',
      type: 'group',
      fields: [
        { name: 'min', type: 'number', min: 0 },
        { name: 'max', type: 'number', min: 0 },
        { name: 'currency', type: 'text', defaultValue: 'INR' },
      ],
    },
    { name: 'pastCollaborations', type: 'json' },
    { name: 'portfolioLinks', type: 'json' },
    { name: 'isProfileComplete', type: 'checkbox', defaultValue: false },
    { name: 'completedAt', type: 'date' },
  ],
}
