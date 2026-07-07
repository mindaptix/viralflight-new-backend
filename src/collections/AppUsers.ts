import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const AppUsers: CollectionConfig = {
  slug: 'app-users',
  dbName: 'users',
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'mobile',
    defaultColumns: ['mobile', 'role', 'isMobileVerified', 'lastLoginAt'],
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    { name: 'mobile', type: 'text', required: true, unique: true },
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
    { name: 'isMobileVerified', type: 'checkbox', defaultValue: false },
    { name: 'lastOtpRequestedAt', type: 'date' },
    { name: 'lastLoginAt', type: 'date' },
  ],
}
