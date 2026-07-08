import type { CollectionConfig } from 'payload'

import { cmsAdmin } from './access'

const industryOptions = [
  'Fashion & Apparel',
  'Beauty & Personal Care',
  'Food & Beverage',
  'Technology',
  'Finance & Fintech',
  'Health & Fitness',
  'Travel & Hospitality',
  'Automobile',
  'Real Estate',
  'Education',
  'Entertainment',
  'D2C / E-commerce',
  'FMCG',
  'Gaming',
].map((value) => ({ label: value, value }))

const campaignInterestOptions = [
  'Influencer posts',
  'Reels & short video',
  'UGC content',
  'Product seeding',
  'Brand ambassador',
  'Event appearances',
  'Affiliate marketing',
].map((value) => ({ label: value, value }))

const monthlyCampaignBudgetOptions = [
  'Under ₹50K',
  '₹50K - ₹2L',
  '₹2L - ₹10L',
  '₹10L - ₹50L',
  '₹50L+',
  'Not sure yet',
].map((value) => ({ label: value, value }))

export const BrandProfiles: CollectionConfig = {
  slug: 'brand-profiles',
  dbName: 'brand_profiles',
  labels: {
    singular: 'Brand Profile',
    plural: 'Brand Profiles',
  },
  admin: {
    group: 'Viral Flight',
    useAsTitle: 'brandName',
    defaultColumns: [
      'brandName',
      'contactPerson',
      'industry',
      'city',
      'isProfileComplete',
      'completedAt',
      'updatedAt',
    ],
    description:
      'Complete brand profile — all 3 onboarding screens in one schema.',
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
    { name: 'brandName', type: 'text', label: 'Brand / Company Name' },
    { name: 'contactPerson', type: 'text', label: 'Contact Person' },
    { name: 'city', type: 'text', label: 'City' },
    {
      name: 'industry',
      type: 'select',
      label: 'Industry',
      options: industryOptions,
    },
    { name: 'website', type: 'text', label: 'Website' },
    { name: 'instagramHandle', type: 'text', label: 'Instagram Handle' },
    {
      name: 'campaignInterests',
      type: 'select',
      hasMany: true,
      label: 'Campaign Interests',
      options: campaignInterestOptions,
    },
    {
      name: 'monthlyCampaignBudget',
      type: 'select',
      label: 'Monthly Campaign Budget',
      options: monthlyCampaignBudgetOptions,
    },
    { name: 'description', type: 'textarea', label: 'About Your Brand' },
    { name: 'isProfileComplete', type: 'checkbox', defaultValue: false, label: 'Profile Complete' },
    { name: 'completedAt', type: 'date', label: 'Completed At' },
  ],
  timestamps: true,
}
