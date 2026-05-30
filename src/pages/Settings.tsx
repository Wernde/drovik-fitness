/**
 * Settings — app settings and data management.
 */

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUnits } from '../contexts/UnitsContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

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
    return ''
  } catch (err: unknown) {
    return `Import failed: ${err instanceof Error ? err.message : 'unknown error'}`
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

function UnitToggle<T extends string>({
  value, options, onChange,
}: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-app-border">
      {options.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            value === id ? 'bg-accent text-app-text' : 'bg-app-bg text-app-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex-shrink-0 text-xs font-semibold text-accent-dark bg-accent-light border border-accent/30 px-2.5 py-1 rounded-full active:bg-accent"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function Settings() {
  const { session, signOut } = useAuth()
  const { units, setWeight, setMeasurement, setWater, setTemperature } = useUnits()

  const [exporting,      setExporting]      = useState(false)
  const [importStatus,   setImportStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [importError,    setImportError]    = useState('')
  const [importLoading,  setImportLoading]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [apiKey,      setApiKey]      = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const latestHealth = useLiveQuery(
    () => db.healthMetrics.filter(h => !h.deleted).toArray()
      .then(a => a.sort((x, y) => y.date.localeCompare(x.date))[0] ?? null),
    [],
  )

  useEffect(() => {
    setApiKey(localStorage.getItem('drovik:apiKey') ?? '')
  }, [])

  const userId   = session?.user.id ?? ''
  const restUrl  = `${SUPABASE_URL}/rest/v1`

  function handleSaveApiKey() {
    localStorage.setItem('drovik:apiKey', apiKey.trim())
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-extrabold text-app-text mb-6">Settings</h1>

      {/* ── Units ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Units</h2>
        <div className="rounded-2xl bg-app-card border border-app-border divide-y divide-app-border overflow-hidden">
          {([
            { label: 'Weight',       node: <UnitToggle value={units.weight}      options={[{ id: 'kg' as const, label: 'kg' }, { id: 'lbs' as const, label: 'lbs' }]}           onChange={setWeight}      /> },
            { label: 'Measurements', node: <UnitToggle value={units.measurement} options={[{ id: 'cm' as const, label: 'cm' }, { id: 'in' as const, label: 'in' }]}            onChange={setMeasurement} /> },
            { label: 'Water',        node: <UnitToggle value={units.water}       options={[{ id: 'ml' as const, label: 'ml' }, { id: 'fl_oz' as const, label: 'fl oz' }]}      onChange={setWater}       /> },
            { label: 'Temperature',  node: <UnitToggle value={units.temperature} options={[{ id: 'c' as const, label: '°C' }, { id: 'f' as const, label: '°F' }]}              onChange={setTemperature} /> },
          ] as { label: string; node: React.ReactNode }[]).map(({ label, node }) => (
            <div key={label} className="flex items-center gap-4 px-4 py-3">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">{label}</span>
              <div className="flex-1">{node}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-app-muted mt-2 px-1">Defaults are Australian metric. Data is always stored in metric — units only affect display.</p>
      </section>

      {/* ── Account ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Account</h2>
        <div className="rounded-2xl bg-app-card border border-app-border px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-app-text">{session?.user.email}</p>
            <p className="text-xs text-app-muted mt-0.5">Signed in</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-red-500 font-semibold active:text-red-600"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* ── Data ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Data</h2>
        <div className="flex flex-col gap-2">

          {/* Export */}
          <div className="rounded-2xl bg-app-card border border-app-border px-4 py-4">
            <p className="text-sm font-semibold text-app-text mb-0.5">Export backup</p>
            <p className="text-xs text-app-muted mb-3">
              Downloads a JSON file with all exercises, programs, and workout history.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-2xl bg-accent text-app-text px-4 py-2 text-sm font-bold active:bg-accent-dark disabled:opacity-60"
            >
              {exporting ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>

          {/* Import */}
          <div className="rounded-2xl bg-app-card border border-app-border px-4 py-4">
            <p className="text-sm font-semibold text-app-text mb-0.5">Import backup</p>
            <p className="text-xs text-app-muted mb-3">
              Merges a previously exported JSON file. Existing records are overwritten if the imported version is newer.
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
              className="rounded-2xl border border-app-border text-app-muted bg-app-bg px-4 py-2 text-sm font-bold active:bg-app-border disabled:opacity-60"
            >
              {importLoading ? 'Importing…' : 'Import JSON'}
            </button>

            {importStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2">Import successful — data merged.</p>
            )}
            {importStatus === 'error' && (
              <p className="text-sm text-red-500 mt-2">{importError}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Apple Watch ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Apple Watch</h2>
        <div className="rounded-2xl bg-app-card border border-app-border divide-y divide-app-border overflow-hidden">

          {/* Status */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${latestHealth ? 'bg-green-500' : 'bg-app-faint'}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-app-text">
                {latestHealth ? 'Connected' : 'Not set up'}
              </p>
              <p className="text-xs text-app-muted">
                {latestHealth
                  ? `Last data: ${latestHealth.date}`
                  : 'Follow the steps below to set up your Apple Shortcut'}
              </p>
            </div>
          </div>

          {/* User ID */}
          <div className="px-4 py-3">
            <p className="text-xs text-app-muted mb-1">Your User ID <span className="text-app-faint">(paste into Shortcut)</span></p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-mono text-app-text bg-app-bg border border-app-border rounded-lg px-2 py-1.5 truncate">{userId}</p>
              <CopyButton text={userId} />
            </div>
          </div>

          {/* REST URL */}
          <div className="px-4 py-3">
            <p className="text-xs text-app-muted mb-1">Supabase REST URL</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-mono text-app-text bg-app-bg border border-app-border rounded-lg px-2 py-1.5 truncate">{restUrl}</p>
              <CopyButton text={restUrl} />
            </div>
          </div>

          {/* Anon key */}
          <div className="px-4 py-3">
            <p className="text-xs text-app-muted mb-1">Anon Key <span className="text-app-faint">(apikey header)</span></p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-mono text-app-text bg-app-bg border border-app-border rounded-lg px-2 py-1.5 truncate">{SUPABASE_ANON.slice(0, 24)}…</p>
              <CopyButton text={SUPABASE_ANON} />
            </div>
          </div>

          {/* Instructions */}
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-app-text mb-3">Shortcut Setup (iPhone)</p>
            <ol className="space-y-3 text-xs text-app-muted">
              {[
                'Open the Shortcuts app → tap + to create a new Shortcut. Name it "Drovik Health Sync".',
                'Add action: Get Health Sample → Resting Heart Rate → Last 24 Hours → Latest sample.',
                'Add action: Get Health Sample → Active Energy Burned → Today → Sum.',
                'Add action: Get Health Sample → Steps → Today → Sum.',
                'Add action: Get Workouts → Last 7 Days.',
                'Add action: Dictionary — add these keys:\n• user_id  →  [paste User ID above]\n• date  →  (Format Date → Current Date → "yyyy-MM-dd")\n• resting_hr  →  [result of step 2]\n• active_calories  →  [round result of step 3]\n• steps  →  [round result of step 4]\n• updated_at  →  (Format Date → Current Date → "ISO 8601")',
                `Add action: URL → paste: ${restUrl}/health_metrics`,
                'Add action: Get Contents of URL → Method: POST → Request Body: JSON (select Dictionary from step 6) → Add headers:\n• apikey  →  [Copy Anon Key above]\n• Content-Type  →  application/json\n• Prefer  →  resolution=merge-duplicates',
                'For workouts: add a "Repeat with each" loop over the workouts from step 5. Inside the loop add a Dictionary (user_id, workout_date, workout_type, duration_secs, active_calories, avg_hr, max_hr) then another URL + Get Contents of URL posting to .../health_workouts with the same headers.',
                'Add an Automation (Settings → Automation → New → Time of Day, e.g. 9 pm daily) and run this Shortcut. Your Apple Watch stats will appear in the app after the first run.',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-app-text text-[10px] font-extrabold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed whitespace-pre-line">{step}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </section>

      {/* ── AI Coach ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">AI Coach</h2>
        <div className="rounded-2xl bg-app-card border border-app-border px-4 py-4">
          <p className="text-sm font-semibold text-app-text mb-0.5">Anthropic API key</p>
          <p className="text-xs text-app-muted mb-3">
            Powers the AI Coach on the More tab. Get a key at console.anthropic.com. Stored locally on this device only.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text placeholder-app-faint focus:outline-none focus:ring-2 focus:ring-accent mb-3 font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="rounded-2xl bg-accent text-app-text px-4 py-2 text-sm font-bold active:bg-accent-dark"
          >
            {apiKeySaved ? 'Saved!' : 'Save key'}
          </button>
        </div>
      </section>

      {/* ── About ── */}
      <section>
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">About</h2>
        <div className="rounded-2xl bg-app-card border border-app-border px-4 py-4">
          <p className="text-sm font-semibold text-app-text mb-1">Drovik Fitness</p>
          <p className="text-xs text-app-muted">Local-first personal workout tracker. All data stored on your device and synced to Supabase when online.</p>
        </div>
      </section>
    </div>
  )
}
