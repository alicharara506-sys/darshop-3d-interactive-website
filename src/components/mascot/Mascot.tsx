'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { MascotBubble, type BubblePosition } from './MascotBubble'
import { MASCOT_POSES, type MascotLocale, type MascotPose, type MascotVideoSources } from './mascot.config'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const FADE_MS = 190

function watchMotion(notify: () => void) {
  const media = window.matchMedia(REDUCED_MOTION)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}

function MascotVideo({ sources }: { sources: MascotVideoSources }) {
  const frame = useRef<HTMLSpanElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!frame.current) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      setLoaded(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setLoaded(true)
    }, { threshold: 0.1 })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const player = video.current
    if (!player) return
    const update = () => {
      if (inView && !document.hidden) void player.play().catch(() => setPlaying(false))
      else player.pause()
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      player.pause()
    }
  }, [inView, loaded])

  return (
    <span ref={frame} className="mascot-video" aria-hidden="true">
      {loaded && (
        <video ref={video} muted loop playsInline autoPlay={inView && !document.hidden} preload="none"
          poster={MASCOT_POSES.idle.src} data-playing={playing}
          onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)}>
          {sources.map(({ src, type }) => <source key={src} src={src} type={type} />)}
        </video>
      )}
    </span>
  )
}

export type MascotProps = {
  pose: MascotPose
  lang?: MascotLocale
  size?: 'sm' | 'md' | 'lg' | 'responsive'
  animated?: boolean
  videoSources?: MascotVideoSources
  bubble?: ReactNode
  bubblePosition?: BubblePosition
  flip?: boolean
  priority?: boolean
  decorative?: boolean
  className?: string
}

export function Mascot({ pose, lang, size = 'responsive', animated = false, videoSources,
  bubble, bubblePosition = 'end', flip = pose === 'point', priority = false, decorative = false, className }: MascotProps) {
  const reduced = useSyncExternalStore(watchMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true)
  const [current, setCurrent] = useState(pose)
  const [previous, setPrevious] = useState<MascotPose | null>(null)
  if (current !== pose) {
    setCurrent(pose)
    setPrevious(current)
  }

  useEffect(() => {
    if (!previous) return
    const timer = window.setTimeout(() => setPrevious(null), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [pose, previous])

  const asset = MASCOT_POSES[pose]
  const outgoing = !reduced && previous ? MASCOT_POSES[previous] : null

  return (
    <div className={className ? `mascot ${className}` : 'mascot'} lang={lang} dir={lang ? (lang === 'ar' ? 'rtl' : 'ltr') : undefined}
      data-size={size} data-bubble={bubblePosition}>
      <div className="mascot-art" data-pose={pose} data-flip={flip}>
        {outgoing && <img key={previous} className="mascot-image mascot-leave" src={outgoing.src}
          width={outgoing.width} height={outgoing.height} alt="" aria-hidden="true" />}
        <img key={pose} className={outgoing ? 'mascot-image mascot-enter' : 'mascot-image'} src={asset.src}
          width={asset.width} height={asset.height} alt={bubble || decorative ? '' : asset.alt[lang ?? 'en']}
          loading={priority || outgoing ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />
        {!reduced && animated && pose === 'idle' && !!videoSources?.length && <MascotVideo sources={videoSources} />}
      </div>
      {bubble && <MascotBubble position={bubblePosition}>{bubble}</MascotBubble>}
    </div>
  )
}
