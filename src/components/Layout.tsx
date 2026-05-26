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
    label: 'More',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
]

// ── Quick Add items ───────────────────────────────────────────────────────────

interface QAItem {
  label: string
  color: string
  iconColor: string
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
      label: 'Start Workout',
      color: 'bg-accent-light',
      iconColor: 'text-accent-dark',
      to: '/log',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061z" /></svg>,
    },
    {
      label: 'Log Meal',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M15.75 8.25a.75.75 0 01.75.75c0 1.12-.492 2.126-1.27 2.812a.75.75 0 11-.992-1.124A2.243 2.243 0 0015 9a.75.75 0 01.75-.75z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" /></svg>,
    },
    {
      label: 'Log Water',
      color: 'bg-blue-50',
      iconColor: 'text-blue-500',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 017.877 10.58 7.423 7.423 0 01-7.603 7.5c-4.114 0-7.47-3.036-7.47-7.125 0-3.6 2.488-6.7 5.91-7.765a.75.75 0 01.977.702v5.263a.75.75 0 001.5 0V4.14a.75.75 0 01.777-.746z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Log Weight',
      color: 'bg-[#FFF9E0]',
      iconColor: 'text-accent-dark',
      to: '/goals',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm2.25-3a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0V9.75A.75.75 0 0113.5 9zm3.75-1.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'History',
      color: 'bg-violet-50',
      iconColor: 'text-violet-500',
      to: '/history',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" /></svg>,
    },
    {
      label: 'Calculator',
      color: 'bg-orange-50',
      iconColor: 'text-orange-500',
      to: '/calculator',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10" strokeWidth={2.5} strokeLinecap="round"/><line x1="12" y1="10" x2="12" y2="10" strokeWidth={2.5} strokeLinecap="round"/><line x1="16" y1="10" x2="16" y2="10" strokeWidth={2.5} strokeLinecap="round"/><line x1="8" y1="14" x2="8" y2="14" strokeWidth={2.5} strokeLinecap="round"/><line x1="12" y1="14" x2="12" y2="14" strokeWidth={2.5} strokeLinecap="round"/><line x1="16" y1="14" x2="16" y2="14" strokeWidth={2.5} strokeLinecap="round"/></svg>,
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
            <div className="grid grid-cols-3 gap-3 px-4 pb-6">
              {QA_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQA(item)}
                  className={`${item.color} rounded-2xl p-4 flex flex-col items-center gap-2 border border-app-border active:opacity-70`}
                >
                  <div className={`${item.iconColor}`}>{item.icon}</div>
                  <span className="text-xs font-semibold text-app-text text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
