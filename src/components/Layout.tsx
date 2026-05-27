import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useSyncStatus } from '../sync/useSyncStatus'

const PULL_THRESHOLD = 72

// ── Bottom nav items (excludes FAB) ──────────────────────────────────────────

const NAV: { to: string; label: string; icon: JSX.Element }[] = [
  {
    to: '/',
    label: 'Dash',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
      </svg>
    ),
  },
  {
    to: '/programs',
    label: 'Plans',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/goals',
    label: 'Goals',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM15.375 12a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/more',
    label: 'AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
]

// ── Quick Add items ───────────────────────────────────────────────────────────

interface QAItem {
  label: string
  bg: string
  icon: JSX.Element
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
      if (window.scrollY > 0) return
      startYRef.current  = e.touches[0].clientY
      pullingRef.current = true
    }
    function onMove(e: TouchEvent) {
      if (!pullingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy > 0 && window.scrollY === 0) {
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
    {
      label: 'Workout',
      bg: 'bg-blue-500',
      to: '/programs',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
    },
    {
      label: 'Cardio',
      bg: 'bg-orange-400',
      to: '/log',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Meal',
      bg: 'bg-green-500',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M15.75 8.25a.75.75 0 01.75.75c0 1.12-.492 2.126-1.27 2.812a.75.75 0 11-.992-1.124A2.243 2.243 0 0015 9a.75.75 0 01.75-.75z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Water',
      bg: 'bg-sky-500',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 017.877 10.58 7.423 7.423 0 01-7.603 7.5c-4.114 0-7.47-3.036-7.47-7.125 0-3.6 2.488-6.7 5.91-7.765a.75.75 0 01.977.702v5.263a.75.75 0 001.5 0V4.14a.75.75 0 01.777-.746z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Body Stats',
      bg: 'bg-accent',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-app-text"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm2.25-3a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0V9.75A.75.75 0 0113.5 9zm3.75-1.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Calendar',
      bg: 'bg-violet-500',
      to: '/history',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'History',
      bg: 'bg-slate-500',
      to: '/history',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Progress',
      bg: 'bg-emerald-500',
      to: '/progress',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" /></svg>,
    },
    {
      label: 'Exercises',
      bg: 'bg-rose-500',
      to: '/exercises',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M11.25 5.337c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.036 1.007-1.875 2.25-1.875S15 2.34 15 3.375c0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959 0 .332.278.598.61.578 1.91-.114 3.79-.342 5.632-.676a.75.75 0 01.878.645 49.17 49.17 0 01.376 5.452.657.657 0 01-.66.664c-.354 0-.675-.186-.958-.401a1.647 1.647 0 00-1.003-.349c-1.035 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401.31 0 .557.262.534.571a48.774 48.774 0 01-.595 4.845.75.75 0 01-.61.61c-1.82.317-3.673.533-5.555.642a.58.58 0 01-.611-.581c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.035-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959a.641.641 0 01-.658.643 49.118 49.118 0 01-4.708-.36.75.75 0 01-.645-.878c.293-1.614.504-3.257.629-4.924A.53.53 0 005.337 15c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.036 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.369 0 .713.128 1.003.349.283.215.604.401.959.401a.656.656 0 00.659-.663 47.703 47.703 0 00-.31-4.82.75.75 0 01.83-.832c1.343.155 2.703.254 4.077.294a.64.64 0 00.657-.642z" /></svg>,
    },
    {
      label: 'Calculator',
      bg: 'bg-amber-500',
      to: '/calculator',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 19.089l-7.165 2.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>,
    },
  ]

  function handleQA(item: QAItem) {
    setQaOpen(false)
    if (item.to) navigate(item.to)
    else item.action?.()
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex-none bg-orange-400 text-white text-xs font-semibold text-center py-2">
          You're offline — changes save locally
        </div>
      )}

      <main ref={mainRef} className="flex-1">
        {/* Pull-to-refresh indicator */}
        <div aria-hidden className="flex items-center justify-center overflow-hidden"
          style={{ height: indicatorHeight }}>
          {(pullDist > 8 || isRefreshing) && (
            <div
              className={`w-5 h-5 rounded-full border-2 border-accent border-t-transparent ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ opacity: isRefreshing ? 1 : spinnerOpacity }}
            />
          )}
        </div>
        <Outlet />
      </main>

      {/* ── Bottom nav ──────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-app-card border-t border-app-border z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="h-[72px] flex items-center">

          {/* Left two: Dash + Plans */}
          {NAV.slice(0, 2).map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold uppercase tracking-wide border-t-[2.5px] transition-colors',
                isActive ? 'border-accent text-app-text' : 'border-transparent text-app-muted',
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
              className="w-[50px] h-[50px] rounded-full bg-blue-500 flex items-center justify-center shadow-lg active:bg-blue-600"
              aria-label="Quick add"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" />
              </svg>
            </button>
          </div>

          {/* Right two: Goals + More */}
          {NAV.slice(2).map(({ to, label, icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold uppercase tracking-wide border-t-[2.5px] transition-colors relative',
                isActive ? 'border-accent text-app-text' : 'border-transparent text-app-muted',
              ].join(' ')}
            >
              {icon}
              <span>{label}</span>
              {to === '/more' && (
                <span className="absolute top-2 right-4">
                  <SyncDot status={status} />
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Quick Add sheet ──────────────────────────────────────────────── */}
      {qaOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setQaOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-[72px] left-0 right-0 z-50 bg-app-card border-t border-app-border rounded-t-2xl shadow-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="w-9 h-1 bg-app-border rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center text-sm font-bold text-app-text mb-4">Quick Add</p>
            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {QA_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQA(item)}
                  className="rounded-2xl bg-app-bg border border-app-border p-4 flex items-center gap-3 active:opacity-70"
                >
                  <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold text-app-text text-left leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
