import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const BrandProfiles: CollectionConfig = {
  slug: 'brand-profiles',
  dbName: 'brand_profiles',
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'brandName',
    defaultColumns: ['brandName', 'mobile', 'city', 'isProfileComplete', 'completedAt'],
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
    { name: 'brandName', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'industry', type: 'text' },
    { name: 'website', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'campaignTypes', type: 'json' },
    {
      name: 'budgetRange',
      type: 'group',
      fields: [
        { name: 'min', type: 'number', min: 0 },
        { name: 'max', type: 'number', min: 0 },
        { name: 'currency', type: 'text', defaultValue: 'INR' },
      ],
    },
    { name: 'isProfileComplete', type: 'checkbox', defaultValue: false },
    { name: 'completedAt', type: 'date' },
  ],
}
