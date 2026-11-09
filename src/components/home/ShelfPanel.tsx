'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { type CSSProperties, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'

import { getHeroState, heroActions, subscribeHero } from '@/home-bridge.js'
import { STR } from '@/i18n.js'
import { JOBS } from '@/shelf-jobs.js'

import { HeroBackdrop, type Lang, Word, step } from './HeroCopy'

type ShelfTool = { id: string; brand: 'total' | 'jadever'; name?: string; product: { id: string; name: string; price: number } | null }
type Sel = { bay: number; job: string | null }

const EASE = [0.23, 1, 0.32, 1] as const
const SERVER_STATE = { lang: null, stage: 0, shelfTools: [] }
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })

// The controls beside the shelf, once the page has scrolled to it: brand tabs (with a pill
// that glides between them) light up one bay; job chips light up the tools for a job across
// both brands, and a kit card adds them up with one button to order them all. Nothing here
// depends on scrolling. main.js lights the shelf to match (heroActions.shelf).
export function ShelfPanel({ initialLang }: { initialLang: Lang }) {
  const state = useSyncExternalStore(subscribeHero, getHeroState, () => SERVER_STATE)
  const lang = (state.lang ?? initialLang) as Lang
  const visible = state.stage === 1
  const copy = STR[lang]
  const t = copy.shelf
  const [sel, setSel] = useState<Sel>({ bay: -1, job: null })
  const [added, setAdded] = useState(false)
  // Each arrival at the shelf plays the entrance again
  const [plays, setPlays] = useState(0)
  const [wasVisible, setWasVisible] = useState(visible)
  if (wasVisible !== visible) {
    setWasVisible(visible)
    if (visible) setPlays(plays + 1)
  }

  useEffect(() => {
    heroActions.shelf(sel)
    setAdded(false)
  }, [sel])
  // main.js sizes the phone layout from this panel's height
  useLayoutEffect(() => {
    dispatchEvent(new Event('resize'))
  }, [lang])

  const tabs = [
    { bay: -1, label: t.all },
    { bay: 0, label: 'TOTAL', brand: true },
    { bay: 1, label: 'Jadever', brand: true },
    { bay: 2, label: copy.soon },
  ]
  const job = sel.job ? JOBS.find((j) => j.key === sel.job) : null
  const kit = job ? (state.shelfTools as ShelfTool[]).filter((tool) => job.tools.includes(tool.id)) : []
  const priced = kit.filter((tool) => tool.product)
  const total = priced.reduce((sum, tool) => sum + (tool.product?.price ?? 0), 0)
  const names = copy.tools as Record<string, string>
  const jobs = t.jobs as Record<string, string>
  const view = sel.job ? `job-${sel.job}` : `bay-${sel.bay}`
  const titleWords = t.title.split(' ')
  const after = 4 + titleWords.length

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        inert={!visible}
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 24 }}
        transition={{ duration: visible ? 0.6 : 0.3, ease: EASE }}
        className="pointer-events-none"
      >
        <HeroBackdrop />
        <div
        key={`${lang}-${plays}`}
        className="pin-out pointer-events-none fixed start-[max(32px,calc((100vw-1216px)/2))] inset-y-0 z-[5] flex w-[min(31vw,430px)] items-center pt-[var(--h-h)] tall:start-0 tall:end-0 tall:top-auto tall:bottom-0 tall:h-[var(--ph,auto)] tall:w-auto tall:items-start tall:border-t tall:border-[#dadbdd] tall:bg-[#f4f4f5] tall:pt-0 squat:start-[4vw] squat:w-[42vw]"
      >
        <div id="shelfPanel" className="pointer-events-auto w-full tall:px-[18px] tall:pt-3.5 tall:pb-[calc(14px+env(safe-area-inset-bottom))]">
          <p className="hero-up m-0 inline-flex items-center gap-2.5 rounded-full bg-white/70 py-1.5 ps-3 pe-3.5 shadow-[inset_0_0_0_1px_rgba(21,23,26,.06)] tall:hidden squat:hidden" style={step(0)}>
            <span aria-hidden="true" className="relative flex size-2">
              <span className="hero-ping absolute inset-0 rounded-full bg-brand" />
              <span className="relative size-2 rounded-full bg-brand" />
            </span>
            <span className="hero-type text-[11.5px] font-bold tracking-[.13em] text-brand-deep uppercase rtl:text-sm rtl:tracking-normal rtl:normal-case" style={step(1)}>{t.kicker}</span>
          </p>
          <h2 aria-label={t.title} className="m-0 mt-4 text-[clamp(30px,3.1vw,46px)] leading-[1.06] font-extrabold tracking-[-.025em] text-ink rtl:leading-[1.3] rtl:tracking-normal tall:mt-0 tall:text-[22px] squat:mt-1 squat:text-[24px]">
            {titleWords.map((word, i) => (
              <span key={i} aria-hidden="true">
                <Word text={word} index={2 + i} highlight={i === titleWords.length - 1} />{' '}
              </span>
            ))}
          </h2>
          <ScanCode start={2 + titleWords.length} />

          {/* Brand tabs */}
          <p className="hero-up m-0 mt-6 text-xs font-semibold text-steel tall:hidden squat:mt-3" style={step(after)}>{t.byBrand}</p>
          <div role="tablist" className="hero-up mt-2 inline-flex max-w-full rounded-full bg-white/60 p-1 shadow-[inset_0_0_0_1px_rgba(21,23,26,.08)] backdrop-blur-sm tall:mt-3 tall:flex tall:w-full" style={step(after + 1)}>
            {tabs.map((tab) => {
              const on = !sel.job && sel.bay === tab.bay
              return (
                <button
                  key={tab.bay}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSel({ bay: tab.bay, job: null })}
                  className={`relative h-9 flex-none cursor-pointer rounded-full border-0 bg-transparent px-3.5 text-[13px] tall:flex-1 tall:px-2 font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand tall:h-8 tall:text-xs ${on ? 'text-white' : 'text-steel hover:text-ink'}`}
                >
                  {on && <motion.span layoutId="shelf-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-ink shadow-[0_6px_16px_-8px_rgba(21,23,26,.6)]" />}
                  <span dir={tab.brand ? 'ltr' : undefined} className={`relative ${tab.brand ? 'italic' : ''}`}>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Job chips */}
          <p className="hero-up m-0 mt-5 text-xs font-semibold text-steel tall:mt-3 tall:hidden squat:mt-3" style={step(after + 2)}>{t.byJob}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 tall:flex-nowrap tall:overflow-x-auto tall:pb-0.5">
            {JOBS.map(({ key }, i) => {
              const on = sel.job === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  style={step(after + 2.5 + i * 0.5)}
                  onClick={() => setSel(on ? { bay: -1, job: null } : { bay: -1, job: key })}
                  className={`hero-up h-8 flex-none cursor-pointer rounded-full border-0 px-3.5 text-[12.5px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    on
                      ? 'bg-brand text-white shadow-[0_8px_18px_-8px_rgba(255,90,31,.9)]'
                      : 'bg-white/80 text-ink shadow-[inset_0_0_0_1px_rgba(21,23,26,.1)] hover:shadow-[inset_0_0_0_1px_rgba(255,90,31,.5)]'
                  }`}
                >
                  {jobs[key]}
                </button>
              )
            })}
          </div>

          {/* What the choice shows: a brand's story and shop link, or the job's kit */}
          <div className="hero-up mt-5 min-h-[178px] tall:mt-3 tall:min-h-0 squat:mt-3 squat:min-h-0" style={step(after + 5.5) as CSSProperties}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {job ? (
                  <div className="overflow-hidden rounded-2xl bg-white/80 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8),0_0_0_1px_rgba(21,23,26,.06),0_22px_44px_-22px_rgba(21,23,26,.45)] backdrop-blur-xl tall:flex tall:items-center tall:gap-3 tall:p-3">
                    <div className="flex items-baseline justify-between gap-3 tall:min-w-0 tall:flex-1 tall:flex-col tall:items-start tall:gap-0">
                      <p className="m-0 text-[15px] font-bold text-ink tall:truncate tall:text-sm">{t.kit.replace('{job}', jobs[job.key].toLowerCase())}</p>
                      <p className="m-0 text-xs font-semibold whitespace-nowrap text-steel">{t.count(kit.length)}</p>
                    </div>
                    <ul className="m-0 mt-2.5 list-none space-y-1 p-0 tall:hidden">
                      {kit.map((tool) => (
                        <li key={tool.id} className="flex items-center justify-between gap-3 text-[13px] text-ink">
                          <span className="flex min-w-0 items-center gap-2">
                            <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${tool.brand === 'total' ? 'bg-total' : 'bg-jadever'}`} />
                            <span className="truncate">{names[tool.id] ?? tool.product?.name ?? tool.name}</span>
                          </span>
                          <span dir="ltr" className={`flex-none text-[12.5px] font-semibold ${tool.product ? 'text-ink' : 'text-steel'}`}>
                            {tool.product ? `$${money(tool.product.price)}` : t.inStore}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-ink/8 pt-3 tall:mt-0 tall:flex-none tall:border-0 tall:pt-0">
                      <p dir="ltr" className="m-0 text-xl font-extrabold text-ink tabular-nums tall:hidden">${money(total)}</p>
                      <button
                        type="button"
                        disabled={!priced.length}
                        onClick={() => {
                          heroActions.addToOrder(priced.map((tool) => tool.product!.id))
                          setAdded(true)
                        }}
                        className={`h-10 cursor-pointer rounded-full border-0 px-4 text-[13px] font-bold whitespace-nowrap text-white transition-[background-color,transform] duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-50 ${added ? 'bg-jadever' : 'bg-linear-to-b from-[#ff6a33] to-brand-deep shadow-[0_10px_22px_-10px_rgba(255,90,31,.9)]'}`}
                      >
                        {added ? `✓ ${t.added}` : t.addKit}
                      </button>
                    </div>
                  </div>
                ) : (
                  <BrandStory lang={lang} bay={sel.bay} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}

// A brand's line and its shop link; for "All", the shelf's own line
function BrandStory({ lang, bay }: { lang: Lang; bay: number }) {
  const copy = STR[lang]
  const stage = bay >= 0 ? copy.stages[bay + 1] : null
  const brand = bay === 0 ? 'total' : bay === 1 ? 'jadever' : bay === -1 ? 'all' : null
  return (
    <div>
      <p className="m-0 max-w-[40ch] text-base leading-[1.6] text-steel tall:text-sm tall:leading-[1.45]">{stage ? stage.b : copy.shelf.allBody}</p>
      {brand && (
        <a
          href={`/shop?brand=${brand}&lang=${lang}`}
          className="mt-4 inline-flex h-11 items-center rounded-full bg-linear-to-b from-[#ff6a33] to-brand-deep px-5 text-sm font-bold text-white no-underline shadow-[0_12px_26px_-12px_rgba(255,90,31,.9)] transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand tall:mt-2.5 tall:h-9 tall:text-[13px]"
        >
          {bay >= 0 ? copy.shopBtn.replace('{b}', stage!.t) : `${copy.hero.shop} →`}
        </a>
      )}
    </div>
  )
}

// A product barcode under the title: its bars print in from left to right, then a scanner's
// red laser sweeps back and forth across it, like at the shop's till.
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 1, 3, 2, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 1, 3, 1]
function ScanCode({ start }: { start: number }) {
  return (
    <div aria-hidden="true" className="relative mt-5 flex h-9 w-fit items-end tall:hidden squat:hidden">
      <div className="relative flex h-full items-stretch gap-[2px]">
        {BARS.map((w, i) => (
          <span key={i} className="hero-bar block rounded-[1px] bg-ink" style={{ width: w * 1.5, opacity: i % 7 === 3 ? 0.55 : 0.9, '--i': start + i * 0.12 } as CSSProperties} />
        ))}
        <span className="hero-laser absolute -inset-y-1 w-[2px] rounded-full bg-[#ff2a2a] shadow-[0_0_10px_2px_rgba(255,42,42,.65)]" style={{ animationDelay: `${(start + BARS.length * 0.12) * 70}ms` }} />
      </div>
    </div>
  )
}
