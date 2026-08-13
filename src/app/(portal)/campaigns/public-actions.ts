'use server'

import { revalidatePath } from 'next/cache'

import {
  creatorSubmitInstagram,
  creatorSubmitScript,
  creatorSubmitVideo,
} from './data'

export async function publicSubmitScriptAction(formData: FormData) {
  const token = String(formData.get('inviteToken') || '')
  await creatorSubmitScript(token, String(formData.get('scriptText') || ''))
  revalidatePath(`/i/${token}`)
}

export async function publicSubmitVideoAction(formData: FormData) {
  const token = String(formData.get('inviteToken') || '')
  await creatorSubmitVideo(token, String(formData.get('videoUrl') || ''))
  revalidatePath(`/i/${token}`)
}

export async function publicSubmitInstagramAction(formData: FormData) {
  const token = String(formData.get('inviteToken') || '')
  await creatorSubmitInstagram(token, String(formData.get('instagramUrl') || ''))
  revalidatePath(`/i/${token}`)
}
