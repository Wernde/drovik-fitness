export const CAT_ICON_PATHS: Record<string, string> = {
  barbell:    'M6.375 7.5C6.375 5.634 7.884 4.125 9.75 4.125h4.5c1.866 0 3.375 1.509 3.375 3.375v9c0 1.866-1.509 3.375-3.375 3.375h-4.5A3.375 3.375 0 016.375 16.5v-9z',
  dumbbell:   'M5.25 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15zM20.25 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15zM3.75 10.5A2.25 2.25 0 016 8.25h.75V15H6a2.25 2.25 0 01-2.25-2.25v-2.25zM18 8.25h.75a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118.75 15H18V8.25zM8.25 8.25H15.75v7.5H8.25V8.25z',
  cable:      'M12 3v1.5M12 19.5V21M6.22 6.22l1.06 1.06M16.72 16.72l1.06 1.06M3 12h1.5M19.5 12H21M6.22 17.78l1.06-1.06M16.72 7.28l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z',
  machine:    'M2.25 4.5A2.25 2.25 0 014.5 2.25h15a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25v-15zm5.25 0a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM6 12a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12zm.75 3.75a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z',
  bodyweight: 'M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z',
  kettlebell: 'M12 3a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V12h2a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4a2 2 0 012-2h2v-1.5A4 4 0 0112 3z',
  band:       'M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z',
  default:    'M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z',
}

export function CategoryIcon({
  category,
  size = 6,
}: {
  category?: string
  size?: number
}) {
  const key      = category && CAT_ICON_PATHS[category] ? category : 'default'
  const path     = CAT_ICON_PATHS[key]
  const isStroke = key === 'cable'
  return (
    <svg
      viewBox="0 0 24 24"
      fill={isStroke ? 'none' : 'white'}
      stroke={isStroke ? 'white' : 'none'}
      strokeWidth={isStroke ? 1.5 : 0}
      className={`w-${size} h-${size}`}
    >
      <path d={path} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  )
}

export function ExerciseThumb({
  category,
  big = false,
}: {
  category?: string
  big?: boolean
}) {
  const sz = big ? 'w-16 h-16 rounded-2xl' : 'w-11 h-11 rounded-xl'
  const ic = big ? 7 : 5
  return (
    <div className={`${sz} bg-app-text flex items-center justify-center flex-shrink-0`}>
      <CategoryIcon category={category} size={ic} />
    </div>
  )
}
