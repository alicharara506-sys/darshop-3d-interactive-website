'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { STR } from '@/i18n.js'
import { SHOP } from '@/shop-i18n.js'
import { Mascot } from './Mascot'
import { CART_ADDED, SEARCH_EMPTY } from './feedback-events'
import type { MascotLocale } from './mascot.config'

type EmptySearch = { target: HTMLElement; lang: MascotLocale; kind: 'header' | 'shop'; show: boolean }

function SearchContent({ lang, kind }: EmptySearch) {
  const copy = STR[lang].mascot
  return (
    <div className="mascot-status" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Mascot pose="head-scratch" size={kind === 'header' ? 'sm' : 'md'} lang={lang} decorative />
      <p role="status">{copy.empty}</p>
      <div className="mascot-actions">
        <a href={`/?lang=${lang}`}>{copy.home}</a>
        {kind === 'shop' && <button type="button" data-clear>{SHOP[lang].clear}</button>}
        <a href={`/shop?brand=all&lang=${lang}#catrow`}>{copy.browse}</a>
      </div>
    </div>
  )
}

export function MascotFeedback() {
  const [toast, setToast] = useState<{ lang: MascotLocale; id: number } | null>(null)
  const [search, setSearch] = useState<Partial<Record<EmptySearch['kind'], EmptySearch>>>({})

  useEffect(() => {
    let timeout: number | undefined
    let sequence = 0
    const added = (event: Event) => {
      const lang = (event as CustomEvent<MascotLocale>).detail
      window.clearTimeout(timeout)
      setToast({ lang, id: ++sequence })
      timeout = window.setTimeout(() => setToast(null), 2500)
    }
    const empty = (event: Event) => {
      const detail = (event as CustomEvent<EmptySearch>).detail
      setSearch(current => {
        const displayed = current[detail.kind]
        if (!detail.show && !displayed) return current
        if (detail.show && displayed?.target === detail.target && displayed.lang === detail.lang) return current
        return { ...current, [detail.kind]: detail.show ? detail : undefined }
      })
    }
    document.addEventListener(CART_ADDED, added)
    document.addEventListener(SEARCH_EMPTY, empty)
    return () => {
      document.removeEventListener(CART_ADDED, added)
      document.removeEventListener(SEARCH_EMPTY, empty)
      window.clearTimeout(timeout)
    }
  }, [])

  return (
    <>
      <div className="mascot-toast" role="status" aria-live="polite" aria-atomic="true"
        lang={toast?.lang} dir={toast?.lang === 'ar' ? 'rtl' : 'ltr'}>
        {toast && <div className="mascot-toast-card" key={toast.id}>
          <Mascot pose="thumbs-up" size="sm" lang={toast.lang} decorative />
          <p>{STR[toast.lang].mascot.added}</p>
        </div>}
      </div>
      {Object.values(search).map(slot => slot?.target.isConnected && createPortal(<SearchContent {...slot} />, slot.target, slot.kind))}
    </>
  )
}
