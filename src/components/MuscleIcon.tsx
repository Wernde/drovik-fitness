/**
 * MuscleIcon — a simplified front + back body diagram.
 *
 * The SVG has two side-by-side silhouettes in a single 48×72 viewBox:
 *   - Left half  (x 0–22):  front view — chest, quads, biceps, etc.
 *   - Right half (x 26–48): back view  — back, glutes, hamstrings, etc.
 *
 * Colours come from CSS variables defined in index.css so dark mode is
 * handled automatically without any extra prop or class logic here.
 *
 * Usage:
 *   <MuscleIcon muscleGroup="Chest" width={32} height={48} />
 */

// ── Region identifiers ─────────────────────────────────────────────────────────

type Region =
  // Front view
  | 'f-l-shoulder' | 'f-r-shoulder'
  | 'f-l-upper-arm' | 'f-r-upper-arm'
  | 'f-l-forearm' | 'f-r-forearm'
  | 'f-chest' | 'f-core'
  | 'f-l-quad' | 'f-r-quad'
  | 'f-l-calf' | 'f-r-calf'
  // Back view
  | 'b-l-trap' | 'b-r-trap'
  | 'b-upper-back' | 'b-lower-back'
  | 'b-l-upper-arm' | 'b-r-upper-arm'
  | 'b-l-forearm' | 'b-r-forearm'
  | 'b-l-glute' | 'b-r-glute'
  | 'b-l-ham' | 'b-r-ham'
  | 'b-l-calf' | 'b-r-calf'

const ALL: Region[] = [
  'f-l-shoulder', 'f-r-shoulder',
  'f-l-upper-arm', 'f-r-upper-arm',
  'f-l-forearm', 'f-r-forearm',
  'f-chest', 'f-core',
  'f-l-quad', 'f-r-quad',
  'f-l-calf', 'f-r-calf',
  'b-l-trap', 'b-r-trap',
  'b-upper-back', 'b-lower-back',
  'b-l-upper-arm', 'b-r-upper-arm',
  'b-l-forearm', 'b-r-forearm',
  'b-l-glute', 'b-r-glute',
  'b-l-ham', 'b-r-ham',
  'b-l-calf', 'b-r-calf',
]

// Which regions to highlight for each muscle group string.
// Inner Thigh doesn't have its own region so we approximate with the quad area.
const REGIONS: Record<string, Region[]> = {
  'Back':         ['b-upper-back'],
  'Biceps':       ['f-l-upper-arm', 'f-r-upper-arm'],
  'Calves':       ['f-l-calf', 'f-r-calf', 'b-l-calf', 'b-r-calf'],
  'Cardio':       ALL,
  'Chest':        ['f-chest'],
  'Core':         ['f-core'],
  'Forearms':     ['f-l-forearm', 'f-r-forearm', 'b-l-forearm', 'b-r-forearm'],
  'Full Body':    ALL,
  'Glutes':       ['b-l-glute', 'b-r-glute'],
  'Hamstrings':   ['b-l-ham', 'b-r-ham'],
  'Inner Thigh':  ['f-l-quad', 'f-r-quad'],
  'Lower Back':   ['b-lower-back'],
  'Quads':        ['f-l-quad', 'f-r-quad'],
  'Shoulders':    ['f-l-shoulder', 'f-r-shoulder', 'b-l-trap', 'b-r-trap'],
  'Traps':        ['b-l-trap', 'b-r-trap', 'b-upper-back'],
  'Triceps':      ['b-l-upper-arm', 'b-r-upper-arm'],
}

// ── Colours (come from CSS variables set in index.css) ─────────────────────────

const HI   = 'var(--muscle-hi)'    // highlighted muscle — sky-500 / sky-400 in dark
const BODY = 'var(--muscle-body)'  // rest of silhouette — gray-200 / gray-600 in dark

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  muscleGroup: string
  width?: number
  height?: number
  className?: string
}

