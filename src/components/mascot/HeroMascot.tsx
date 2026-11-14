'use client'

import { useEffect, useRef, useState } from 'react'
import { STR } from '@/i18n.js'
import { Mascot } from './Mascot'
import { MASCOT_POSES, type MascotLocale, type MascotVideoSources } from './mascot.config'

const TRADE_FILTERS = {
  tools: { cat: 'power' },
  electrical: { cat: 'measure', q: 'test' },
  plumbing: { cat: 'hand', q: 'drain' },
  'building-materials': { cat: 'construction' },
  paint: { cat: 'hand', q: 'paint' },
}
type Trade = keyof typeof TRADE_FILTERS
const TRADES = Object.keys(TRADE_FILTERS) as Trade[]

export function HeroMascot({ lang, active, videoSources }: { lang: MascotLocale; active: boolean; videoSources: MascotVideoSources }) {
  const [trade, setTrade] = useState<Trade | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const preloaded = useRef(new Set<Trade>())
  const copy = STR[lang].mascot

  useEffect(() => {
    if (!active || !matchMedia('(orientation: portrait)').matches) return
    // Keep the fixed mobile text panel aligned when a trade message wraps.
    window.dispatchEvent(new Event('resize'))
  }, [active, trade])

  function preload(pose: Trade) {
    if (preloaded.current.has(pose)) return
    preloaded.current.add(pose)
    const image = new Image()
    image.fetchPriority = 'low'
    image.src = MASCOT_POSES[pose].src
  }

  useEffect(() => {
    const warm = window.setTimeout(() => { preload('tools'); preload('electrical') }, 1200)
    return () => {
      window.clearTimeout(warm)
      window.clearTimeout(timer.current)
    }
  }, [])

  function select(pose: Trade) {
    preload(pose)
    setTrade(pose)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTrade(null), 6000)
  }

  const categoryLink = trade && `/shop?${new URLSearchParams({ brand: 'all', lang, ...TRADE_FILTERS[trade] })}#catrow`

  return (
    <div className="mascot-hero">
      <div className="mascot-categories" role="group" aria-label={copy.categories}>
        {TRADES.map(pose => (
          <button key={pose} type="button" aria-pressed={pose === trade}
            onPointerEnter={event => { if (event.pointerType === 'mouse') select(pose) }}
            onClick={() => select(pose)}>{copy.trades[pose][0]}</button>
        ))}
      </div>
      <Mascot pose={trade ?? 'idle'} lang={lang} animated={active} videoSources={videoSources} priority={!trade}
        bubble={<>
          <p aria-live="polite">{trade ? copy.trades[trade][1] : copy.greeting}</p>
          {trade && categoryLink && <a href={categoryLink} onFocus={() => window.clearTimeout(timer.current)}
            onBlur={() => select(trade)}>{copy.trades[trade][0]}</a>}
        </>} />
    </div>
  )
}
