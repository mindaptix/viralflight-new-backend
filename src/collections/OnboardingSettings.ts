import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const OnboardingSettings: CollectionConfig = {
  slug: 'onboarding-settings',
  dbName: 'cms_settings',
  admin: {
    group: 'Viral Flight CMS',
    useAsTitle: 'key',
    defaultColumns: ['key', 'updatedAt'],
    description:
      'Edit influencer onboarding options. Keep value as the JSON object used by the app.',
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'influencer_onboarding',
    },
    {
      name: 'value',
      type: 'json',
      required: true,
      admin: {
        description:
          'Expected keys: cities, platforms, primaryPlatforms, secondaryPlatforms, contentCategories, contentLanguages, collaborationPreferences, collaborationPreferenceOptions, validation.',
      },
    },
  ],
}
