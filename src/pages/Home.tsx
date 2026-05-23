/**
 * Home — main dashboard.
 *
 * Shows the active program name, last workout date, and quick links
 * to every section of the app.
 */

import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export default function Home() {
  const data = useLiveQuery(async () => {
    const activeProgram = await db.programs
      .filter((p) => p.isActive && !p.deleted)
      .first()

    const lastSession = await db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()
      .then((list) =>
        list.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
      )

    return { activeProgram, lastSession }
  }, [])

  const activeProgram = data?.activeProgram
  const lastSession   = data?.lastSession

  const lastWorkoutLabel = lastSession
    ? new Date(lastSession.date + 'T12:00:00').toLocaleDateString('en-AU', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : null

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Drovik Fitness</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Start Workout CTA */}
      <Link
        to="/log"
        className="rounded-xl bg-lime-400 text-gray-900 p-5 active:bg-lime-500"
      >
        <p className="text-xs font-medium opacity-70 mb-1">
          {activeProgram ? activeProgram.name : 'Ad-hoc'}
        </p>
        <p className="text-xl font-bold">Start Workout</p>
        <p className="text-sm opacity-80 mt-1">
          {lastWorkoutLabel ? `Last session: ${lastWorkoutLabel}` : 'No sessions yet — let\'s go!'}
        </p>
      </Link>

      {/* Quick links */}
      <div className="flex flex-col gap-2">
        {[
          { to: '/programs', label: 'Programs',       sub: 'Build and manage training programs' },
          { to: '/history',  label: 'History',        sub: 'Calendar view of past sessions' },
          { to: '/progress', label: 'Progress',       sub: 'Charts, personal records, body weight' },
          { to: '/exercises',label: 'Exercise Library',sub: 'Browse, search, and manage exercises' },
          { to: '/settings', label: 'Settings',       sub: 'Export / import data, account' },
        ].map(({ to, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-4 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              className="w-5 h-5 text-gray-400 flex-none">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
