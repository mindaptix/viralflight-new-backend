import type { CollectionConfig } from 'payload'

import { cmsAdmin, superAdmin } from './access'

export const CMSUsers: CollectionConfig = {
  slug: 'cms-users',
  dbName: 'cms_users',
  auth: true,
  admin: {
    group: 'Admin',
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
  },
  access: {
    create: ({ req: { user } }) => !user || user.role === 'super_admin',
    read: cmsAdmin,
    update: cmsAdmin,
    delete: superAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'super_admin',
      },
    },
  ],
}
