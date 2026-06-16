/**
 * Settings — app settings and data management.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUnits } from '../contexts/UnitsContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSyncStatus } from '../sync/useSyncStatus'
import { THEMES, saveTheme, getActiveThemeId } from '../lib/themes'
import { Button } from '../components/ui'

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
    foods,
    foodLogs,
    recipes,
    recipeFoods,
    nutritionLogs,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.programs.toArray(),
    db.workoutDays.toArray(),
    db.dayExercises.toArray(),
    db.workoutSessions.toArray(),
    db.sessionExercises.toArray(),
    db.sets.toArray(),
    db.bodyWeightLogs.toArray(),
    db.foods.filter((f) => f.isCustom).toArray(),
    db.foodLogs.toArray(),
    db.recipes.toArray(),
    db.recipeFoods.toArray(),
    db.nutritionLogs.toArray(),
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
    foods,
    foodLogs,
    recipes,
    recipeFoods,
    nutritionLogs,
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
      db.foods,
      db.foodLogs,
      db.recipes,
      db.recipeFoods,
      db.nutritionLogs,
    ], async () => {
      if (p.exercises)        await db.exercises.bulkPut(p.exercises)
      if (p.programs)         await db.programs.bulkPut(p.programs)
      if (p.workoutDays)      await db.workoutDays.bulkPut(p.workoutDays)
      if (p.dayExercises)     await db.dayExercises.bulkPut(p.dayExercises)
      if (p.workoutSessions)  await db.workoutSessions.bulkPut(p.workoutSessions)
      if (p.sessionExercises) await db.sessionExercises.bulkPut(p.sessionExercises)
      if (p.sets)             await db.sets.bulkPut(p.sets)
      if (p.bodyWeightLogs)   await db.bodyWeightLogs.bulkPut(p.bodyWeightLogs)
      if (p.foods)            await db.foods.bulkPut(p.foods)
      if (p.foodLogs)         await db.foodLogs.bulkPut(p.foodLogs)
      if (p.recipes)          await db.recipes.bulkPut(p.recipes)
      if (p.recipeFoods)      await db.recipeFoods.bulkPut(p.recipeFoods)
      if (p.nutritionLogs)    await db.nutritionLogs.bulkPut(p.nutritionLogs)
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
    <div className="flex rounded-input overflow-hidden border border-app-border">
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
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { units, setWeight, setMeasurement, setWater, setTemperature } = useUnits()

  const { status: syncStatus, forceResync, lastSyncAt, lastError } = useSyncStatus()
  const [forceResyncing, setForceResyncing] = useState(false)
  const [activeThemeId, setActiveThemeId] = useState(getActiveThemeId)

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

  function handleThemeChange(id: string) {
    saveTheme(id)
    setActiveThemeId(id)
  }

  async function handleForceResync() {
    setForceResyncing(true)
    try { await forceResync() } finally { setForceResyncing(false) }
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
    <div className="page-x pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex-none w-9 h-9 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-app-border"
          aria-label="Back"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-app-text">Settings</h1>
      </div>

      {/* ── Appearance ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Appearance</h2>
        <div className="rounded-card bg-app-surface border border-app-border px-4 py-4">
          <p className="text-sm font-semibold text-app-text mb-1">Colour theme</p>
          <p className="text-xs text-app-muted mb-4">Tap any theme to switch instantly.</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = activeThemeId === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  {/* Mini app preview */}
                  <div
                    className="w-full rounded-card overflow-hidden"
                    style={{
                      background: theme.appBg,
                      outline: isActive ? `3px solid ${theme.accent}` : `1.5px solid ${theme.appBorder}`,
                      outlineOffset: isActive ? '2px' : '0px',
                    }}
                  >
                    {/* Fake top bar */}
                    <div
                      className="px-2 pt-2 pb-1.5 flex items-center gap-1"
                      style={{ borderBottom: `1px solid ${theme.appBorder}` }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }} />
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: theme.appMuted + '40' }} />
                    </div>
                    {/* Fake card */}
                    <div className="p-2 flex flex-col gap-1.5">
                      <div
                        className="rounded-input p-2 flex flex-col gap-1"
                        style={{ background: theme.appCard, border: `1px solid ${theme.appBorder}` }}
                      >
                        <div className="h-1.5 rounded-full w-10" style={{ background: theme.appText + '70' }} />
                        <div className="h-1 rounded-full w-7" style={{ background: theme.appMuted + '60' }} />
                      </div>
                      {/* Fake accent button */}
                      <div
                        className="h-4 rounded-lg"
                        style={{ background: theme.accent }}
                      />
                    </div>
                  </div>
                  <p
                    className="text-[11px] font-bold"
                    style={{ color: isActive ? theme.accent : 'var(--color-app-muted)' }}
                  >
                    {theme.name}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Units ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Units</h2>
        <div className="rounded-card bg-app-surface border border-app-border divide-y divide-app-border overflow-hidden">
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
        <div className="rounded-card bg-app-surface border border-app-border px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-app-text">{session?.user.email}</p>
            <p className="text-xs text-app-muted mt-0.5">Signed in</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-error-text font-semibold active:opacity-80"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* ── Sync ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Sync</h2>
        <div className="rounded-card bg-app-surface border border-app-border divide-y divide-app-border overflow-hidden">

          {/* Status row */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
              syncStatus === 'error'   ? 'bg-red-400' :
                                        'bg-green-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-app-text">
                {syncStatus === 'syncing' ? 'Syncing…' :
                 syncStatus === 'error'   ? 'Sync error' :
                                           'Synced'}
              </p>
              {lastSyncAt && syncStatus !== 'syncing' && (
                <p className="text-xs text-app-muted">
                  Last synced {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Error details */}
          {lastError && (
            <div className="px-4 py-3 bg-error-bg">
              <p className="text-xs font-bold text-red-600 mb-1">Error detail</p>
              <p className="text-xs text-error-text font-mono break-all">{lastError}</p>
            </div>
          )}

          {/* Force re-sync */}
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-app-text mb-0.5">Force full re-sync</p>
            <p className="text-xs text-app-muted mb-3">
              Clears the sync cursor and re-downloads all data from Supabase. Use this if data is missing on this device.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleForceResync}
              disabled={forceResyncing || syncStatus === 'syncing'}
            >
              {forceResyncing ? 'Re-syncing…' : 'Re-sync now'}
            </Button>
          </div>

        </div>
      </section>

      {/* ── Data ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Data</h2>
        <div className="flex flex-col gap-2">

          {/* Export */}
          <div className="rounded-card bg-app-surface border border-app-border px-4 py-4">
            <p className="text-sm font-semibold text-app-text mb-0.5">Export backup</p>
            <p className="text-xs text-app-muted mb-3">
              Downloads a JSON file with all exercises, programs, workout history, and nutrition data.
            </p>
            <Button variant="primary" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export JSON'}
            </Button>
          </div>

          {/* Import */}
          <div className="rounded-card bg-app-surface border border-app-border px-4 py-4">
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
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importLoading}>
              {importLoading ? 'Importing…' : 'Import JSON'}
            </Button>

            {importStatus === 'success' && (
              <p className="text-sm text-success-text mt-2">Import successful — data merged.</p>
            )}
            {importStatus === 'error' && (
              <p className="text-sm text-error-text mt-2">{importError}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Apple Watch ── */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Apple Watch</h2>
        <div className="rounded-card bg-app-surface border border-app-border divide-y divide-app-border overflow-hidden">

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
        <div className="rounded-card bg-app-surface border border-app-border px-4 py-4">
          <p className="text-sm font-semibold text-app-text mb-0.5">Anthropic API key</p>
          <p className="text-xs text-app-muted mb-3">
            Powers the AI Coach on the More tab. Get a key at console.anthropic.com. Stored locally on this device only.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            className="w-full rounded-input border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text placeholder-app-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label mb-3 font-mono"
          />
          <Button variant="primary" size="sm" onClick={handleSaveApiKey}>
            {apiKeySaved ? 'Saved!' : 'Save key'}
          </Button>
        </div>
      </section>

      {/* ── About ── */}
      <section>
        <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">About</h2>
        <div className="rounded-card bg-app-surface border border-app-border px-4 py-4">
          <p className="text-sm font-semibold text-app-text mb-1">Drovik Fitness</p>
          <p className="text-xs text-app-muted">Local-first personal workout tracker. All data stored on your device and synced to Supabase when online.</p>
        </div>
      </section>
    </div>
  )
}
