import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useSyncStatus } from '../sync/useSyncStatus'

const PULL_THRESHOLD = 72
const BASE = import.meta.env.BASE_URL

// ── Bottom nav items (excludes FAB) ──────────────────────────────────────────

const NAV: { to: string; label: string; icon: JSX.Element }[] = [
  {
    to: '/',
    label: 'Home',
    icon: <img src={`${BASE}icons/nav-home.svg`} alt="" className="w-7 h-7" />,
  },
  {
    to: '/programs',
    label: 'Program',
    icon: <img src={`${BASE}icons/nav-program.svg`} alt="" className="w-7 h-7" />,
  },
  {
    to: '/nutrition',
    label: 'Nutrition',
    icon: <img src={`${BASE}icons/nav-nutrition.svg`} alt="" className="w-7 h-7" />,
  },
  {
    to: '/history',
    label: 'History',
    icon: <img src={`${BASE}icons/nav-history.svg`} alt="" className="w-7 h-7" />,
  },
]

// ── Quick Add items ───────────────────────────────────────────────────────────

interface QAItem {
  label: string
  icon: string
  to?: string
  action?: () => void
}

// ── Sync dot ──────────────────────────────────────────────────────────────────

function SyncDot({ status }: { status: 'idle' | 'syncing' | 'error' }) {
  if (status === 'syncing') return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
  if (status === 'error')   return <div className="w-2 h-2 rounded-full bg-red-400" />
  return null
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { status, runSync } = useSyncStatus()
  const navigate = useNavigate()
  const [qaOpen, setQaOpen] = useState(false)

  // ── Offline ──────────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const mainRef        = useRef<HTMLElement>(null)
  const startYRef      = useRef(0)
  const pullingRef     = useRef(false)
  const pullDistRef    = useRef(0)
  const [pullDist,     setPullDist]     = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await runSync()
    setIsRefreshing(false)
  }, [runSync])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    function onStart(e: TouchEvent) {
      if (el.scrollTop > 0) return
      startYRef.current  = e.touches[0].clientY
      pullingRef.current = true
    }
    function onMove(e: TouchEvent) {
      if (!pullingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy > 0 && el.scrollTop === 0) {
        e.preventDefault()
        const dist = Math.min(dy * 0.5, PULL_THRESHOLD + 24)
        pullDistRef.current = dist
        setPullDist(dist)
      } else {
        pullingRef.current  = false
        pullDistRef.current = 0
        setPullDist(0)
      }
    }
    function onEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      const dist = pullDistRef.current
      pullDistRef.current = 0
      setPullDist(0)
      if (dist >= PULL_THRESHOLD) triggerRefresh()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [triggerRefresh])

  const indicatorHeight = isRefreshing ? 44 : pullDist
  const spinnerOpacity  = Math.min(pullDist / PULL_THRESHOLD, 1)

  // ── Quick Add items ───────────────────────────────────────────────────────
  const QA_ITEMS: QAItem[] = [
    { label: 'AI Coach',   icon: `${BASE}icons/ai-coach.svg`,   to: '/more'       },
    { label: 'Workout',    icon: `${BASE}icons/workout.svg`,    to: '/programs'   },
    { label: 'Cardio',     icon: `${BASE}icons/cardio.svg`,     to: '/log'        },
    { label: 'Meal',       icon: `${BASE}icons/meal.svg`,       to: '/nutrition'  },
    { label: 'Water',      icon: `${BASE}icons/water.svg`,      to: '/nutrition'  },
    { label: 'Body Stats', icon: `${BASE}icons/body-stats.svg`, to: '/body'       },
    { label: 'Progress',   icon: `${BASE}icons/progress.svg`,   to: '/progress'   },
    { label: 'Exercises',  icon: `${BASE}icons/exercises.svg`,  to: '/exercises'  },
    { label: 'Calculator', icon: `${BASE}icons/calculator.svg`, to: '/calculator' },
  ]

  function handleQA(item: QAItem) {
    setQaOpen(false)
    if (item.to) navigate(item.to)
    else item.action?.()
  }

  return (
    <div className="h-screen overflow-hidden bg-app-bg" style={{ height: '100dvh' }}>
      <div className="flex flex-col h-full">

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex-none bg-orange-400 text-white text-xs font-semibold text-center py-2">
            You're offline — changes save locally
          </div>
        )}

        {/* ── App body ─────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Desktop sidebar nav (md+) ─────────────────────────────────── */}
          <aside className="hidden md:flex flex-col w-60 flex-none bg-app-card border-r border-app-border">

            {/* Brand */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
              <img src={`${BASE}drovik-logo.svg`} alt="Drovik Fitness" className="h-12" />
              <SyncDot status={status} />
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => [
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    isActive
                      ? 'bg-accent text-app-text shadow-sm'
                      : 'text-app-muted hover:bg-app-bg hover:text-app-text font-semibold',
                  ].join(' ')}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Quick Add items (inside sidebar, above button) */}
            {qaOpen && (
              <nav className="px-3 pb-2 overflow-y-auto flex flex-col-reverse" style={{ maxHeight: 'calc(100% - 180px)' }}>
                {QA_ITEMS.map((item, i) => (
                  <button
                    key={item.label}
                    onClick={() => handleQA(item)}
                    className="qa-item w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-app-bg transition-colors text-left"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <img src={item.icon} alt="" className="w-9 h-9 flex-shrink-0" />
                    <span className="text-sm font-semibold text-app-text">{item.label}</span>
                  </button>
                ))}
              </nav>
            )}

            {/* Quick Add button */}
            <div className="px-3 pb-6 flex-shrink-0">
              <button
                onClick={() => setQaOpen((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-colors ${qaOpen ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 flex-none">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Quick Add
              </button>
            </div>
          </aside>

          {/* ── Content + mobile bottom nav ───────────────────────────────── */}
          <div className="flex flex-col flex-1 min-w-0">

            <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain main-nav-clearance">
              {/* Pull-to-refresh indicator */}
              <div
                aria-hidden
                className="flex items-center justify-center overflow-hidden"
                style={{ height: indicatorHeight }}
              >
                {(pullDist > 8 || isRefreshing) && (
                  <div
                    className={`w-5 h-5 rounded-full border-2 border-accent border-t-transparent ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{ opacity: isRefreshing ? 1 : spinnerOpacity }}
                  />
                )}
              </div>
              <div>
                <Outlet />
              </div>
            </main>

            {/* ── Mobile bottom nav (hidden on md+) ──────────────────────── */}
            <nav
              className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-app-card border-t border-app-border"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="h-[72px] flex items-center">

                {/* Left two: Dash + Plans */}
                {NAV.slice(0, 2).map(({ to, label, icon }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    className={({ isActive }) => [
                      'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold uppercase tracking-wide border-t-[3px] transition-colors',
                      isActive
                        ? 'border-accent text-accent-dark'
                        : 'border-transparent text-app-muted font-semibold',
                    ].join(' ')}
                  >
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                ))}

                {/* Centre FAB */}
                <div className="flex-1 flex items-center justify-center h-full border-t-[2.5px] border-transparent">
                  <button
                    onClick={() => setQaOpen((v) => !v)}
                    className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg active:bg-blue-600"
                    aria-label="Quick add"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6 text-white">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Right two: Food + History */}
                {NAV.slice(2).map(({ to, label, icon }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) => [
                      'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold uppercase tracking-wide border-t-[3px] transition-colors',
                      isActive
                        ? 'border-accent text-accent-dark'
                        : 'border-transparent text-app-muted font-semibold',
                    ].join(' ')}
                  >
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Quick Add sheet (mobile only) ────────────────────────────────────── */}
      {qaOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setQaOpen(false)}
          />
          {/* Sheet */}
          <div className="qa-sheet bg-app-card border-t border-app-border rounded-t-2xl shadow-xl">
            <div className="w-9 h-1 bg-app-border rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center text-sm font-bold text-app-text mb-4">Quick Add</p>
            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {QA_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQA(item)}
                  className="rounded-2xl bg-app-bg border border-app-border p-4 flex items-center gap-3 active:opacity-70"
                >
                  <img src={item.icon} alt="" className="w-11 h-11 flex-shrink-0" />
                  <span className="text-sm font-semibold text-app-text text-left leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
