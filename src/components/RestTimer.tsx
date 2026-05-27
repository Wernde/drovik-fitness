import { useState, useEffect, useRef, useCallback } from 'react'

// ── Audio beep via Web Audio API (no file needed, works offline) ───────────────

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

// ── RestTimer ──────────────────────────────────────────────────────────────────

interface Props {
  defaultSecs:  number
  exerciseName: string
  onDismiss:    () => void
  bottomClass?: string   // override positioning when nav + save button stack up
}

export default function RestTimer({ defaultSecs, exerciseName, onDismiss, bottomClass = 'bottom-20' }: Props) {
  const [remaining, setRemaining] = useState(defaultSecs)
  const [done,      setDone]      = useState(false)
  // Track the ceiling so the progress bar doesn't jump when user adds time
  const ceilRef = useRef(defaultSecs)

  // Countdown tick
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [done])

  // Detect when timer reaches 0
  useEffect(() => {
    if (remaining === 0 && !done) {
      setDone(true)
      beep()
      try { navigator.vibrate(400) } catch { /* vibrate not supported */ }
    }
  }, [remaining, done])

  // Auto-dismiss 2.5 s after completion
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
    // Reset done so the tick resumes if user adds time after expiry
    if (delta > 0) setDone(false)
  }, [])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const progress = Math.min(1, (ceilRef.current - remaining) / ceilRef.current)

  return (
    <div className={`fixed ${bottomClass} left-0 right-0 z-50 px-4 pb-1 pointer-events-none`}>
      <div
        className={[
          'rounded-2xl shadow-2xl px-4 py-3 pointer-events-auto transition-colors',
          done ? 'bg-accent' : 'bg-app-card border border-app-border',
        ].join(' ')}
      >
        {/* Top row: label + skip */}
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs truncate flex-1 mr-2 ${done ? 'text-app-text font-semibold' : 'text-app-muted'}`}>
            {done ? 'Rest complete!' : `Rest — ${exerciseName}`}
          </p>
          {!done && (
            <button
              onClick={onDismiss}
              className="text-xs text-app-muted active:text-app-text flex-none"
            >
              Skip
            </button>
          )}
        </div>

        {/* Countdown + adjust buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => adjust(-30)}
            disabled={done}
            className="w-12 h-8 rounded-xl bg-app-bg border border-app-border text-app-muted text-xs font-semibold active:bg-app-border disabled:opacity-0"
          >
            −30s
          </button>

          <span className={[
            'flex-1 text-center text-3xl font-bold tabular-nums leading-none',
            done ? 'text-app-text' : 'text-app-text',
          ].join(' ')}>
            {mins}:{String(secs).padStart(2, '0')}
          </span>

          <button
            onClick={() => adjust(30)}
            disabled={done}
            className="w-12 h-8 rounded-xl bg-app-bg border border-app-border text-app-muted text-xs font-semibold active:bg-app-border disabled:opacity-0"
          >
            +30s
          </button>
        </div>

        {/* Progress bar — fills as time elapses */}
        <div className="h-1 rounded-full mt-3 overflow-hidden bg-app-border">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${done ? 'bg-app-text/20' : 'bg-accent'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
