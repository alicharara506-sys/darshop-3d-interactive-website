'use client'

import {
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react'
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react'

import { getHeroState, heroActions, subscribeHero } from '@/home-bridge.js'
import { STR } from '@/i18n.js'

import { HeroBuildCard } from './HeroBuildCard'

export type Lang = 'en' | 'fr' | 'ar'

const SERVER_STATE = { lang: null, stage: 0, build: null, spotOn: true }
export const step = (i: number) => ({ '--i': i }) as CSSProperties

// One word of the headline rises from behind its own mask. Words are never split into
// letters, because Arabic letters must stay joined.
export function Word({ text, index, highlight }: { text: string; index: number; highlight: boolean }) {
  return (
    <span className="-my-[.14em] inline-block overflow-hidden py-[.14em] pe-[.05em] align-bottom rtl:-my-[.3em] rtl:py-[.3em]">
      <span className="hero-word inline-block" style={step(index)}>
        {highlight ? <span className="hero-flow inline-block pe-[.04em]">{text}</span> : text}
      </span>
    </span>
  )
}

// A tape measure under the headline: the line draws itself, the ticks drop in one by one,
// then a small marker slides along it
export function Ruler({ start }: { start: number }) {
  const ticks = Array.from({ length: 25 }, (_, i) => i)
  return (
    <div aria-hidden="true" className="relative mt-5 h-3 w-full max-w-[360px] tall:hidden squat:hidden">
      <div className="hero-line absolute inset-x-0 top-0 h-[2px] rounded-full bg-linear-to-r from-brand to-brand-soft rtl:bg-linear-to-l" style={step(start)} />
      <div className="absolute inset-x-0 top-[2px] flex justify-between">
        {ticks.map((i) => (
          <span
            key={i}
            className={`hero-tick block w-px ${i % 4 === 0 ? 'h-[9px] bg-brand' : 'h-[5px] bg-ink/25'}`}
            style={{ '--i': start + 3 + i * 0.28 } as CSSProperties}
          />
        ))}
      </div>
      <span className="hero-glide absolute -top-[3px] size-2 rounded-full bg-brand shadow-[0_0_0_3px_rgba(255,90,31,.2)]" />
    </div>
  )
}

// Hero call to action: on hover it glows and a soft spotlight follows the cursor, the arrow
// slides through, and it presses in on click. The primary one also has a glossy sheen and a
// slow streak of light across it.
function HeroButton({ href, primary, children }: { href: string; primary?: boolean; children: ReactNode }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const spotlight = useMotionTemplate`radial-gradient(130px circle at ${x}px ${y}px, ${primary ? 'rgba(255,255,255,.38)' : 'rgba(255,90,31,.14)'}, transparent 70%)`
  const follow = (event: PointerEvent<HTMLAnchorElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    x.set(event.clientX - box.left)
    y.set(event.clientY - box.top)
  }

  return (
    <motion.a
      href={href}
      onPointerMove={follow}
      whileTap={{ scale: 0.97 }}
      className={`group/cta pointer-events-auto relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full px-6 text-[15px] font-bold whitespace-nowrap no-underline transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand tall:h-11 tall:min-w-0 tall:flex-1 tall:justify-center tall:gap-1.5 tall:px-3 tall:text-[13px] squat:h-10 squat:px-4 squat:text-[13px] ${
        primary
          ? 'bg-linear-to-b from-[#ff6a33] to-brand-deep text-white shadow-[0_14px_30px_-12px_rgba(255,90,31,.85),inset_0_1px_0_rgba(255,255,255,.35)] hover:shadow-[0_18px_40px_-10px_rgba(255,90,31,.95),inset_0_1px_0_rgba(255,255,255,.35)]'
          : 'bg-white/65 text-ink shadow-[inset_0_0_0_1px_rgba(21,23,26,.1)] hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(255,90,31,.45),0_12px_26px_-14px_rgba(255,90,31,.6)]'
      }`}
    >
      {primary && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/18 to-transparent" />
          <span aria-hidden="true" className="hero-streak pointer-events-none absolute inset-y-0 start-0 w-1/4 bg-linear-to-r from-transparent via-white/40 to-transparent" />
        </>
      )}
      <motion.span aria-hidden="true" style={{ background: spotlight }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100" />
      <span className="relative">{children}</span>
      <span aria-hidden="true" className={`relative inline-block h-[1.2em] w-[1.1em] overflow-hidden rtl:-scale-x-100 ${primary ? '' : 'tall:hidden'}`}>
        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] group-hover/cta:translate-x-[130%]">→</span>
        <span className="absolute inset-0 -translate-x-[130%] transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] group-hover/cta:translate-x-0">→</span>
      </span>
    </motion.a>
  )
}

