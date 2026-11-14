'use client'

import { useEffect, useRef, useState } from 'react'
import { mountHeader } from '@/site-nav.js'
import { mountFooter } from '@/site-footer.js'
import { STR } from '@/i18n.js'
import type { MascotLocale } from '@/components/mascot/mascot.config'
import { ExpertModel } from './ExpertModel'
import './landing.css'

const jobs = [
  { id: 'building-materials', filter: {cat: 'construction'} },
  { id: 'electrical', filter: {cat: 'measure', q: 'test'} },
  { id: 'plumbing', filter: {cat: 'hand', q: 'drain'} },
  { id: 'paint', filter: {cat: 'hand', q: 'paint'} },
] as const

type Job = (typeof jobs)[number]

export function HomeClient({ initialLang }: { initialLang: MascotLocale }) {
  const headerElement = useRef<HTMLElement>(null)
  const footerElement = useRef<HTMLElement>(null)
  const header = useRef<ReturnType<typeof mountHeader> | null>(null)
  const [lang, setLang] = useState(initialLang)
  const [job, setJob] = useState<Job | null>(null)
  const copy = STR[lang].landing

  useEffect(() => {
    if (!headerElement.current || header.current) return
    header.current = mountHeader(headerElement.current, {
      lang: initialLang,
      current: 'home',
      onLang: (next: MascotLocale) => {
        const url = new URL(window.location.href)
        url.searchParams.set('lang', next)
        window.history.replaceState(null, '', url)
        setLang(next)
      },
    })
  }, [initialLang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    header.current?.setLang(lang)
    if (footerElement.current) mountFooter(footerElement.current, lang, { cta: false })
  }, [lang])

  return (
    <div className="dar-landing" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header ref={headerElement} className="h" />
      <main>
        <section className="dar-landing-hero" aria-labelledby="dar-landing-title">
          <div className="dar-landing-copy">
            <h1 id="dar-landing-title">{copy.title}</h1>
            <p>{copy.intro}</p>
            <a className="dar-landing-cta" href={`/shop?brand=all&lang=${lang}`}>
              {copy.shop}<span className="dar-landing-arrow" aria-hidden="true">→</span>
            </a>
          </div>
          <ExpertModel lang={lang} />
        </section>
        <section className="dar-landing-jobs" aria-labelledby="dar-jobs-title">
          <h2 id="dar-jobs-title">{copy.jobs}</h2>
          <div className="dar-landing-grid" role="group" aria-labelledby="dar-jobs-title">
            {jobs.map(item => (
              <button type="button" key={item.id} onClick={() => setJob(item)}
                aria-pressed={item === job} aria-controls="dar-job-details">
                <img src={`/mascot/job-${item.id}.webp`} alt="" width={384} height={196} loading="lazy" />
                <span>{copy.trades[item.id][0]}</span>
              </button>
            ))}
          </div>
          <div aria-live="polite" id="dar-job-details">
            {job && (
              <div className="dar-landing-job-details">
                <p>{copy.trades[job.id][1]}</p>
                <a href={`/shop?${new URLSearchParams({ brand: 'all', lang, ...job.filter })}#catrow`}>
                  {copy.view}<span className="dar-landing-arrow" aria-hidden="true"> →</span>
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer ref={footerElement} />
    </div>
  )
}
