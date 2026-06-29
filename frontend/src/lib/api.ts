const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('auth_token')
}

export interface LeadOut {
  id: string
  first_name: string
  last_name: string
  email: string
  resume_filename: string
  state: 'PENDING' | 'REACHED_OUT'
  created_at: string
  updated_at: string
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Login failed')
  }
  const data = await res.json()
  return data.access_token
}

export async function submitLead(formData: FormData): Promise<LeadOut> {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Submission failed')
  }
  return res.json()
}

export async function listLeads(): Promise<LeadOut[]> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/leads`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error('Failed to fetch leads')
  return res.json()
}

export async function markReachedOut(id: string): Promise<LeadOut> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state: 'REACHED_OUT' }),
  })
  if (!res.ok) throw new Error('Failed to update lead')
  return res.json()
}

export async function downloadResume(id: string, filename: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/leads/${id}/resume`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to download resume')
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
