import { Link } from 'react-router-dom'

// Home — main dashboard.
// Phase 5 will add: quick-start workout, today's program, recent session summary.
export default function Home() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Drovik Fitness</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back. Ready to train?</p>
      </div>

      {/* Start Workout — coming Phase 5 */}
      <div className="rounded-xl bg-sky-500 text-white p-5">
        <p className="text-xs font-medium opacity-70 mb-1">Coming in Phase 5</p>
        <p className="text-xl font-bold">Start Workout</p>
        <p className="text-sm opacity-80 mt-1">
          Quick-start a session from your programs or log ad-hoc.
        </p>
      </div>

      {/* Exercise Library — available now */}
      <Link
        to="/exercises"
        className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-4 active:bg-gray-100 dark:active:bg-gray-800"
      >
        <div>
          <p className="font-semibold text-sm">Exercise Library</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Browse, search, and manage exercises
          </p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className="w-5 h-5 text-gray-400 flex-none">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>

      {/* Programs — coming Phase 4 */}
      <Link
        to="/programs"
        className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-4 active:bg-gray-100 dark:active:bg-gray-800"
      >
        <div>
          <p className="font-semibold text-sm">Programs</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Build and manage your training programs
          </p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className="w-5 h-5 text-gray-400 flex-none">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>
    </div>
  )
}
