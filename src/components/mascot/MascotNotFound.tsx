'use client'

import { useSyncExternalStore } from 'react'
import { STR } from '@/i18n.js'
import { Mascot } from './Mascot'

const subscribe = () => () => {}
const serverLanguage = () => 'en' as const

export function MascotNotFound() {
  const lang = useSyncExternalStore(subscribe, () => {
    const value = new URLSearchParams(window.location.search).get('lang')
    return value === 'ar' || value === 'fr' ? value : 'en'
  }, serverLanguage)
  const copy = STR[lang].mascot

  return (
    <main className="mascot-missing" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mascot-status">
        <Mascot pose="head-scratch" size="lg" lang={lang} decorative priority />
        <h1>{copy.missing}</h1>
        <nav className="mascot-actions" aria-label={copy.browse}>
          <a href={`/?lang=${lang}`}>{copy.home}</a>
          <a href={`/shop?brand=all&lang=${lang}#catrow`}>{copy.browse}</a>
        </nav>
      </div>
    </main>
  )
}