export default function MuscleIcon({
  muscleGroup,
  width = 32,
  height = 48,
  className = '',
}: Props) {
  const highlighted = new Set(REGIONS[muscleGroup] ?? [])

  // Returns the fill colour for a given region.
  function fill(r: Region) {
    return highlighted.has(r) ? HI : BODY
  }

  return (
    <svg
      viewBox="0 0 48 72"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`flex-none ${className}`}
    >
      {/* ══════════════════════════════════════════════════════════════
          FRONT BODY — centred at x=11, spans roughly x=0 to x=22
          ══════════════════════════════════════════════════════════════ */}

      {/* Head */}
      <ellipse cx="11" cy="5.5" rx="5" ry="5.5" fill={BODY} />
      {/* Neck */}
      <rect x="9" y="11" width="4" height="3" rx="1" fill={BODY} />

      {/* Left & right shoulder deltoids */}
      <ellipse cx="3"  cy="16" rx="3.5" ry="2.5" fill={fill('f-l-shoulder')} />
      <ellipse cx="19" cy="16" rx="3.5" ry="2.5" fill={fill('f-r-shoulder')} />

      {/* Chest / upper torso */}
      <rect x="6" y="14" width="10" height="10" rx="2"   fill={fill('f-chest')} />
      {/* Core / abs */}
      <rect x="6" y="24" width="10" height="9"  rx="1.5" fill={fill('f-core')} />
      {/* Hips (not independently targeted — always body colour) */}
      <rect x="5.5" y="33" width="11" height="6" rx="2"  fill={BODY} />

      {/* Left & right upper arm (biceps face forward) */}
      <rect x="0"    y="14" width="5.5" height="14" rx="2.5" fill={fill('f-l-upper-arm')} />
      <rect x="16.5" y="14" width="5.5" height="14" rx="2.5" fill={fill('f-r-upper-arm')} />

      {/* Left & right forearm */}
      <rect x="0.5" y="28.5" width="4.5" height="11" rx="2" fill={fill('f-l-forearm')} />
      <rect x="17"  y="28.5" width="4.5" height="11" rx="2" fill={fill('f-r-forearm')} />

      {/* Left & right quad */}
      <rect x="5.5"  y="39" width="5" height="17" rx="2.5" fill={fill('f-l-quad')} />
      <rect x="11.5" y="39" width="5" height="17" rx="2.5" fill={fill('f-r-quad')} />

      {/* Left & right calf (front) */}
      <rect x="5.5"  y="57.5" width="5" height="13.5" rx="2" fill={fill('f-l-calf')} />
      <rect x="11.5" y="57.5" width="5" height="13.5" rx="2" fill={fill('f-r-calf')} />


      {/* ══════════════════════════════════════════════════════════════
          BACK BODY — centred at x=37, spans roughly x=26 to x=48
          ══════════════════════════════════════════════════════════════ */}

      {/* Head */}
      <ellipse cx="37" cy="5.5" rx="5" ry="5.5" fill={BODY} />
      {/* Neck */}
      <rect x="35" y="11" width="4" height="3" rx="1" fill={BODY} />

      {/* Left & right trap / shoulder cap */}
      <ellipse cx="29" cy="16" rx="3.5" ry="2.5" fill={fill('b-l-trap')} />
      <ellipse cx="45" cy="16" rx="3.5" ry="2.5" fill={fill('b-r-trap')} />
      {/* Trap bar connecting neck to shoulder caps */}
      <rect x="32" y="14" width="10" height="5" rx="1"  fill={fill('b-l-trap')} />

      {/* Upper back / lats */}
      <rect x="32" y="19" width="10" height="11" rx="2"   fill={fill('b-upper-back')} />
      {/* Lower back */}
      <rect x="32" y="30" width="10" height="8"  rx="1.5" fill={fill('b-lower-back')} />

      {/* Left & right upper arm back (triceps face rearward) */}
      <rect x="26"   y="14" width="5.5" height="14" rx="2.5" fill={fill('b-l-upper-arm')} />
      <rect x="42.5" y="14" width="5.5" height="14" rx="2.5" fill={fill('b-r-upper-arm')} />

      {/* Left & right forearm (back) */}
      <rect x="26.5" y="28.5" width="4.5" height="11" rx="2" fill={fill('b-l-forearm')} />
      <rect x="43"   y="28.5" width="4.5" height="11" rx="2" fill={fill('b-r-forearm')} />

      {/* Left & right glute */}
      <ellipse cx="33" cy="40.5" rx="4.5" ry="5.5" fill={fill('b-l-glute')} />
      <ellipse cx="41" cy="40.5" rx="4.5" ry="5.5" fill={fill('b-r-glute')} />

      {/* Left & right hamstring */}
      <rect x="30" y="46" width="5" height="16" rx="2.5" fill={fill('b-l-ham')} />
      <rect x="39" y="46" width="5" height="16" rx="2.5" fill={fill('b-r-ham')} />

      {/* Left & right calf (back) */}
      <rect x="30" y="63" width="5" height="9" rx="2" fill={fill('b-l-calf')} />
      <rect x="39" y="63" width="5" height="9" rx="2" fill={fill('b-r-calf')} />
    </svg>
  )
}
