import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useSyncStatus } from '../sync/useSyncStatus'
import BrandIcon, { brandIconTileStyle } from './BrandIcon'
import type { BrandIconName, BrandIconTone } from './BrandIcon'

const PULL_THRESHOLD = 72
const BASE = import.meta.env.BASE_URL

// ── Nav icons ─────────────────────────────────────────────────────────────────

type NavIconProps = { active: boolean }

function NavIconShell({
  active,
  tone,
  icon,
}: NavIconProps & { tone: BrandIconTone; icon: BrandIconName }) {
  return (
    <span
      className="relative w-9 h-9 rounded-2xl border flex items-center justify-center overflow-hidden transition-all"
      style={brandIconTileStyle(tone, active)}
      aria-hidden="true"
    >
      <span className="absolute inset-x-1 top-1 h-2 rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      <BrandIcon name={icon} tone={tone} active={active} size={24} className="relative z-10" />
    </span>
  )
}

function NavHome({ active }: NavIconProps) {
  return <NavIconShell active={active} tone="gold" icon="home" />
}

function NavDumbbell({ active }: NavIconProps) {
  return <NavIconShell active={active} tone="gold" icon="program" />
}

function NavUtensils({ active }: NavIconProps) {
  return <NavIconShell active={active} tone="blue" icon="nutrition" />
}

function NavClock({ active }: NavIconProps) {
  return <NavIconShell active={active} tone="flame" icon="history" />
}

// ── Bottom nav items ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',          label: 'Home',      Icon: NavHome      },
  { to: '/programs',  label: 'Program',   Icon: NavDumbbell  },
  { to: '/nutrition', label: 'Nutrition', Icon: NavUtensils  },
  { to: '/history',   label: 'History',   Icon: NavClock     },
]

// ── Quick Add items ───────────────────────────────────────────────────────────

interface QAItem {
  label: string
  icon: BrandIconName
  tone: BrandIconTone
  to?: string
  action?: () => void
}

// ── Sync dot ──────────────────────────────────────────────────────────────────

function SyncDot({ status }: { status: 'idle' | 'syncing' | 'error' }) {
  if (status === 'syncing') return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
  if (status === 'error')   return <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
  return null
}

function HeartbeatLine() {
  const PATH = 'M0,18 L62,18 L86,18 L100,16 L112,18 L128,18 L150,18 L168,18 L182,6 L196,29 L212,9 L228,18 L278,18 L306,18 L320,16 L332,18 L350,18 L374,18 L389,8 L402,24 L418,13 L434,18 L520,18'
  return (
    <svg
      viewBox="0 0 520 34"
      preserveAspectRatio="none"
      className="flex-1 h-5 min-w-0"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,110,102,0.18)) drop-shadow(0 0 10px rgba(242,195,93,0.20))' }}
    >
      <defs>
        <linearGradient id="hbGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8a550d" />
          <stop offset="28%"  stopColor="#ebb955" />
          <stop offset="47%"  stopColor="#ff9a82" />
          <stop offset="53%"  stopColor="#ff6e66" />
          <stop offset="60%"  stopColor="#ffd5b0" />
          <stop offset="74%"  stopColor="#fff0ae" />
          <stop offset="100%" stopColor="#bd7f1f" />
        </linearGradient>
      </defs>
      {/* Ghost base line */}
      <path d={PATH} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
      {/* Animated gold trace */}
      <path
        className="heartbeat-live"
        d={PATH}
        fill="none"
        stroke="url(#hbGold)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 560,
          strokeDashoffset: 560,
          animation: 'heartbeatTrace 2.85s linear infinite',
        }}
      />
    </svg>
  )
}

