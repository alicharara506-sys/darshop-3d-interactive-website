'use client'

import { useEffect } from 'react'

import '@/site-nav.css'
import '@/shop.css'

// The shop's markup. shop.js fills it in once the page is in the browser.
export function ShopClient() {
  useEffect(() => {
    import('@/shop.js')
  }, [])

  return (
    <>
      <header className="h" id="head" />

      <section className="sh-hero" id="hero">
        <div className="sh-dots" aria-hidden="true" />
        <div className="sh-hero-in" id="heroText" />
      </section>

      <section className="sh-bar" id="catrow" aria-label="Categories" />

      <main className="sh-main">
        <div className="s-tools" id="tools" />
        <ul className="sh-grid" id="grid" />
      </main>

      <footer className="s-foot" id="foot" />

      <div className="s-dim" id="dim" />
      <aside className="s-drawer" id="drawer" aria-modal="true" role="dialog" />
      <div className="s-modal" id="modal" aria-modal="true" role="dialog" />
    </>
  )
}
