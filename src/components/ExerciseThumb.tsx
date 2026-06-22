import BrandIcon, { brandIconTileStyle, categoryIconConfig } from './BrandIcon'

export function ExerciseThumb({
  category,
  big = false,
}: {
  category?: string
  big?: boolean
}) {
  const sz = big ? 'w-16 h-16 rounded-2xl' : 'w-11 h-11 rounded-xl'
  const icon = categoryIconConfig(category)

  return (
    <div
      className={`${sz} relative border flex items-center justify-center flex-shrink-0 overflow-hidden`}
      style={brandIconTileStyle(icon.tone)}
    >
      <span className="absolute inset-x-1.5 top-1.5 h-2 rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      <BrandIcon
        name={icon.name}
        tone={icon.tone}
        size={big ? 36 : 26}
        className="relative z-10"
      />
    </div>
  )
}
