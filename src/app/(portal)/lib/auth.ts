import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export type PortalUser = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function requireSuperAdmin(): Promise<PortalUser> {
  const user = await getPortalUser()
  if (!user) redirect('/')
  if (user.role !== 'super_admin') redirect('/')
  return user
}
