import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alma Lead Management',
  description: 'Immigration lead intake and management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        {children}
      </body>
    </html>
  )
}
