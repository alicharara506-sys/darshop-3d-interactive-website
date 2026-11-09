'use client'

import { useEffect } from 'react'

import { HeroCopy, type Lang } from './HeroCopy'
import { ShelfPanel } from './ShelfPanel'

import '@/site-nav.css'
import '@/style.css'

// The home page: main.js runs the 3D scene, the header and the later scroll stages, and
// the first stage's words are React (HeroCopy).
export function HomeClient({ lang }: { lang: Lang }) {
  useEffect(() => {
    import('@/main.js')
  }, [])

  return (
    <>
      <header className="h h-over" id="head" />
      <div id="stage">
        <div id="tip" className="tip" />
      </div>
      <section id="panel" className="panel empty" aria-live="polite" />
      <HeroCopy initialLang={lang} />
      <ShelfPanel initialLang={lang} />
      <div className="scroller" />
      <footer id="siteFoot" />
    </>
  )
}
