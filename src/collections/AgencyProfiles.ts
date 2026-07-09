import type { CollectionConfig } from 'payload'

import {
  AGENCY_CREATORS_MANAGED_RANGES,
  AGENCY_FOCUS_AREAS,
  AGENCY_TEAM_SIZES,
  AGENCY_TYPES,
  toPayloadOptions,
} from '../constants/profileOptions.js'
import { cmsAdmin } from './access'

const agencyTypeOptions = toPayloadOptions(AGENCY_TYPES)
const teamSizeOptions = toPayloadOptions(AGENCY_TEAM_SIZES)
const creatorsManagedOptions = toPayloadOptions(AGENCY_CREATORS_MANAGED_RANGES)
const focusAreaOptions = toPayloadOptions(AGENCY_FOCUS_AREAS)

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
      'updatedAt',
    ],
    description: 'Complete agency profile in one schema.',
  },
  access: {
    create: cmsAdmin,
    read: cmsAdmin,
    update: cmsAdmin,
    delete: cmsAdmin,
  },
  fields: [
    { name: 'agencyName', type: 'text', label: 'Agency Name' },
    { name: 'contactPerson', type: 'text', label: 'Contact Person' },
    { name: 'city', type: 'text', label: 'City' },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'app-users',
      label: 'Login User',
    },
    { name: 'mobile', type: 'text', required: true, unique: true, label: 'Mobile Number' },
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
