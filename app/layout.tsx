import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sportunity',
  description: 'Trouve des terrains, rejoins des événements sportifs et connecte avec des partenaires près de chez toi.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22c55e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 font-sans">
        {children}
      </body>
    </html>
  )
}
