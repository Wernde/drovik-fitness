// Home — placeholder for Phase 1.
// Phase 5 will add: quick-start workout button, today's program, recent session summary.
export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Drovik Fitness</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm">Welcome back. Ready to train?</p>

      <div className="mt-8 rounded-xl bg-sky-500 text-white p-6 flex flex-col gap-2">
        <span className="text-sm font-medium opacity-80">Coming in Phase 5</span>
        <span className="text-xl font-bold">Start Workout</span>
        <span className="text-sm opacity-80">Quick-start a session from your programs or log ad-hoc.</span>
      </div>
    </div>
  )
}
