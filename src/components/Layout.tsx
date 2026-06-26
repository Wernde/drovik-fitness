import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useSyncStatus } from '../sync/useSyncStatus'
import { PremiumIconTile } from './BrandIcon'
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
    <PremiumIconTile
      name={icon}
      tone={tone}
      size="sm"
      usage="nav"
      active={active}
      variant={active ? 'active' : 'muted'}
    />
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
    <PremiumIconTile
      name={icon}
      tone={tone}
      size={large ? 'lg' : 'md'}
      usage="button"
      active
      iconSize={large ? 36 : 28}
    />
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
          <aside className="hidden md:flex flex-col w-56 flex-none dashboard-sidebar">

            {/* Brand */}
            <div className="px-4 pt-5 pb-4">
              <div className="brand-logo-shell">
                <img src={`${BASE}drovik-logo-gold.png`} alt="Drovik Fitness" className="h-12 w-full object-contain" />
                <SyncDot status={status} />
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) => [
                    'premium-nav-item flex items-center gap-4 px-4 py-3 rounded-card text-sm font-bold transition-all',
                    isActive
                      ? 'is-active text-app-text'
                      : 'text-app-muted hover:text-app-text font-semibold',
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
            <div className="px-5 pb-6 flex-shrink-0">
              <button
                onClick={() => setQaOpen((v) => !v)}
                className="quick-add-rail-button w-full flex items-center gap-3 px-4 py-3 rounded-card text-sm font-extrabold text-app-text transition-all active:scale-[0.99]"
              >
                <PremiumIconTile
                  name="plus"
                  tone={qaOpen ? 'blue' : 'gold'}
                  size="xs"
                  usage="button"
                  active={qaOpen}
                  variant={qaOpen ? 'active' : 'default'}
                />
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
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-float active:scale-95 transition-transform"
                    aria-label="Quick add"
                  >
                    <PremiumIconTile
                      name="plus"
                      tone={qaOpen ? 'blue' : 'gold'}
                      size="md"
                      usage="button"
                      active={qaOpen}
                      className="rounded-full"
                      iconSize={28}
                    />
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
