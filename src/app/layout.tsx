import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'DAR Building Materials Shop · Beirut',
  robots: { index: false },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

const FONTS =
  'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&family=Cairo:wght@400;500;600;700&display=swap'

// Sets the language and reading direction before the first paint, so Arabic never flashes
// left to right. The 3D scene draws text with these font names, so they load by name.
const SET_LANG = `(function(){var l=new URLSearchParams(location.search).get('lang');if(l==='fr'||l==='ar'){document.documentElement.lang=l;if(l==='ar')document.documentElement.dir='rtl'}})()`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SET_LANG }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  )
}
