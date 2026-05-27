import { useState, useEffect, useRef, useCallback } from 'react'

function beep() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* audio not supported */ }
}

interface Props {
  defaultSecs:  number
  exerciseName: string
  onDismiss:    () => void
  bottomClass?: string  // unused, kept for API compatibility
}

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RestTimer({ defaultSecs, exerciseName, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(defaultSecs)
  const [done,      setDone]      = useState(false)
  const ceilRef = useRef(defaultSecs)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (remaining === 0 && !done) {
      setDone(true)
      beep()
      try { navigator.vibrate(400) } catch { /* not supported */ }
    }
  }, [remaining, done])

  useEffect(() => {
    if (!done) return
    const id = setTimeout(onDismiss, 2500)
    return () => clearTimeout(id)
  }, [done, onDismiss])

  const adjust = useCallback((delta: number) => {
    setRemaining((r) => {
      const next = Math.max(0, r + delta)
      if (next > ceilRef.current) ceilRef.current = next
      return next
    })
    if (delta > 0) setDone(false)
  }, [])

  const mins     = Math.floor(remaining / 60)
  const secs     = remaining % 60
  const progress = ceilRef.current > 0 ? remaining / ceilRef.current : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">

      {/* Title */}
      <p className="text-white/60 text-sm font-semibold mb-1 tracking-wide uppercase">
        {done ? 'Rest Complete!' : 'Rest Timer'}
      </p>
      <p className="text-white/40 text-xs mb-8 max-w-[200px] text-center truncate">
        {exerciseName}
      </p>

      {/* Circular progress ring */}
      <div className="relative flex items-center justify-center mb-10">
        <svg width="220" height="220" className="-rotate-90">
          {/* Track */}
          <circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            stroke={done ? '#FFCA10' : '#FFCA10'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        {/* Countdown number */}
        <div className="absolute flex flex-col items-center">
          <span className="text-white text-6xl font-extrabold tabular-nums leading-none">
            {mins > 0
              ? `${mins}:${String(secs).padStart(2, '0')}`
              : String(secs)
            }
          </span>
          {mins === 0 && (
            <span className="text-white/40 text-sm font-semibold mt-1">sec</span>
          )}
        </div>
      </div>

      {/* Adjust buttons */}
      <div className="flex items-center gap-6 mb-10">
        <button
          onClick={() => adjust(-10)}
          disabled={done}
          className="w-16 h-12 rounded-2xl bg-white/10 text-white text-sm font-bold active:bg-white/20 disabled:opacity-0"
        >
          −10s
        </button>
        <button
          onClick={() => adjust(10)}
          disabled={done}
          className="w-16 h-12 rounded-2xl bg-white/10 text-white text-sm font-bold active:bg-white/20 disabled:opacity-0"
        >
          +10s
        </button>
      </div>

      {/* Skip button */}
      {!done && (
        <button
          onClick={onDismiss}
          className="px-8 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold active:bg-white/20"
        >
          Skip Rest
        </button>
      )}
    </div>
  )
}
