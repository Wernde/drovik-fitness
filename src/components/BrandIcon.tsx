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
  home:       'home.svg',
  program:    'program.svg',
  nutrition:  'nutrition.svg',
  history:    'history.svg',
  date:       'date.svg',
  settings:   'settings.svg',
  plus:       'plus.svg',
  ai:         'ai.svg',
  workout:    'workout.svg',
  cardio:     'cardio.svg',
  meal:       'meal.svg',
  water:      'water.svg',
  body:       'body-stats.svg',
  progress:   'progress.svg',
  exercises:  'exercise.svg',
  calculator: 'calculator.svg',
  push:       'workout.svg',
  pull:       'workout.svg',
  legs:       'workout.svg',
  core:       'body-stats.svg',
  full:       'workout.svg',
  lift:       'exercise.svg',
  template:   'program.svg',
  barbell:    'exercise.svg',
  dumbbell:   'exercise.svg',
  cable:      'exercise.svg',
  machine:    'exercise.svg',
  bodyweight: 'workout.svg',
  kettlebell: 'exercise.svg',
  band:       'exercise.svg',
  default:    'exercise.svg',
}

const toneLift: Record<BrandIconTone, string> = {
  gold:   '0 12px 28px -18px var(--color-accent)',
  blue:   '0 12px 28px -18px var(--color-info-text)',
  flame:  '0 12px 28px -18px var(--color-warning-text)',
  steel:  '0 12px 28px -18px rgba(148, 163, 184, 0.65)',
  purple: '0 12px 28px -18px var(--color-neutral-text)',
}

const iconNeon = {
  border: 'rgba(255, 122, 24, 0.95)',
  borderSoft: 'rgba(255, 122, 24, 0.72)',
  outer: '0 0 14px -3px rgba(255, 112, 0, 0.72)',
  outerSoft: '0 0 10px -4px rgba(255, 112, 0, 0.48)',
  halo: '0 0 30px -14px rgba(255, 190, 80, 0.70)',
}

export function brandIconTileStyle(tone: BrandIconTone, active = true): CSSProperties {
  return {
    color: 'var(--color-accent-label)',
    borderColor: active ? iconNeon.border : iconNeon.borderSoft,
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
          'inset 0 0 0 1px rgba(255,196,100,0.18)',
          'inset 0 -10px 16px rgba(40,40,52,0.14)',
          iconNeon.outer,
          iconNeon.halo,
          toneLift[tone],
          '0 16px 28px -22px rgba(0,0,0,0.58)',
        ].join(', ')
      : [
          'inset 0 1px 0 rgba(255,255,255,0.60)',
          iconNeon.outerSoft,
          '0 10px 18px -18px rgba(0,0,0,0.42)',
        ].join(', '),
  }
}

export type BrandIconTileSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type BrandIconTileVariant = 'default' | 'active' | 'muted' | 'disabled'
export type BrandIconTileUsage = 'nav' | 'sidebar' | 'card' | 'button'

type PremiumIconTileProps = {
  name: BrandIconName
  tone?: BrandIconTone
  size?: BrandIconTileSize
  variant?: BrandIconTileVariant
  active?: boolean
  disabled?: boolean
  usage?: BrandIconTileUsage
  className?: string
  iconClassName?: string
  iconSize?: number
  style?: CSSProperties
}

const tileSizes: Record<BrandIconTileSize, { shell: string; radius: string; shine: string; icon: number }> = {
  xs: { shell: 'w-8 h-8 rounded-xl',        radius: 'rounded-xl',   shine: 'inset-x-1 top-1 h-1.5', icon: 20 },
  sm: { shell: 'w-10 h-10 rounded-card',    radius: 'rounded-card', shine: 'inset-x-1.5 top-1.5 h-2', icon: 28 },
  md: { shell: 'w-11 h-11 rounded-card',    radius: 'rounded-card', shine: 'inset-x-1.5 top-1.5 h-2', icon: 30 },
  lg: { shell: 'w-14 h-14 rounded-2xl',     radius: 'rounded-2xl',  shine: 'inset-x-2 top-1.5 h-2.5', icon: 36 },
  xl: { shell: 'w-16 h-16 rounded-2xl',     radius: 'rounded-2xl',  shine: 'inset-x-2.5 top-2 h-3', icon: 42 },
}

const usageClasses: Record<BrandIconTileUsage, string> = {
  nav: 'border-2',
  sidebar: 'border-2',
  card: 'border',
  button: 'border',
}

export function PremiumIconTile({
  name,
  tone = 'gold',
  size = 'md',
  variant = 'default',
  active,
  disabled = false,
  usage = 'card',
  className = '',
  iconClassName = '',
  iconSize,
  style,
}: PremiumIconTileProps) {
  const config = tileSizes[size]
  const isDisabled = disabled || variant === 'disabled'
  const isMuted = variant === 'muted'
  const isActive = active ?? variant === 'active'
  const iconActive = !isDisabled && !isMuted && isActive
  const tileStyle: CSSProperties = {
    ...brandIconTileStyle(tone, !isDisabled && !isMuted && isActive),
    ...(isDisabled ? { filter: 'grayscale(0.25)', opacity: 0.52 } : {}),
    ...style,
  }

  return (
    <span
      className={[
        'relative flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent-label/60',
        config.shell,
        usageClasses[usage],
        className,
      ].join(' ')}
      style={tileStyle}
      aria-hidden="true"
    >
      <span className={`absolute ${config.shine} rounded-full bg-white/45 blur-[1px]`} />
      <span className={`absolute inset-0 ${config.radius} ring-1 ring-inset ring-orange-200/45`} />
      <span className={`absolute right-0.5 top-1.5 bottom-1.5 w-px ${config.radius} bg-sky-300/55 blur-[0.5px]`} />
      <BrandIcon
        name={name}
        tone={tone}
        active={iconActive}
        size={iconSize ?? config.icon}
        className={['relative z-10', iconClassName].join(' ')}
      />
    </span>
  )
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
          ? 'var(--premium-icon-filter) drop-shadow(0 5px 5px rgba(0,0,0,0.34))'
          : 'var(--premium-icon-filter) drop-shadow(0 3px 3px rgba(0,0,0,0.2))',
      }}
    />
  )
}
