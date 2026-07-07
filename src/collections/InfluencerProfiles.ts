import type { CollectionConfig } from 'payload'

import {
  ALLOWED_CITIES,
  COLLABORATION_PREFERENCE_OPTIONS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  PLATFORM_OPTIONS,
} from '../models/InfluencerProfile.js'
import { cmsAdmin } from './access'

const platformOptions = PLATFORM_OPTIONS.map((option) => ({
  label: option.label,
  value: option.platform,
}))

export const InfluencerProfiles: CollectionConfig = {
  slug: 'influencer-profiles',
  dbName: 'influencer_profiles',
  labels: {
    singular: 'Influencer Profile',
    plural: 'Influencer Profiles',
  },
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'mobile',
    defaultColumns: [
      'mobile',
      'name',
      'city',
      'isProfileComplete',
      'completedAt',
      'updatedAt',
    ],
    description:
      'Complete influencer profile — all 4 onboarding screens in one schema.',
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Step 1 — Name & City',
          fields: [
            { name: 'name', type: 'text', label: 'Full Name' },
            {
              name: 'city',
              type: 'select',
              label: 'City',
              options: ALLOWED_CITIES.map((city) => ({
                label: city,
                value: city,
              })),
            },
            {
              name: 'userId',
              type: 'relationship',
              relationTo: 'app-users',
              label: 'Login User',
            },
            {
              name: 'mobile',
              type: 'text',
              required: true,
              unique: true,
              label: 'Mobile Number',
            },
          ],
        },
        {
          label: 'Step 2 — Socials',
          fields: [
            {
              name: 'platforms',
              type: 'array',
              label: 'Connected Platforms',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: platformOptions,
                },
                { name: 'username', type: 'text', label: 'Username / Handle' },
                { name: 'channelName', type: 'text', label: 'Channel Name' },
                { name: 'followers', type: 'number', min: 0, label: 'Followers' },
                {
                  name: 'subscribers',
                  type: 'number',
                  min: 0,
                  label: 'Subscribers',
                },
                {
                  name: 'engagement',
                  type: 'number',
                  min: 0,
                  max: 100,
                  required: true,
                  label: 'Engagement (%)',
                },
              ],
            },
          ],
        },
        {
          label: 'Step 3 — Niches & Languages',
          fields: [
            {
              name: 'contentCategories',
              type: 'select',
              hasMany: true,
              label: 'Content Categories (5 required)',
              options: CONTENT_CATEGORIES.map((category) => ({
                label: category,
                value: category,
              })),
            },
            {
              name: 'contentLanguages',
              type: 'select',
              hasMany: true,
              label: 'Content Languages',
              options: CONTENT_LANGUAGES.map((language) => ({
                label: language,
                value: language,
              })),
            },
          ],
        },
        {
          label: 'Step 4 — Bio & Collab',
          fields: [
            { name: 'bio', type: 'textarea', label: 'Bio (min 30 chars)' },
            {
              name: 'collaborationPreference',
              type: 'select',
              label: 'Collaboration Preference',
              options: COLLABORATION_PREFERENCE_OPTIONS,
            },
            {
              name: 'rateRange',
              type: 'group',
              label: 'Rate Range (optional)',
              fields: [
                { name: 'min', type: 'number', min: 0, label: 'Min (₹)' },
                { name: 'max', type: 'number', min: 0, label: 'Max (₹)' },
                { name: 'currency', type: 'text', defaultValue: 'INR' },
              ],
            },
            {
              name: 'pastCollaborations',
              type: 'text',
              hasMany: true,
              label: 'Past Collaborations (brand names)',
            },
            {
              name: 'portfolioLink',
              type: 'text',
              label: 'Portfolio Link',
            },
          ],
        },
        {
          label: 'Status',
          fields: [
            {
              name: 'isProfileComplete',
              type: 'checkbox',
              defaultValue: false,
              label: 'Profile Complete',
            },
            { name: 'completedAt', type: 'date', label: 'Completed At' },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
