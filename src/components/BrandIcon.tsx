import type { CSSProperties } from 'react'

export type BrandIconTone = 'gold' | 'blue' | 'flame' | 'steel' | 'purple'

export type BrandIconName =
  | 'home'
  | 'program'
  | 'nutrition'
  | 'history'
  | 'date'
  | 'settings'
  | 'plus'
  | 'ai'
  | 'workout'
  | 'cardio'
  | 'meal'
  | 'water'
  | 'body'
  | 'progress'
  | 'exercises'
  | 'calculator'
  | 'push'
  | 'pull'
  | 'legs'
  | 'core'
  | 'full'
  | 'lift'
  | 'template'
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'default'

const BASE = import.meta.env.BASE_URL

const PREMIUM_ICON_FILES: Record<BrandIconName, string> = {
  home:       'home.png',
  program:    'program.png',
  nutrition:  'nutrition.png',
  history:    'history.png',
  date:       'date.png',
  settings:   'settings.png',
  plus:       'plus.png',
  ai:         'ai.png',
  workout:    'workout.png',
  cardio:     'cardio.png',
  meal:       'meal.png',
  water:      'water.png',
  body:       'body-stats.png',
  progress:   'progress.png',
  exercises:  'exercise.png',
  calculator: 'calculator.png',
  push:       'workout.png',
  pull:       'workout.png',
  legs:       'workout.png',
  core:       'body-stats.png',
  full:       'workout.png',
  lift:       'exercise.png',
  template:   'program.png',
  barbell:    'exercise.png',
  dumbbell:   'exercise.png',
  cable:      'exercise.png',
  machine:    'exercise.png',
  bodyweight: 'workout.png',
  kettlebell: 'exercise.png',
  band:       'exercise.png',
  default:    'exercise.png',
}

const toneLift: Record<BrandIconTone, string> = {
  gold:   '0 12px 28px -18px var(--color-accent)',
  blue:   '0 12px 28px -18px var(--color-info-text)',
  flame:  '0 12px 28px -18px var(--color-warning-text)',
  steel:  '0 12px 28px -18px rgba(148, 163, 184, 0.65)',
  purple: '0 12px 28px -18px var(--color-neutral-text)',
}

export function brandIconTileStyle(tone: BrandIconTone, active = true): CSSProperties {
  return {
    color: 'var(--color-accent-label)',
    borderColor: active ? 'var(--color-accent)' : 'var(--color-app-border)',
    background: active
      ? [
          'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.20) 34%, rgba(255,255,255,0) 58%)',
          'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, var(--color-icon-tile) 50%, var(--color-icon-tile-deep) 100%)',
        ].join(', ')
      : [
          'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%)',
          'linear-gradient(145deg, var(--color-icon-tile) 0%, var(--color-icon-tile-muted) 100%)',
        ].join(', '),
    boxShadow: active
      ? [
          'inset 0 1px 0 rgba(255,255,255,0.78)',
          'inset 0 -10px 16px rgba(40,40,52,0.14)',
          toneLift[tone],
          '0 16px 28px -22px rgba(0,0,0,0.58)',
        ].join(', ')
      : [
          'inset 0 1px 0 rgba(255,255,255,0.60)',
          '0 10px 18px -18px rgba(0,0,0,0.42)',
        ].join(', '),
  }
}

export function categoryIconConfig(category?: string): { name: BrandIconName; tone: BrandIconTone } {
  switch (category) {
    case 'barbell': return { name: 'barbell', tone: 'gold' }
    case 'dumbbell': return { name: 'dumbbell', tone: 'gold' }
    case 'kettlebell': return { name: 'kettlebell', tone: 'gold' }
    case 'cable': return { name: 'cable', tone: 'blue' }
    case 'band': return { name: 'band', tone: 'blue' }
    case 'cardio': return { name: 'cardio', tone: 'blue' }
    case 'bodyweight': return { name: 'bodyweight', tone: 'flame' }
    case 'machine': return { name: 'machine', tone: 'steel' }
    default: return { name: 'default', tone: 'gold' }
  }
}

type BrandIconProps = {
  name: BrandIconName
  tone?: BrandIconTone
  size?: number
  active?: boolean
  className?: string
}

export default function BrandIcon({
  name,
  size = 24,
  active = true,
  className,
}: BrandIconProps) {
  const src = `${BASE}icons/premium/${PREMIUM_ICON_FILES[name]}`

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        opacity: active ? 1 : 0.72,
        filter: active
          ? 'drop-shadow(0 5px 5px rgba(0,0,0,0.28))'
          : 'drop-shadow(0 3px 3px rgba(0,0,0,0.18))',
      }}
    />
  )
}
