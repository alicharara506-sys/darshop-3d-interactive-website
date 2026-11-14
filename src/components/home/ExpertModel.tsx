'use client'

import { useEffect, useRef, useState } from 'react'
import { STR } from '@/i18n.js'
import { MASCOT_POSES, type MascotLocale } from '@/components/mascot/mascot.config'

export function ExpertModel({ lang }: { lang: MascotLocale }) {
  const stage = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const turn = useRef<((side: boolean) => void) | null>(null)
  const [ready, setReady] = useState(false)
  const [side, setSide] = useState(false)
  const copy = STR[lang].landing

  useEffect(() => {
    const stageElement = stage.current
    const viewportElement = viewport.current
    if (!stageElement || !viewportElement) return

    const start = new AbortController()
    let cleanup: (() => void) | undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void import('./expert-scene.js')
        .then(async ({ mountExpert }) => {
          if (start.signal.aborted) return
          const scene = await mountExpert(stageElement, viewportElement, start.signal, () => {
            setReady(false)
            setSide(false)
          })
          if (start.signal.aborted) { scene?.dispose(); return }
          if (!scene) return
          turn.current = scene.turn
          cleanup = scene.dispose
          setReady(true)
        }).catch(() => {
          if (!start.signal.aborted) setReady(false)
        })
    })
    observer.observe(stageElement)

    return () => {
      observer.disconnect()
      start.abort()
      turn.current = null
      cleanup?.()
    }
  }, [])

  return (
    <figure ref={stage} className="dar-expert-stage" aria-label={copy.expert} data-model-ready={ready}>
      {!ready && <img className="dar-expert-poster" src={MASCOT_POSES.idle.src}
        alt={MASCOT_POSES.idle.alt[lang]} width={520} height={800} fetchPriority="high" />}
      <div ref={viewport} className="dar-expert-canvas" aria-hidden="true" />
      {ready && (
        <button type="button" data-expert-angle aria-pressed={side} onClick={() => {
          turn.current?.(!side)
          setSide(!side)
        }}>{side ? copy.front : copy.side}</button>
      )}
    </figure>
  )
}
