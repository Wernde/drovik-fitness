import { useId } from 'react'
import type { CSSProperties } from 'react'

export type BrandIconTone = keyof typeof BRAND_ICON_TONES

export type BrandIconName =
  | 'home'
  | 'program'
  | 'nutrition'
  | 'history'
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

export const BRAND_ICON_TONES = {
  gold: {
    high: '#FFF4BC',
    mid:  '#F5C842',
    low:  '#C9A227',
    deep: '#151008',
    soft: 'rgba(245, 200, 66, 0.14)',
    glow: 'rgba(245, 200, 66, 0.36)',
  },
  blue: {
    high: '#DDF5FF',
    mid:  '#00AAFF',
    low:  '#0878C9',
    deep: '#07101B',
    soft: 'rgba(0, 170, 255, 0.14)',
    glow: 'rgba(0, 170, 255, 0.34)',
  },
  flame: {
    high: '#FFE6BE',
    mid:  '#FF9D2E',
    low:  '#C65C14',
    deep: '#190C05',
    soft: 'rgba(255, 157, 46, 0.14)',
    glow: 'rgba(255, 157, 46, 0.32)',
  },
  steel: {
    high: '#FFFFFF',
    mid:  '#C9D2E3',
    low:  '#7B8496',
    deep: '#141821',
    soft: 'rgba(201, 210, 227, 0.12)',
    glow: 'rgba(148, 163, 184, 0.24)',
  },
  purple: {
    high: '#F7E8FF',
    mid:  '#A855F7',
    low:  '#7E22CE',
    deep: '#15051F',
    soft: 'rgba(168, 85, 247, 0.14)',
    glow: 'rgba(168, 85, 247, 0.28)',
  },
} as const

