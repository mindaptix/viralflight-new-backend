#!/usr/bin/env node
/**
 * Reset Payload CMS super-admin password (PBKDF2 salt+hash, not bcrypt).
 *
 * Usage on server:
 *   node scripts/reset-admin-password.cjs
 *   ADMIN_EMAIL=admin@viralflight.in ADMIN_PASSWORD='YourNewPass' node scripts/reset-admin-password.cjs
 */
require('dotenv').config()
const crypto = require('crypto')
const mongoose = require('mongoose')

const EMAIL = (process.env.ADMIN_EMAIL || 'admin@viralflight.in').trim().toLowerCase()
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'ViralFlight@2026'
const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('Missing DATABASE_URL / MONGO_URI in .env')
  process.exit(1)
}

function generatePasswordSaltHash(password) {
  const salt = crypto.randomBytes(32).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256').toString('hex')
  return { salt, hash }
}

;(async () => {
  await mongoose.connect(MONGO_URI)
  const col = mongoose.connection.db.collection('cms_users')

  const existing = await col.findOne(
    { email: { $regex: new RegExp(`^${EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    { projection: { email: 1, name: 1, role: 1, loginAttempts: 1, lockUntil: 1, salt: 1, hash: 1, password: 1 } },
  )

  if (!existing) {
    console.error('No cms_users doc found for', EMAIL)
    const all = await col.find({}, { projection: { email: 1, role: 1 } }).limit(20).toArray()
    console.log('Existing users:', all)
    process.exit(1)
  }

  const { salt, hash } = generatePasswordSaltHash(NEW_PASSWORD)

  const result = await col.updateOne(
    { _id: existing._id },
    {
      $set: {
        email: EMAIL,
        salt,
        hash,
        role: 'super_admin',
        loginAttempts: 0,
      },
      $unset: {
        lockUntil: '',
        lockedUntil: '',
        password: '',
      },
    },
  )

  const verify = await col.findOne(
    { _id: existing._id },
    { projection: { email: 1, role: 1, loginAttempts: 1, lockUntil: 1, salt: 1, hash: 1, password: 1 } },
  )

  console.log('Updated:', {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    email: verify?.email,
    role: verify?.role,
    loginAttempts: verify?.loginAttempts,
    lockUntil: verify?.lockUntil || null,
    hasSalt: Boolean(verify?.salt),
    hasHash: Boolean(verify?.hash),
    hasLegacyPasswordField: Boolean(verify?.password),
  })
  console.log('Login with:')
  console.log('  email:', EMAIL)
  console.log('  password:', NEW_PASSWORD)

  await mongoose.disconnect()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
