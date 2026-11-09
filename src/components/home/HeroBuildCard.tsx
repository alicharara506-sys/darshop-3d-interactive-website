'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { heroActions } from '@/home-bridge.js'
import { STR } from '@/i18n.js'

import type { Lang } from './HeroCopy'

type BuildTool = {
  id: string
  brand: 'total' | 'jadever'
  name?: string
  shop: { q?: string; cat?: string; open?: string }
}
type Build = {
  stage: number
  total: number
  key: string
  seconds: number
  tools: BuildTool[]
}

const EASE = [0.23, 1, 0.32, 1] as const

function shopLink(tool: BuildTool, lang: Lang) {
  const { q, cat, open } = tool.shop
  const query = new URLSearchParams({ brand: open ? 'all' : tool.brand, lang })
  if (q) query.set('q', q)
  if (cat) query.set('cat', cat)
  if (open) query.set('open', open)
  return `/shop?${query}`
}

function StepButton({ label, direction }: { label: string; direction: 1 | -1 }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => heroActions.step(direction)}
      className="grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-ink/5 text-ink transition-colors hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-3 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] ${direction === 1 ? 'rtl:-scale-x-100' : '-scale-x-100 rtl:scale-x-100'}`}>
        <path d="m6 3 5 5-5 5" />
      </svg>
    </button>
  )
}

// A glass card beside the home: the six stages of the build as a segmented line, the current
// stage's name, and the tools that work on it, each linking to the shop. It follows the build,
// then the tour, and waits while the pointer rests on it. On phones it is a slim bar along
// the bottom of the 3D area.
export function HeroBuildCard({ build, lang, show }: { build: Build | null; lang: Lang; show: boolean }) {
  const [hold, setHold] = useState(false)
  if (!build) return null

  const copy = STR[lang]
  const tools = copy.tools as Record<string, string>
  const stages = copy.hero.stages as Record<string, string>
  const pause = (on: boolean) => {
    setHold(on)
    heroActions.pause(on)
  }

  return (
    <motion.div
      inert={!show}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 14 }}
      transition={{ duration: show ? 0.6 : 0.25, ease: EASE }}
      className="pin-out pointer-events-none fixed inset-0 z-[5] squat:hidden"
    >
      <div
        onPointerEnter={() => pause(true)}
        onPointerLeave={() => pause(false)}
        onFocus={() => pause(true)}
        onBlur={() => pause(false)}
        className="pointer-events-auto absolute top-[calc(var(--h-h)+40px)] right-[max(12px,calc((100vw-1216px)/2-72px))] w-[324px] overflow-hidden rounded-2xl bg-white/78 p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.75),0_0_0_1px_rgba(21,23,26,.06),0_24px_50px_-22px_rgba(21,23,26,.45)] backdrop-blur-xl rtl:right-auto rtl:left-[max(12px,calc((100vw-1216px)/2-72px))] tall:top-auto tall:right-3 tall:bottom-[calc(var(--ph,0px)+8px)] tall:left-3 tall:w-auto tall:p-2.5 rtl:tall:right-3 rtl:tall:left-3"
      >
        <div role="group" className="flex gap-1">
          {Array.from({ length: build.total }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={Object.values(stages)[i]}
              aria-current={i === build.stage ? 'step' : undefined}
              onClick={() => heroActions.go(i)}
              className="group/seg h-4 flex-1 cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className={`block h-[3px] overflow-hidden rounded-full transition-colors ${i < build.stage ? 'bg-brand' : 'bg-ink/10 group-hover/seg:bg-ink/25'}`}>
                {i === build.stage && (
                  <span
                    key={`${build.stage}-${build.seconds}`}
                    className="hero-dwell block h-full bg-brand"
                    style={{ animationDuration: `${build.seconds}s`, animationPlayState: hold ? 'paused' : 'running' }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={build.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="m-0 min-w-0 truncate text-[15px] font-bold text-ink"
            >
              {stages[build.key]}
            </motion.p>
          </AnimatePresence>
          <div className="flex flex-none items-center gap-1">
            <StepButton label={copy.hero.prev} direction={-1} />
            <StepButton label={copy.hero.next} direction={1} />
          </div>
        </div>

        {/* The stage's tools as compact chips, each with a dot in its brand's colour */}
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0 tall:flex-nowrap tall:overflow-x-auto">
          {build.tools.map((tool) => (
            <li key={tool.id} className="tall:flex-none">
              <a
                href={shopLink(tool, lang)}
                onPointerEnter={() => heroActions.tool(tool.id)}
                onPointerLeave={() => heroActions.tool(null)}
                onFocus={() => heroActions.tool(tool.id)}
                onBlur={() => heroActions.tool(null)}
                className="flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-1 text-[11.5px] leading-tight font-medium whitespace-nowrap text-ink no-underline transition-colors hover:bg-brand/10 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${tool.brand === 'total' ? 'bg-total' : 'bg-jadever'}`} />
                {tools[tool.id] ?? tool.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
