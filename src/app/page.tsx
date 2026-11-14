import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { HomeClient } from '@/components/home/HomeClient'
import type { Lang } from '@/components/home/HeroCopy'
import { MASCOT_VIDEO } from '@/components/mascot/mascot.config'

const LANGS: Lang[] = ['en', 'fr', 'ar']

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams
  const videoSources = MASCOT_VIDEO.filter(({ src }) => existsSync(join(process.cwd(), 'public', src.slice(1))))
  return <HomeClient lang={LANGS.includes(lang as Lang) ? (lang as Lang) : 'en'} videoSources={videoSources} />
}
