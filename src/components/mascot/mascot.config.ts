const dimensions = { width: 520, height: 800 }

const pose = (name: string, en: string, ar: string, fr: string) => ({
  src: `/mascot/${name}.webp`,
  alt: { en, ar, fr },
  ...dimensions,
})

export const MASCOT_POSES = {
  idle: pose('idle', 'The DAR expert, smiling with his hands on his hips', 'خبير دار مبتسم وحاطط إيديه ع خصره', 'L’expert DAR sourit, les mains sur les hanches'),
  wave: pose('wave', 'The DAR expert waving hello', 'خبير دار عم يلوّح بإيده', 'L’expert DAR fait signe de la main'),
  point: pose('point', 'The DAR expert pointing toward the categories', 'خبير دار عم يدلّ عالفئات', 'L’expert DAR montre les catégories'),
  'thumbs-up': pose('thumbs-up', 'The DAR expert giving a thumbs-up', 'خبير دار رافع إبهامه', 'L’expert DAR lève le pouce'),
  'head-scratch': pose('head-scratch', 'The DAR expert scratching his head', 'خبير دار عم يحكّ راسه ويفكّر', 'L’expert DAR se gratte la tête'),
  tools: pose('tools', 'The DAR expert holding a cordless drill', 'خبير دار حامل مثقاب لاسلكي', 'L’expert DAR tient une perceuse sans fil'),
  electrical: pose('electrical', 'The DAR expert holding a voltage tester and a coil of cable', 'خبير دار حامل فاحص كهربا ولفّة كابل', 'L’expert DAR tient un testeur de tension et une bobine de câble'),
  plumbing: pose('plumbing', 'The DAR expert holding a pipe wrench and a pipe elbow', 'خبير دار حامل مفتاح مواسير وكوع ماسورة', 'L’expert DAR tient une clé à tuyau et un coude'),
  'building-materials': pose('building-materials', 'The DAR expert carrying a bag of cement', 'خبير دار حامل كيس إسمنت ع كتفه', 'L’expert DAR porte un sac de ciment'),
  paint: pose('paint', 'The DAR expert holding a paint roller and bucket', 'خبير دار حامل رول وطلّاية دهان', 'L’expert DAR tient un rouleau et un seau de peinture'),
}

export type MascotPose = keyof typeof MASCOT_POSES
export type MascotLocale = keyof typeof MASCOT_POSES.idle.alt

export const MASCOT_VIDEO = [
  { src: '/mascot/idle-loop.webm', type: 'video/webm' },
  { src: '/mascot/idle-loop.mp4', type: 'video/mp4' },
] as const

export type MascotVideoSources = ReadonlyArray<(typeof MASCOT_VIDEO)[number]>
