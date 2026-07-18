'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/cms-users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result?.errors?.[0]?.message || result?.message || 'Invalid email or password.')
        return
      }

      if (result?.user?.role !== 'super_admin') {
        await fetch('/api/cms-users/logout', {
          method: 'POST',
          credentials: 'include',
        })
        setError('This portal is available only to the super admin.')
        return
      }

      router.refresh()
    } catch {
      setError('Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        Email address
        <input
          autoComplete="email"
          autoFocus
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@viralflight.in"
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Password
        <input
          autoComplete="current-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? 'Signing in…' : 'Sign in securely'}
      </button>
    </form>
  )
}

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await fetch('/api/cms-users/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="logout-button" disabled={loading} onClick={logout} type="button">
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
