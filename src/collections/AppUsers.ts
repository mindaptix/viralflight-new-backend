import type { CollectionConfig } from 'payload'

import {
  ALLOWED_CITIES,
  COLLABORATION_PREFERENCES,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  PLATFORM_OPTIONS,
} from '../constants/onboardingConstants.js'
import { cmsAdmin } from './access'

export const AppUsers: CollectionConfig = {
  slug: 'app-users',
  dbName: 'users',
  labels: {
    singular: 'Login User',
    plural: 'Login Users',
  },
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'mobile',
    defaultColumns: [
      'mobile',
      'role',
      'isMobileVerified',
      'lastLoginAt',
      'createdAt',
    ],
    description:
      'Users who sign in with mobile OTP. Mobile number is the main identifier.',
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    {
      name: 'mobile',
      type: 'text',
      required: true,
      unique: true,
      label: 'Mobile Number',
      admin: {
        description: 'Login mobile number (e.g. +919876543210)',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Agency', value: 'agency' },
        { label: 'Influencer', value: 'influencer' },
        { label: 'Brand', value: 'brand' },
      ],
    },
    {
      name: 'isMobileVerified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Mobile Verified',
    },
    {
      name: 'lastOtpRequestedAt',
      type: 'date',
      label: 'Last OTP Requested',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      label: 'Last Login',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'influencerProfile',
      type: 'join',
      collection: 'influencer-profiles',
      on: 'userId',
      label: 'Influencer Profile',
      admin: {
        condition: (data) => data.role === 'influencer',
      },
    },
  ],
  timestamps: true,
}
