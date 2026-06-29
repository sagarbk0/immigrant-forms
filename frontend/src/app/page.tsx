'use client'

import { useState } from 'react'
import { submitLead } from '@/lib/api'

export default function LeadForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const form = e.currentTarget
    const data = new FormData(form)

    try {
      await submitLead(data)
      setStatus('success')
      form.reset()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <main>
      <h1 style={{ marginBottom: '0.5rem' }}>Apply for Immigration Assistance</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Fill out the form below and an attorney will reach out to you.
      </p>

      {status === 'success' && (
        <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, padding: '1rem', marginBottom: '1rem' }}>
          <strong>Application submitted!</strong> We&apos;ll be in touch soon.
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '1rem', marginBottom: '1rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
        <div>
          <label htmlFor="first_name" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>First Name</label>
          <input id="first_name" name="first_name" type="text" required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label htmlFor="last_name" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Last Name</label>
          <input id="last_name" name="last_name" type="text" required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Email</label>
          <input id="email" name="email" type="email" required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label htmlFor="resume" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Resume / CV <span style={{ color: '#888', fontWeight: 400 }}>(PDF, DOC, DOCX — max 5 MB)</span>
          </label>
          <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" required
            style={{ width: '100%' }} />
        </div>

        <button type="submit" disabled={status === 'loading'}
          style={{ padding: '0.6rem 1.5rem', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}>
          {status === 'loading' ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </main>
  )
}