export function brandIconTileStyle(tone: BrandIconTone, active = true): CSSProperties {
  const p = BRAND_ICON_TONES[tone]
  return {
    color: active ? p.deep : p.mid,
    borderColor: active ? 'rgba(255, 255, 255, 0.28)' : 'var(--color-app-border)',
    background: active
      ? `linear-gradient(145deg, ${p.high} 0%, ${p.mid} 38%, ${p.low} 76%, ${p.deep} 145%)`
      : `linear-gradient(145deg, ${p.soft} 0%, var(--color-app-card) 62%, rgba(0, 0, 0, 0.12) 100%)`,
    boxShadow: active
      ? `inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -12px 18px rgba(0,0,0,0.24), 0 10px 20px -12px ${p.glow}`
      : `inset 0 1px 0 rgba(255,255,255,0.28), 0 6px 16px -14px ${p.glow}`,
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
  tone = 'gold',
  size = 24,
  active = true,
  className,
}: BrandIconProps) {
  const rawId = useId().replace(/:/g, '')
  const p = BRAND_ICON_TONES[tone]
  const body = `url(#${rawId}-body)`
  const edge = `url(#${rawId}-edge)`
  const cool = `url(#${rawId}-cool)`
  const glass = `url(#${rawId}-glass)`
  const shine = '#FFFFFF'
  const deep = p.deep

  const strokeProps = {
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  function dumbbell() {
    return (
      <g>
        <rect x="19" y="28" width="26" height="8" rx="4" fill={deep} opacity="0.35" />
        <rect x="18" y="26" width="28" height="8" rx="4" fill={body} stroke={edge} strokeWidth="1.6" />
        <rect x="8" y="19" width="9" height="22" rx="3.5" fill={body} stroke={edge} strokeWidth="1.6" />
        <rect x="47" y="19" width="9" height="22" rx="3.5" fill={body} stroke={edge} strokeWidth="1.6" />
        <rect x="4" y="24" width="7" height="12" rx="2.5" fill={cool} stroke={edge} strokeWidth="1.3" />
        <rect x="53" y="24" width="7" height="12" rx="2.5" fill={cool} stroke={edge} strokeWidth="1.3" />
        <path d="M11 22h4M49 22h4M22 28h20" stroke={shine} strokeWidth="2" opacity="0.6" {...strokeProps} />
      </g>
    )
  }

  function plateBars() {
    return (
      <g>
        <rect x="15" y="35" width="8" height="14" rx="2" fill={body} stroke={edge} strokeWidth="1.4" />
        <rect x="28" y="25" width="8" height="24" rx="2" fill={cool} stroke={edge} strokeWidth="1.4" />
        <rect x="41" y="16" width="8" height="33" rx="2" fill={body} stroke={edge} strokeWidth="1.4" />
        <path d="M14 30l13-12 8 5 13-14" fill="none" stroke={shine} strokeWidth="4" opacity="0.55" {...strokeProps} />
        <path d="M14 31l13-12 8 5 13-14" fill="none" stroke={deep} strokeWidth="2.2" {...strokeProps} />
        <path d="M43 10h7v7" fill="none" stroke={deep} strokeWidth="2.2" {...strokeProps} />
      </g>
    )
  }

  function renderIcon() {
    switch (name) {
      case 'home':
        return (
          <g>
            <path d="M12 30 32 13l20 17v19a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V30Z" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M8 31 32 11l24 20" fill="none" stroke={deep} strokeWidth="5" {...strokeProps} />
            <path d="M8 29 32 9l24 20" fill="none" stroke={shine} strokeWidth="2.2" opacity="0.7" {...strokeProps} />
            <rect x="26" y="36" width="12" height="18" rx="2.5" fill={deep} opacity="0.78" />
            <path d="M18 33h28" stroke={shine} strokeWidth="2" opacity="0.45" {...strokeProps} />
          </g>
        )
      case 'program':
      case 'workout':
      case 'exercises':
      case 'lift':
      case 'barbell':
      case 'dumbbell':
      case 'default':
        return dumbbell()
      case 'nutrition':
      case 'meal':
        return (
          <g>
            <circle cx="30" cy="34" r="15" fill={body} stroke={edge} strokeWidth="1.8" />
            <circle cx="30" cy="34" r="8" fill={deep} opacity="0.2" />
            <path d="M14 21v16M10.5 21v8M17.5 21v8" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M48 19c-4 5-5.5 10-4.5 16H50v10" stroke={cool} strokeWidth="4" {...strokeProps} />
            <path d="M20 24c5-4 15-4 20 0" stroke={shine} strokeWidth="2.5" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'history':
        return (
          <g>
            <circle cx="32" cy="32" r="19" fill={body} stroke={edge} strokeWidth="2" />
            <circle cx="32" cy="32" r="12" fill={glass} opacity="0.5" />
            <path d="M32 20v13l8 5" stroke={deep} strokeWidth="4" {...strokeProps} />
            <path d="M21 16 18 11M43 16l3-5" stroke={cool} strokeWidth="3" {...strokeProps} />
            <path d="M22 23c5-5 15-6 21-1" stroke={shine} strokeWidth="2.5" opacity="0.6" {...strokeProps} />
          </g>
        )
      case 'plus':
        return (
          <g>
            <rect x="27" y="13" width="10" height="38" rx="5" fill={body} stroke={edge} strokeWidth="1.6" />
            <rect x="13" y="27" width="38" height="10" rx="5" fill={cool} stroke={edge} strokeWidth="1.6" />
            <path d="M30 16v14M16 30h17" stroke={shine} strokeWidth="2.4" opacity="0.65" {...strokeProps} />
          </g>
        )
      case 'ai':
        return (
          <g>
            <rect x="17" y="18" width="30" height="30" rx="8" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M23 29h18M23 36h11" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M25 16v-5M32 16v-5M39 16v-5M25 53v-5M32 53v-5M39 53v-5" stroke={cool} strokeWidth="2.5" {...strokeProps} />
            <path d="m47 14 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill={cool} stroke={shine} strokeWidth="1.2" />
            <path d="M22 22h16" stroke={shine} strokeWidth="2.4" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'cardio':
        return (
          <g>
            <circle cx="32" cy="32" r="20" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M12 33h9l4-10 8 21 5-11h14" fill="none" stroke={deep} strokeWidth="4" {...strokeProps} />
            <path d="M13 31h8l4-10 8 21 5-11h13" fill="none" stroke={shine} strokeWidth="1.8" opacity="0.68" {...strokeProps} />
          </g>
        )
      case 'water':
        return (
          <g>
            <path d="M32 10c10 12 16 21 16 31 0 9-7 15-16 15s-16-6-16-15c0-10 6-19 16-31Z" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M24 43c2 4 6 6 11 5" stroke={shine} strokeWidth="3" opacity="0.55" {...strokeProps} />
            <path d="M25 23c-5 7-6 12-5 17" stroke={shine} strokeWidth="2" opacity="0.38" {...strokeProps} />
          </g>
        )
      case 'body':
      case 'bodyweight':
        return (
          <g>
            <circle cx="32" cy="16" r="8" fill={body} stroke={edge} strokeWidth="1.6" />
            <path d="M19 53c1-12 6-20 13-20s12 8 13 20" fill={body} stroke={edge} strokeWidth="1.8" {...strokeProps} />
            <path d="M24 35h16M24 42h16M26 49h12" stroke={deep} strokeWidth="2.7" {...strokeProps} />
            <path d="M27 13c3-2 7-2 10 0" stroke={shine} strokeWidth="2" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'progress':
        return plateBars()
      case 'calculator':
      case 'machine':
        return (
          <g>
            <rect x="16" y="12" width="32" height="42" rx="7" fill={body} stroke={edge} strokeWidth="1.8" />
            <rect x="22" y="18" width="20" height="9" rx="2.5" fill={deep} opacity="0.78" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => (
                <rect key={`${row}-${col}`} x={22 + col * 8} y={33 + row * 6} width="5" height="4" rx="1.4" fill={col === 2 && row === 2 ? cool : deep} opacity="0.86" />
              )),
            )}
            <path d="M21 15h18" stroke={shine} strokeWidth="2" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'push':
        return (
          <g>
            <path d="M13 47h38" stroke={deep} strokeWidth="5" {...strokeProps} />
            <path d="M15 42 28 29l9 8 13-18" fill="none" stroke={body} strokeWidth="9" {...strokeProps} />
            <path d="M15 42 28 29l9 8 13-18" fill="none" stroke={deep} strokeWidth="4" {...strokeProps} />
            <path d="M42 19h9v9" fill="none" stroke={deep} strokeWidth="4" {...strokeProps} />
            <path d="M17 39 28 28" stroke={shine} strokeWidth="2.4" opacity="0.65" {...strokeProps} />
          </g>
        )
      case 'pull':
        return (
          <g>
            <path d="M14 17h36" stroke={body} strokeWidth="8" {...strokeProps} />
            <path d="M18 17c2 14 7 22 14 22s12-8 14-22" fill="none" stroke={deep} strokeWidth="5" {...strokeProps} />
            <path d="M24 42 20 53M40 42l4 11" stroke={body} strokeWidth="5" {...strokeProps} />
            <path d="M18 14h28" stroke={shine} strokeWidth="2.5" opacity="0.6" {...strokeProps} />
          </g>
        )
      case 'legs':
        return (
          <g>
            <path d="M25 12v18l-8 24h10l5-19" fill={body} stroke={edge} strokeWidth="1.6" {...strokeProps} />
            <path d="M39 12v18l8 24H37l-5-19" fill={cool} stroke={edge} strokeWidth="1.6" {...strokeProps} />
            <path d="M24 31h16" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M26 15v13M39 15v13" stroke={shine} strokeWidth="2" opacity="0.45" {...strokeProps} />
          </g>
        )
      case 'core':
        return (
          <g>
            <path d="M32 10c9 5 14 15 14 27 0 8-5 14-14 18-9-4-14-10-14-18 0-12 5-22 14-27Z" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M32 18v29M24 25h16M23 33h18M25 41h14" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M25 18c4-3 10-3 14 0" stroke={shine} strokeWidth="2.2" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'full':
        return (
          <g>
            <circle cx="32" cy="16" r="6" fill={body} stroke={edge} strokeWidth="1.5" />
            <path d="M32 24v28M16 28h32M22 52h20" stroke={deep} strokeWidth="5" {...strokeProps} />
            <path d="m18 17 6-3 6 3M34 17l6-3 6 3" stroke={cool} strokeWidth="3" {...strokeProps} />
            <path d="M18 26h28" stroke={shine} strokeWidth="2.2" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'template':
        return (
          <g>
            <rect x="18" y="12" width="28" height="40" rx="6" fill={body} stroke={edge} strokeWidth="1.8" />
            <rect x="25" y="9" width="14" height="8" rx="3" fill={cool} stroke={edge} strokeWidth="1.3" />
            <path d="M24 26h16M24 34h16M24 42h10" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M22 16h19" stroke={shine} strokeWidth="2" opacity="0.55" {...strokeProps} />
          </g>
        )
      case 'cable':
      case 'band':
        return (
          <g>
            <circle cx="32" cy="32" r="18" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M32 10v9M32 45v9M10 32h9M45 32h9M17 17l7 7M40 40l7 7M17 47l7-7M40 24l7-7" stroke={deep} strokeWidth="3" {...strokeProps} />
            <circle cx="32" cy="32" r="7" fill={cool} stroke={shine} strokeWidth="1.4" />
          </g>
        )
      case 'kettlebell':
        return (
          <g>
            <path d="M22 25c0-8 4-13 10-13s10 5 10 13" fill="none" stroke={body} strokeWidth="7" {...strokeProps} />
            <path d="M19 30h26a5 5 0 0 1 5 5v12a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7V35a5 5 0 0 1 5-5Z" fill={body} stroke={edge} strokeWidth="1.8" />
            <path d="M24 28c0-5 3-8 8-8s8 3 8 8" fill="none" stroke={deep} strokeWidth="3" {...strokeProps} />
            <path d="M22 34h18" stroke={shine} strokeWidth="2.4" opacity="0.55" {...strokeProps} />
          </g>
        )
      default:
        return dumbbell()
    }
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{
        opacity: active ? 1 : 0.82,
        filter: active ? 'drop-shadow(0 3px 3px rgba(0,0,0,0.24))' : 'drop-shadow(0 2px 2px rgba(0,0,0,0.16))',
      }}
    >
      <defs>
        <linearGradient id={`${rawId}-body`} x1="14" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.high} />
          <stop offset="0.45" stopColor={p.mid} />
          <stop offset="1" stopColor={p.low} />
        </linearGradient>
        <linearGradient id={`${rawId}-edge`} x1="14" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.82" />
          <stop offset="0.52" stopColor={p.low} />
          <stop offset="1" stopColor={p.deep} />
        </linearGradient>
        <linearGradient id={`${rawId}-cool`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E8F8FF" />
          <stop offset="0.5" stopColor="#00AAFF" />
          <stop offset="1" stopColor="#0878C9" />
        </linearGradient>
        <radialGradient id={`${rawId}-glass`} cx="0.34" cy="0.24" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="18" ry="4.6" fill="rgba(0,0,0,0.2)" />
      {renderIcon()}
    </svg>
  )
}
