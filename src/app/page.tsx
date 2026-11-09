import { HomeClient } from '@/components/home/HomeClient'
import type { Lang } from '@/components/home/HeroCopy'

const LANGS: Lang[] = ['en', 'fr', 'ar']

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams
  return <HomeClient lang={LANGS.includes(lang as Lang) ? (lang as Lang) : 'en'} />
}
