'use client'

import { useEffect } from 'react'

import '@/site-nav.css'
import '@/shop.css'
import '@/page.css'

// About, FAQ, Support and Contact. page.js fills them in once the page is in the browser.
export function InfoClient({ page }: { page: 'about' | 'faq' | 'support' | 'contact' }) {
  useEffect(() => {
    import('@/page.js')
  }, [])

  return (
    <>
      <header className="h" id="head" />
      <main id="main" data-page={page} />
      <footer className="s-foot" id="foot" />
    </>
  )
}
