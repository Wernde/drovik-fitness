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
  bottomClass?: string
}

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

  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`

  return (
    <div
      className="fixed left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[430px] z-50"
      style={{ bottom: 'calc(148px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className={`mx-3 rounded-2xl shadow-xl overflow-hidden ${done ? 'bg-accent' : 'bg-app-text'}`}>
        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div
            className={`h-full transition-all duration-1000 linear ${done ? 'bg-white' : 'bg-accent'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Timer icon */}
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Label + countdown */}
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wide truncate ${done ? 'text-app-text/70' : 'text-white/50'}`}>
              {done ? 'Rest complete!' : exerciseName}
            </p>
            <p className={`text-xl font-extrabold tabular-nums leading-tight ${done ? 'text-app-text' : 'text-white'}`}>
              {done ? 'Go!' : timeStr}
            </p>
          </div>

          {/* Adjust buttons */}
          {!done && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => adjust(-10)}
                className="h-8 px-2.5 rounded-xl bg-white/10 text-white text-xs font-bold active:bg-white/20"
              >
                −10s
              </button>
              <button
                onClick={() => adjust(10)}
                className="h-8 px-2.5 rounded-xl bg-white/10 text-white text-xs font-bold active:bg-white/20"
              >
                +10s
              </button>
            </div>
          )}

          {/* Skip / dismiss */}
          {!done ? (
            <button
              onClick={onDismiss}
              className="h-8 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold active:bg-white/20"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={onDismiss}
              className="h-8 px-3 rounded-xl bg-app-text/10 text-app-text text-xs font-semibold active:bg-app-text/20"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
