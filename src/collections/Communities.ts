import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const Communities: CollectionConfig = {
  slug: 'communities',
  dbName: 'communities',
  labels: {
    singular: 'Community',
    plural: 'Communities',
  },
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'city', 'isActive', 'sortOrder'],
    description: 'Creator communities shown in the influencer app.',
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'tagline', type: 'textarea', required: true },
    { name: 'category', type: 'text', required: true, index: true },
    { name: 'city', type: 'text', required: true, index: true },
    { name: 'imageUrl', type: 'text', label: 'Cover Image URL' },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'baseMemberCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Existing / Marketing Member Count',
      admin: {
        description:
          'Displayed member count starts here; real in-app joins are added automatically.',
      },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
  ],
  timestamps: true,
}
