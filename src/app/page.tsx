import { HomeClient } from '@/components/home/HomeClient'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams
  return <HomeClient initialLang={lang === 'ar' || lang === 'fr' ? lang : 'en'} />
}
