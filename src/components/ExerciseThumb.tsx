import { PremiumIconTile, categoryIconConfig } from './BrandIcon'

export function ExerciseThumb({
  category,
  big = false,
}: {
  category?: string
  big?: boolean
}) {
  const icon = categoryIconConfig(category)

  return (
    <PremiumIconTile
      name={icon.name}
      tone={icon.tone}
      size={big ? 'xl' : 'md'}
      usage="card"
      active
      className={big ? '' : 'rounded-xl'}
      iconSize={big ? 38 : 26}
    />
  )
}
