/**
 * More — hub page linking to all secondary screens.
 */

import { Link } from 'react-router-dom'
import { useSyncStatus } from '../sync/useSyncStatus'

interface HubItem {
  to: string
  label: string
  sub: string
  color: string
  iconColor: string
  icon: JSX.Element
}

const ITEMS: HubItem[] = [
  {
    to: '/history',
    label: 'History',
    sub: 'Past sessions & calendar',
    color: 'bg-violet-50',
    iconColor: 'text-violet-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/progress',
    label: 'Progress',
    sub: 'Lift charts & personal records',
    color: 'bg-[#FFF9E0]',
    iconColor: 'text-accent-dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
      </svg>
    ),
  },
  {
    to: '/exercises',
    label: 'Exercises',
    sub: '618 exercises, search & filter',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4" />
      </svg>
    ),
  },
  {
    to: '/calculator',
    label: 'Calculator',
    sub: 'Plates, warm-up & 1RM',
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="12" y1="10" x2="12" y2="10" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="16" y1="10" x2="16" y2="10" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    sub: 'Account, export & import',
    color: 'bg-gray-100',
    iconColor: 'text-gray-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/log',
    label: 'Start Workout',
    sub: 'Quick access to log screen',
    color: 'bg-accent-light',
    iconColor: 'text-accent-dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061z" />
      </svg>
    ),
  },
]

export default function More() {
  const { status } = useSyncStatus()

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-app-text">More</h1>
        <div className="flex items-center gap-2">
          {status === 'syncing' && (
            <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Syncing
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              Sync error
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ITEMS.map(({ to, label, sub, color, iconColor, icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 bg-app-card rounded-2xl border border-app-border px-4 py-4 active:bg-gray-50"
          >
            <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
              <span className={iconColor}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-app-text">{label}</p>
              <p className="text-xs text-app-muted mt-0.5">{sub}</p>
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-none">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </Link>
        ))}
      </div>

      {/* AI Coach teaser */}
      <div className="mt-4 rounded-2xl border-2 border-dashed border-app-border p-5 text-center">
        <p className="text-sm font-bold text-app-text mb-1">AI Coach</p>
        <p className="text-xs text-app-muted">Coming soon — requires a backend proxy to keep your API key secure.</p>
      </div>
    </div>
  )
}
