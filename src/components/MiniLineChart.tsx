import { useRef, useEffect, useState } from 'react'

interface Point { x: number; y: number }

interface Props {
  data: Record<string, unknown>[]
  dataKey: string
  height?: number
  color?: string
  xKey?: string
  formatY?: (v: number) => string
  formatX?: (v: string) => string
  label?: string
}

function buildPath(points: Point[], w: number, h: number, pad: { t: number; r: number; b: number; l: number }): string {
  if (points.length < 2) return ''
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const gw = w - pad.l - pad.r
  const gh = h - pad.t - pad.b
  const px = (x: number) => pad.l + ((x - minX) / rangeX) * gw
  const py = (y: number) => pad.t + gh - ((y - minY) / rangeY) * gh
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
}

export default function MiniLineChart({
  data, dataKey, height = 180, color = '#B8900A',
  xKey = 'date', formatY, formatX, label,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const valid = data.filter(d => d[dataKey] != null && !isNaN(Number(d[dataKey])))
  if (valid.length < 2) {
    return (
      <div ref={containerRef} style={{ height }} className="flex items-center justify-center text-xs text-app-muted">
        Not enough data yet
      </div>
    )
  }

  const points: Point[] = valid.map((d, i) => ({ x: i, y: Number(d[dataKey]) }))
  const ys = points.map(p => p.y)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = { t: 8, r: 8, b: 28, l: 38 }
  const path = buildPath(points, width, height, pad)
  const gw = width - pad.l - pad.r
  const gh = height - pad.t - pad.b
  const rangeY = maxY - minY || 1

  // Y grid lines & labels (4 lines)
  const yTicks = [0, 0.33, 0.67, 1].map(f => ({
    val: minY + f * rangeY,
    y: pad.t + gh - f * gh,
  }))

  // X labels — show at most 5 evenly spaced
  const xStep = Math.max(1, Math.floor(valid.length / 5))
  const xLabels = valid
    .map((d, i) => ({ i, label: String(d[xKey] ?? '') }))
    .filter((_, i) => i % xStep === 0 || i === valid.length - 1)

  const px = (i: number) => pad.l + (i / (valid.length - 1)) * gw
  const py = (v: number) => pad.t + gh - ((v - minY) / rangeY) * gh

  // Tooltip state
  const [tip, setTip] = useState<{ x: number; y: number; val: number; label: string } | null>(null)

  function handleMove(e: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>) {
    const svg = e.currentTarget.closest('svg')!
    const rect = svg.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const relX = clientX - rect.left - pad.l
    if (relX < 0 || relX > gw) { setTip(null); return }
    const idx = Math.round((relX / gw) * (valid.length - 1))
    const d = valid[Math.max(0, Math.min(idx, valid.length - 1))]
    const val = Number(d[dataKey])
    setTip({ x: px(idx), y: py(val), val, label: String(d[xKey] ?? '') })
  }

  return (
    <div ref={containerRef} style={{ height, position: 'relative' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}
        onMouseMove={handleMove} onTouchMove={handleMove}
        onMouseLeave={() => setTip(null)} onTouchEnd={() => setTip(null)}
      >
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t.val}>
            <line x1={pad.l} x2={width - pad.r} y1={t.y} y2={t.y} stroke="#E3E5E5" strokeWidth={1} />
            <text x={pad.l - 4} y={t.y + 3} textAnchor="end" fontSize={9} fill="#7A7980">
              {formatY ? formatY(t.val) : t.val.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map(({ i, label: lbl }) => (
          <text key={i} x={px(i)} y={height - 4} textAnchor="middle" fontSize={9} fill="#7A7980">
            {formatX ? formatX(lbl) : lbl.slice(5)} {/* default: strip YYYY- */}
          </text>
        ))}

        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p.y)} r={valid.length < 8 ? 3 : 0} fill={color} />
        ))}

        {/* Tooltip */}
        {tip && (
          <g>
            <line x1={tip.x} x2={tip.x} y1={pad.t} y2={pad.t + gh} stroke="#C8C8C8" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={tip.x} cy={tip.y} r={4} fill={color} />
            <rect
              x={Math.min(tip.x + 6, width - 80)}
              y={Math.max(tip.y - 20, pad.t)}
              width={72} height={34} rx={6}
              fill="white" stroke="#E3E5E5" strokeWidth={1}
            />
            <text x={Math.min(tip.x + 10, width - 76)} y={Math.max(tip.y - 7, pad.t + 13)} fontSize={9} fill="#7A7980">
              {tip.label.slice(5)}
            </text>
            <text x={Math.min(tip.x + 10, width - 76)} y={Math.max(tip.y + 8, pad.t + 28)} fontSize={11} fontWeight="bold" fill="#241F20">
              {formatY ? formatY(tip.val) : tip.val.toFixed(1)}{label ? ` ${label}` : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
