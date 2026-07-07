import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

export const AgencyProfiles: CollectionConfig = {
  slug: 'agency-profiles',
  dbName: 'agency_profiles',
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'agencyName',
    defaultColumns: ['agencyName', 'mobile', 'city', 'isProfileComplete', 'completedAt'],
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
    { name: 'agencyName', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'services', type: 'json' },
    { name: 'website', type: 'text' },
    { name: 'teamSize', type: 'number', min: 1 },
    { name: 'description', type: 'textarea' },
    { name: 'clientIndustries', type: 'json' },
    { name: 'isProfileComplete', type: 'checkbox', defaultValue: false },
    { name: 'completedAt', type: 'date' },
  ],
}
