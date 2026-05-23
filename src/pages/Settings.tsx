/**
 * Settings — app settings and data management.
 *
 * Export: dumps the entire Dexie database to a JSON file and triggers a download.
 * Import: reads a JSON file produced by Export and merges it into the local database
 *         using bulkPut (last-write-wins by updatedAt, same as the sync layer).
 *
 * This is the safety-net backup described in CLAUDE.md Phase 7.
 */

import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../db/db'

// ── Export ────────────────────────────────────────────────────────────────────

async function exportData(): Promise<void> {
  const [
    exercises,
    programs,
    workoutDays,
    dayExercises,
    workoutSessions,
    sessionExercises,
    sets,
    bodyWeightLogs,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.programs.toArray(),
    db.workoutDays.toArray(),
    db.dayExercises.toArray(),
    db.workoutSessions.toArray(),
    db.sessionExercises.toArray(),
    db.sets.toArray(),
    db.bodyWeightLogs.toArray(),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    version:    1,
    exercises,
    programs,
    workoutDays,
    dayExercises,
    workoutSessions,
    sessionExercises,
    sets,
    bodyWeightLogs,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `drovik-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Import ────────────────────────────────────────────────────────────────────

async function importData(file: File): Promise<string> {
  const text = await file.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(text) as Record<string, unknown>
  } catch {
    return 'Invalid file — could not parse JSON.'
  }

  if (!payload.version || !payload.exercises) {
    return 'Invalid backup file — missing required fields.'
  }

  // bulkPut: insert rows that don't exist, overwrite rows that do.
  // This is safe to run on a device that already has data — it merges rather than replaces.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as Record<string, any[]>
    await db.transaction('rw', [
      db.exercises,
      db.programs,
      db.workoutDays,
      db.dayExercises,
      db.workoutSessions,
      db.sessionExercises,
      db.sets,
      db.bodyWeightLogs,
    ], async () => {
      if (p.exercises)        await db.exercises.bulkPut(p.exercises)
      if (p.programs)         await db.programs.bulkPut(p.programs)
      if (p.workoutDays)      await db.workoutDays.bulkPut(p.workoutDays)
      if (p.dayExercises)     await db.dayExercises.bulkPut(p.dayExercises)
      if (p.workoutSessions)  await db.workoutSessions.bulkPut(p.workoutSessions)
      if (p.sessionExercises) await db.sessionExercises.bulkPut(p.sessionExercises)
      if (p.sets)             await db.sets.bulkPut(p.sets)
      if (p.bodyWeightLogs)   await db.bodyWeightLogs.bulkPut(p.bodyWeightLogs)
    })
    return ''  // empty string = success
  } catch (err: unknown) {
    return `Import failed: ${err instanceof Error ? err.message : 'unknown error'}`
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Settings() {
  const { session, signOut } = useAuth()

  const [exporting,      setExporting]      = useState(false)
  const [importStatus,   setImportStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [importError,    setImportError]    = useState('')
  const [importLoading,  setImportLoading]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      await exportData()
    } finally {
      setExporting(false)
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setImportStatus('idle')
    setImportError('')

    const error = await importData(file)

    if (error) {
      setImportError(error)
      setImportStatus('error')
    } else {
      setImportStatus('success')
    }

    setImportLoading(false)
    // Reset the file input so the same file can be re-imported if needed.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Account</h2>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{session?.user.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Signed in</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-red-500 font-medium hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Data</h2>
        <div className="flex flex-col gap-2">

          {/* Export */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
            <p className="text-sm font-medium mb-0.5">Export backup</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Downloads a JSON file containing all your exercises, programs, and workout history.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg bg-lime-400 text-gray-900 px-4 py-2 text-sm font-semibold active:bg-lime-500 disabled:opacity-60"
            >
              {exporting ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>

          {/* Import */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
            <p className="text-sm font-medium mb-0.5">Import backup</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Merges a previously exported JSON file into the local database. Existing records are
              overwritten if the imported version is newer.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold active:bg-gray-100 dark:active:bg-gray-700 disabled:opacity-60"
            >
              {importLoading ? 'Importing…' : 'Import JSON'}
            </button>

            {importStatus === 'success' && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                Import successful. Your data has been merged.
              </p>
            )}
            {importStatus === 'error' && (
              <p className="text-sm text-red-500 mt-2">{importError}</p>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">About</h2>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Drovik Fitness</p>
          <p className="text-xs">Local-first personal workout tracker. All data stored on your device and synced to Supabase when online.</p>
        </div>
      </section>
    </div>
  )
}
