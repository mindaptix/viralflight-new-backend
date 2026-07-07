import type { Access } from 'payload'

export const anyone: Access = () => true

export const loggedIn: Access = ({ req: { user } }) => Boolean(user)

export const cmsAdmin: Access = ({ req: { user } }) =>
  user?.role === 'super_admin' || user?.role === 'admin'

export const superAdmin: Access = ({ req: { user } }) => user?.role === 'super_admin'
