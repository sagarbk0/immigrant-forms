'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, setToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    try {
      const token = await login(fd.get('username') as string, fd.get('password') as string)
      setToken(token)
      router.push('/leads')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Attorney Login</h1>

      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '0.75rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="username" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Username</label>
          <input id="username" name="username" type="text" required autoComplete="username"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
        </div>

        <button type="submit" disabled={loading}
          style={{ padding: '0.6rem', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
