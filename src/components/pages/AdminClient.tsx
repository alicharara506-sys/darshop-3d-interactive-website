'use client'

import { useEffect } from 'react'

import '@/admin.css'

// The admin panel. admin.js builds it once the page is in the browser.
export function AdminClient() {
  useEffect(() => {
    import('@/admin.js')
  }, [])

  return (
    <>
      <div id="app" />
      <div id="toast" className="a-toast" role="status" aria-live="polite" />
    </>
  )
}
