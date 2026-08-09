#!/usr/bin/env node
/**
 * Reset Payload CMS super-admin password using Payload's exact PBKDF2 format,
 * then verify the hash locally before finishing.
 *
 *   node scripts/reset-admin-password.cjs
 *   ADMIN_PASSWORD='ViralFlight@2026' node scripts/reset-admin-password.cjs
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

if (NEW_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters')
  process.exit(1)
}

function generatePasswordSaltHash(password) {
  const salt = crypto.randomBytes(32).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256').toString('hex')
  return { salt, hash }
}

function verifyPassword(password, salt, hash) {
  const next = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256')
  const stored = Buffer.from(hash, 'hex')
  return next.length === stored.length && crypto.timingSafeEqual(next, stored)
}

;(async () => {
  await mongoose.connect(MONGO_URI)
  const col = mongoose.connection.db.collection('cms_users')

  const existing = await col.findOne({
    email: { $regex: new RegExp(`^${EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  })

  if (!existing) {
    console.error('No cms_users doc found for', EMAIL)
    console.log(
      'Existing users:',
      await col.find({}, { projection: { email: 1, role: 1 } }).limit(20).toArray(),
    )
    process.exit(1)
  }

  const { salt, hash } = generatePasswordSaltHash(NEW_PASSWORD)

  await col.updateOne(
    { _id: existing._id },
    {
      $set: {
        email: EMAIL,
        salt,
        hash,
        role: 'super_admin',
        loginAttempts: 0,
        updatedAt: new Date(),
      },
      $unset: {
        lockUntil: '',
        lockedUntil: '',
        password: '',
        resetPasswordToken: '',
        resetPasswordExpiration: '',
      },
    },
  )

  const verify = await col.findOne(
    { _id: existing._id },
    {
      projection: {
        email: 1,
        role: 1,
        loginAttempts: 1,
        lockUntil: 1,
        salt: 1,
        hash: 1,
        password: 1,
      },
    },
  )

  const hashOk = verifyPassword(NEW_PASSWORD, verify.salt, verify.hash)

  console.log(
    JSON.stringify(
      {
        email: verify.email,
        role: verify.role,
        loginAttempts: verify.loginAttempts,
        lockUntil: verify.lockUntil || null,
        hasSalt: Boolean(verify.salt),
        hasHash: Boolean(verify.hash),
        hasLegacyPasswordField: Boolean(verify.password),
        localHashVerify: hashOk ? 'PASS' : 'FAIL',
      },
      null,
      2,
    ),
  )

  if (!hashOk) {
    console.error('Local hash verify failed — aborting')
    process.exit(1)
  }

  console.log('')
  console.log('Use these credentials:')
  console.log('  URL:      https://viralflight.cloud/')
  console.log('  Email:    ' + EMAIL)
  console.log('  Password: ' + NEW_PASSWORD)
  console.log('')
  console.log('Quick API test on server:')
  console.log(
    `  curl -s -X POST http://127.0.0.1:3000/api/cms-users/login -H 'Content-Type: application/json' -d '{"email":"${EMAIL}","password":"${NEW_PASSWORD}"}'`,
  )

  await mongoose.disconnect()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
