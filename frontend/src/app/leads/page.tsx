'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listLeads, markReachedOut, downloadResume, clearToken, LeadOut } from '@/lib/api'

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    setLoading(true)
    setError('')
    try {
      const data = await listLeads()
      setLeads(data)
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkReachedOut(id: string) {
    setActionLoading(id)
    try {
      const updated = await markReachedOut(id)
      setLeads(prev => prev.map(l => l.id === id ? updated : l))
    } catch {
      alert('Failed to update lead status')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDownload(id: string, filename: string) {
    setActionLoading(`dl-${id}`)
    try {
      await downloadResume(id, filename)
    } catch {
      alert('Failed to download resume')
    } finally {
      setActionLoading(null)
    }
  }

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

  if (loading) return <p>Loading leads…</p>

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Leads</h1>
        <button onClick={handleLogout}
          style={{ padding: '0.4rem 1rem', background: '#eee', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '0.75rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {leads.length === 0 ? (
        <p style={{ color: '#666' }}>No leads yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>State</th>
                <th style={th}>Submitted</th>
                <th style={th}>Resume</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{lead.first_name} {lead.last_name}</td>
                  <td style={td}>{lead.email}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600,
                      background: lead.state === 'REACHED_OUT' ? '#d4edda' : '#fff3cd',
                      color: lead.state === 'REACHED_OUT' ? '#155724' : '#856404',
                    }}>
                      {lead.state}
                    </span>
                  </td>
                  <td style={td}>{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleDownload(lead.id, lead.resume_filename)}
                      disabled={actionLoading === `dl-${lead.id}`}
                      style={{ padding: '3px 10px', cursor: 'pointer', borderRadius: 4, border: '1px solid #007bff', background: 'transparent', color: '#007bff', fontSize: '0.85rem' }}>
                      {actionLoading === `dl-${lead.id}` ? '…' : 'Download'}
                    </button>
                  </td>
                  <td style={td}>
                    {lead.state === 'PENDING' ? (
                      <button
                        onClick={() => handleMarkReachedOut(lead.id)}
                        disabled={actionLoading === lead.id}
                        style={{ padding: '3px 10px', cursor: 'pointer', borderRadius: 4, border: 'none', background: '#1a6b3a', color: '#fff', fontSize: '0.85rem' }}>
                        {actionLoading === lead.id ? '…' : 'Mark Reached Out'}
                      </button>
                    ) : (
                      <span style={{ color: '#888', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '0.6rem 0.75rem', verticalAlign: 'middle' }
