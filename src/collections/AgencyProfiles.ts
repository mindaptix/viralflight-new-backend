import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

const agencyTypeOptions = [
  'Talent Management',
  'Influencer Marketing',
  'Creative / Production',
  'PR & Communications',
  'Full-service Agency',
  'Boutique Agency',
].map((value) => ({ label: value, value }))

const teamSizeOptions = ['Solo', '2-5', '6-15', '16-50', '50+'].map((value) => ({
  label: value,
  value,
}))

const creatorsManagedOptions = ['1-10', '11-25', '26-50', '51-100', '100+'].map((value) => ({
  label: value,
  value,
}))

const focusAreaOptions = [
  'Fashion',
  'Beauty',
  'Lifestyle',
  'Food & Beverage',
  'Tech',
  'Finance',
  'Gaming',
  'Travel',
  'Health & Wellness',
  'Entertainment',
  'Automobile',
  'Real Estate',
  'Education',
  'D2C / E-commerce',
].map((value) => ({ label: value, value }))

export const AgencyProfiles: CollectionConfig = {
  slug: 'agency-profiles',
  dbName: 'agency_profiles',
  labels: {
    singular: 'Agency Profile',
    plural: 'Agency Profiles',
  },
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'agencyName',
    defaultColumns: [
      'agencyName',
      'contactPerson',
      'agencyType',
      'city',
      'isProfileComplete',
      'completedAt',
    ],
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'app-users',
      label: 'Login User',
    },
    { name: 'mobile', type: 'text', required: true, unique: true, label: 'Mobile Number' },
    { name: 'agencyName', type: 'text', label: 'Agency Name' },
    { name: 'contactPerson', type: 'text', label: 'Contact Person' },
    { name: 'city', type: 'text', label: 'City' },
    {
      name: 'agencyType',
      type: 'select',
      label: 'Agency Type',
      options: agencyTypeOptions,
    },
    {
      name: 'teamSize',
      type: 'select',
      label: 'Team Size',
      options: teamSizeOptions,
    },
    {
      name: 'creatorsManaged',
      type: 'select',
      label: 'Creators Managed',
      options: creatorsManagedOptions,
    },
    {
      name: 'focusAreas',
      type: 'select',
      hasMany: true,
      label: 'Focus Areas',
      options: focusAreaOptions,
    },
    { name: 'website', type: 'text', label: 'Website' },
    { name: 'description', type: 'textarea', label: 'About Your Agency' },
    { name: 'isProfileComplete', type: 'checkbox', defaultValue: false, label: 'Profile Complete' },
    { name: 'completedAt', type: 'date', label: 'Completed At' },
  ],
  timestamps: true,
}
