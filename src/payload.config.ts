import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { AppUsers } from './collections/AppUsers'
import { CMSUsers } from './collections/CMSUsers'
import { InfluencerProfiles } from './collections/InfluencerProfiles'
import { OnboardingSettings } from './collections/OnboardingSettings'

const databaseURL = process.env.DATABASE_URL || process.env.MONGO_URI || ''

export default buildConfig({
  admin: {
    user: CMSUsers.slug,
  },
  collections: [CMSUsers, AppUsers, InfluencerProfiles, OnboardingSettings],
  db: mongooseAdapter({
    url: databaseURL,
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || process.env.JWT_SECRET || '',
  sharp,
  typescript: {
    outputFile: './src/payload-types.ts',
  },
})