// A partner's name, calm grey until it is hovered or focused: then its brand colour fades in
// with a light sweeping through the letters, and a line in that colour draws under it
function PartnerName({ href, name, brand, color, step: order }: { href: string; name: string; brand: string; color: string; step: number }) {
  return (
    <a
      href={href}
      dir="ltr"
      onPointerEnter={() => heroActions.focus(brand)}
      onPointerLeave={() => heroActions.focus(null)}
      onFocus={() => heroActions.focus(brand)}
      onBlur={() => heroActions.focus(null)}
      style={{ ...step(order), '--brand': color } as CSSProperties}
      className="hero-up group/name pointer-events-auto relative inline-block py-1 text-[17px] leading-none font-extrabold text-steel italic no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand tall:text-[15px] squat:text-sm"
    >
      {name}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-0 bg-[linear-gradient(110deg,var(--brand)_42%,#fff_50%,var(--brand)_58%)] bg-size-[260%_100%] bg-position-[100%_0] bg-clip-text text-transparent opacity-0 transition-[opacity,background-position] duration-700 ease-out group-hover/name:bg-position-[0%_0] group-hover/name:opacity-100 group-focus-visible/name:bg-position-[0%_0] group-focus-visible/name:opacity-100"
      >
        {name}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-(--brand) transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] group-hover/name:scale-x-100 group-focus-visible/name:scale-x-100"
      />
    </a>
  )
}

// Behind the words: a soft orange glow that breathes, and a faint blueprint grid whose dots
// light up in orange around the cursor. It fades out before it reaches the 3D tools.
export function HeroBackdrop() {
  const reduced = useReducedMotion()
  const x = useSpring(-400, { stiffness: 120, damping: 24 })
  const y = useSpring(-400, { stiffness: 120, damping: 24 })
  const mask = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, #000, transparent 75%)`

  useEffect(() => {
    if (reduced || !matchMedia('(pointer: fine)').matches) return
    const move = (event: globalThis.PointerEvent) => {
      x.set(event.clientX)
      y.set(event.clientY)
    }
    addEventListener('pointermove', move, { passive: true })
    return () => removeEventListener('pointermove', move)
  }, [reduced, x, y])

  const dots = (color: string) => ({
    backgroundImage: `radial-gradient(${color} 1.3px, transparent 1.3px)`,
    backgroundSize: '26px 26px',
  })

  return (
    <div aria-hidden="true" className="pin-out pointer-events-none fixed inset-0 overflow-hidden tall:hidden">
      <div className="absolute inset-0 [mask-image:linear-gradient(to_right,#000_22%,transparent_50%)] rtl:[mask-image:linear-gradient(to_left,#000_22%,transparent_50%)]">
        <div className="hero-breathe absolute top-[12%] -left-[10%] h-[80vh] w-[56vw] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,51,.2),transparent)] rtl:right-[-10%] rtl:left-auto" />
        <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(90%_70%_at_20%_50%,#000,transparent)] rtl:[mask-image:radial-gradient(90%_70%_at_80%_50%,#000,transparent)]" style={dots('rgba(21,23,26,.1)')} />
        <motion.div className="absolute inset-0" style={{ ...dots('rgba(255,90,31,.85)'), maskImage: mask, WebkitMaskImage: mask }} />
      </div>
    </div>
  )
}

// The words of the home hero, beside the 3D tools. Everything enters in sequence: the
// kicker types in beside a live dot, the headline's words rise from behind masks with its
// key word in a flowing orange, a tape measure draws itself, then the line of text, the
// buttons and a quiet line naming the official partners follow.
export function HeroCopy({ initialLang }: { initialLang: Lang }) {
  const state = useSyncExternalStore(subscribeHero, getHeroState, () => SERVER_STATE)
  const lang = (state.lang ?? initialLang) as Lang
  const visible = state.stage === 0
  const copy = STR[lang]
  const hero = copy.hero
  const intro = copy.stages[0]

  // Coming back up to this stage plays the entrance again, a little quicker
  const [plays, setPlays] = useState(0)
  const [wasVisible, setWasVisible] = useState(visible)
  if (wasVisible !== visible) {
    setWasVisible(visible)
    if (visible) setPlays(plays + 1)
  }

  // A new language changes the height of the text, and main.js sizes the phone layout from it
  useLayoutEffect(() => {
    dispatchEvent(new Event('resize'))
  }, [lang])

  const words = hero.lines.flat().length
  let wordIndex = 2
  const after = 2 + words
  const shopFor = (brand: string) => `/shop?brand=${brand}&lang=${lang}`

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        inert={!visible}
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -12 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="pointer-events-none"
      >
        <HeroBackdrop />
        <HeroBuildCard build={state.build} lang={lang} show={state.spotOn} />
        <div
          key={`${lang}-${plays}`}
          style={{ '--hero-step': plays ? '32ms' : '70ms' } as CSSProperties}
          className="pin-out fixed start-[max(32px,calc((100vw-1216px)/2))] inset-y-0 z-[5] flex w-[min(38vw,540px)] items-center pt-[var(--h-h)] tall:start-0 tall:end-0 tall:top-auto tall:bottom-0 tall:h-[var(--ph,auto)] tall:w-auto tall:items-start tall:border-t tall:border-[#dadbdd] tall:bg-[#f4f4f5] tall:pt-0 squat:start-[4vw] squat:w-[40vw]"
        >
          <div id="heroCopy" className="w-full tall:px-[22px] tall:pt-[18px] tall:pb-[calc(18px+env(safe-area-inset-bottom))]">
            <p className="hero-up m-0 mb-5 inline-flex items-center gap-2.5 rounded-full bg-white/70 py-1.5 ps-3 pe-3.5 shadow-[inset_0_0_0_1px_rgba(21,23,26,.06)] tall:mb-2.5 squat:mb-2 squat:py-1" style={step(0)}>
              <span aria-hidden="true" className="relative flex size-2">
                <span className="hero-ping absolute inset-0 rounded-full bg-brand" />
                <span className="relative size-2 rounded-full bg-brand" />
              </span>
              <span className="hero-type text-[11.5px] font-bold tracking-[.13em] text-brand-deep uppercase rtl:text-sm rtl:tracking-normal rtl:normal-case tall:text-[10px] tall:tracking-[.05em] squat:text-[10px]" style={step(1)}>
                {intro.k}
              </span>
            </p>

            <h1 aria-label={intro.t} className="m-0 text-[clamp(38px,4.7vw,74px)] leading-[1.03] font-extrabold tracking-[-.03em] text-ink ltr:[&:lang(fr)]:text-[clamp(32px,3.9vw,60px)] rtl:text-[clamp(44px,5.4vw,84px)] rtl:leading-[1.3] rtl:tracking-normal tall:text-[clamp(26px,8.1vw,34px)] rtl:tall:text-[34px] ltr:tall:[&:lang(fr)]:text-[clamp(24px,7.2vw,28px)] squat:text-[28px] rtl:squat:text-[30px] ltr:squat:[&:lang(fr)]:text-[24px]">
              {hero.lines.map((line: string[], l: number) => (
                <span key={l} aria-hidden="true" className="block tall:inline">
                  {line.map((word) => {
                    const index = wordIndex++
                    return (
                      <span key={word}>
                        <Word text={word} index={index} highlight={word === hero.highlight} />{' '}
                      </span>
                    )
                  })}
                </span>
              ))}
            </h1>

            <Ruler start={after} />

            <p className="hero-up m-0 mt-5 max-w-[42ch] text-[17px] leading-[1.6] text-steel tall:mt-2 tall:max-w-none tall:text-[14.5px] tall:leading-[1.5] squat:mt-2 squat:text-[13px] squat:leading-[1.45]" style={step(after + 3)}>
              {intro.b}
            </p>

            <div className="hero-up mt-6 flex flex-wrap items-center gap-3 tall:mt-3.5 tall:flex-nowrap tall:gap-2 squat:mt-3" style={step(after + 4)}>
              <HeroButton primary href={`/shop?brand=all&lang=${lang}`}>{hero.shop}</HeroButton>
              <HeroButton href={`/contact?lang=${lang}`}>{hero.visit}</HeroButton>
            </div>

            <div className="mt-9 flex items-center gap-4 tall:mt-3 tall:flex-wrap tall:gap-x-3 tall:gap-y-1 squat:mt-3 [@media(max-height:680px)]:mt-6">
              <p className="hero-up m-0 text-[11px] font-semibold tracking-[.12em] whitespace-nowrap text-steel/80 uppercase rtl:text-[13px] rtl:tracking-normal tall:text-[10px] tall:tracking-[.08em] squat:text-[10px]" style={step(after + 5)}>
                {hero.partnerOf}
              </p>
              <span aria-hidden="true" className="hero-up h-5 w-px bg-ink/15" style={step(after + 5.5)} />
              <div className="flex items-center gap-5 tall:gap-4">
                <PartnerName href={shopFor('total')} name="TOTAL" brand="total" color="var(--color-total)" step={after + 6} />
                <PartnerName href={shopFor('jadever')} name="Jadever" brand="jadever" color="var(--color-jadever)" step={after + 6.5} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