function QuickAddIcon({
  icon,
  tone,
  large = false,
}: {
  icon: BrandIconName
  tone: BrandIconTone
  large?: boolean
}) {
  return (
    <span
      className={[
        'relative rounded-2xl border flex items-center justify-center flex-shrink-0 overflow-hidden',
        large ? 'w-14 h-14' : 'w-11 h-11',
      ].join(' ')}
      style={brandIconTileStyle(tone)}
      aria-hidden="true"
    >
      <span className="absolute inset-x-1.5 top-1.5 h-2 rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      <BrandIcon name={icon} tone={tone} size={large ? 36 : 28} className="relative z-10" />
    </span>
  )
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
    { label: 'AI Coach',   icon: 'ai',         tone: 'blue',  to: '/more'       },
    { label: 'Workout',    icon: 'workout',    tone: 'gold',  to: '/log'        },
    { label: 'Cardio',     icon: 'cardio',     tone: 'blue',  to: '/log'        },
    { label: 'Meal',       icon: 'meal',       tone: 'flame', to: '/nutrition'  },
    { label: 'Water',      icon: 'water',      tone: 'blue',  to: '/nutrition'  },
    { label: 'Body Stats', icon: 'body',       tone: 'gold',  to: '/body'       },
    { label: 'Progress',   icon: 'progress',   tone: 'blue',  to: '/progress'   },
    { label: 'Exercises',  icon: 'exercises',  tone: 'gold',  to: '/exercises'  },
    { label: 'Calculator', icon: 'calculator', tone: 'steel', to: '/calculator' },
  ]

  function handleQA(item: QAItem) {
    setQaOpen(false)
    if (item.to) navigate(item.to)
    else item.action?.()
  }

  return (
    <div className="fixed inset-0 bg-app-bg overflow-hidden">
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
          <aside className="hidden md:flex flex-col w-60 flex-none bg-app-card border-r border-app-border shadow-[8px_0_24px_-22px_rgba(0,0,0,0.45)]">

            {/* Brand */}
            <div className="px-3 py-3 border-b border-app-border">
              <div className="rounded-xl bg-[#0D0D0D] px-4 py-3 flex items-center gap-3">
                <img src={`${BASE}drovik-logo-gold.png`} alt="Drovik Fitness" className="h-7 w-auto flex-shrink-0" />
                <HeartbeatLine />
                <SyncDot status={status} />
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) => [
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    isActive
                      ? 'bg-accent text-app-text shadow-sm'
                      : 'text-app-muted hover:bg-app-bg hover:text-app-text font-semibold',
                  ].join(' ')}
                >
                  {({ isActive }) => (
                    <>
                      <Icon active={isActive} />
                      <span>{label}</span>
                    </>
                  )}
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
                    <QuickAddIcon icon={item.icon} tone={item.tone} />
                    <span className="text-sm font-semibold text-app-text">{item.label}</span>
                  </button>
                ))}
              </nav>
            )}

            {/* Quick Add button */}
            <div className="px-3 pb-6 flex-shrink-0">
              <button
                onClick={() => setQaOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-extrabold transition-all active:scale-[0.99]"
                style={brandIconTileStyle(qaOpen ? 'blue' : 'gold')}
              >
                <BrandIcon name="plus" tone={qaOpen ? 'blue' : 'gold'} size={24} className="flex-none" />
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
              <Outlet />
            </main>

            {/* ── Mobile bottom nav (hidden on md+) ──────────────────────── */}
            <nav
              className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-app-card border-t border-app-border shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.45)]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="h-[72px] flex items-center">

                {/* Left two: Home + Program */}
                {NAV_ITEMS.slice(0, 2).map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    className={({ isActive }) => [
                      'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold uppercase tracking-wide border-t-[3px] transition-colors',
                      isActive
                        ? 'border-accent text-accent'
                        : 'border-transparent text-app-muted font-semibold',
                    ].join(' ')}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon active={isActive} />
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}

                {/* Centre FAB */}
                <div className="flex-1 flex items-center justify-center h-full border-t-[2.5px] border-transparent">
                  <button
                    onClick={() => setQaOpen((v) => !v)}
                    className="w-12 h-12 rounded-full border flex items-center justify-center shadow-float active:scale-95 transition-transform"
                    style={brandIconTileStyle(qaOpen ? 'blue' : 'gold')}
                    aria-label="Quick add"
                  >
                    <BrandIcon name="plus" tone={qaOpen ? 'blue' : 'gold'} size={28} />
                  </button>
                </div>

                {/* Right two: Nutrition + History */}
                {NAV_ITEMS.slice(2).map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) => [
                      'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold uppercase tracking-wide border-t-[3px] transition-colors',
                      isActive
                        ? 'border-accent text-accent'
                        : 'border-transparent text-app-muted font-semibold',
                    ].join(' ')}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon active={isActive} />
                        <span>{label}</span>
                      </>
                    )}
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
                  <QuickAddIcon icon={item.icon} tone={item.tone} large />
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
