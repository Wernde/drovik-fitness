/**
 * Profile — personal details, photo, fitness goals, and account settings.
 *
 * The Fitness & Goals section writes to both Supabase profiles (height, activity,
 * diet) and localStorage (full TDEE profile) so Home donuts, diary targets,
 * and AI Coach all pick up the updated values immediately.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  loadProfile, saveProfile,
  ACTIVITY_LABELS, DIET_PROGRAMS,
  calcBMR, calcTDEE, calcMacros,
  type Sex, type ActivityLevel, type DietId,
} from '../lib/tdee'

// ── Goal labels (user-friendly names for the diet programs) ───────────────────

const GOAL_LABELS: Record<DietId, string> = {
  standard:      'Body Recomp (maintenance)',
  high_protein:  'Muscle Building — High Protein',
  cutting:       'Weight Loss (−500 cal deficit)',
  bulking:       'Muscle Gain (+300 cal surplus)',
  keto:          'Ketogenic (very low carb)',
  paleo:         'Paleo (whole foods)',
  mediterranean: 'Mediterranean (heart-healthy)',
}

// ── Personal section fields ───────────────────────────────────────────────────

interface PersonalData {
  first_name: string
  last_name: string
  date_of_birth: string
  address: string
  mobile: string
  weight_kg: string
  avatar_url: string
}

const EMPTY_PERSONAL: PersonalData = {
  first_name: '', last_name: '', date_of_birth: '',
  address: '', mobile: '', weight_kg: '', avatar_url: '',
}

// ── Fitness section fields ─────────────────────────────────────────────────────

interface FitnessData {
  height_cm: string
  sex: Sex | ''
  age: string
  activity_level: ActivityLevel | ''
  diet_id: DietId | ''
}

const EMPTY_FITNESS: FitnessData = {
  height_cm: '', sex: '', age: '', activity_level: '', diet_id: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [personal,      setPersonal]      = useState<PersonalData>(EMPTY_PERSONAL)
  const [fitness,       setFitness]       = useState<FitnessData>(EMPTY_FITNESS)
  const [email,         setEmail]         = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [uploadingImg,  setUploadingImg]  = useState(false)
  const [savedMsg,      setSavedMsg]      = useState('')
  const [error,         setError]         = useState('')

  // Latest body weight for TDEE preview
  const latestWeight = useLiveQuery(async () => {
    const logs = await db.bodyWeightLogs.filter((l) => !l.deleted).toArray()
    logs.sort((a, b) => b.date.localeCompare(a.date))
    return logs[0]?.weight ?? null
  }, [])

  useEffect(() => {
    if (!session) return
    setEmail(session.user.email ?? '')

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return

        setPersonal({
          first_name:    data.first_name    ?? '',
          last_name:     data.last_name     ?? '',
          date_of_birth: data.date_of_birth ?? '',
          address:       data.address       ?? '',
          mobile:        data.mobile        ?? '',
          weight_kg:     data.weight_kg != null ? String(data.weight_kg) : '',
          avatar_url:    data.avatar_url    ?? '',
        })

        // Load fitness from localStorage first (most recent), fall back to Supabase
        const stored = loadProfile()
        const dob = data.date_of_birth ?? ''
        const computedAge = dob
          ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)))
          : ''

        setFitness({
          height_cm:      stored?.heightCm      ? String(stored.heightCm)      : (data.height_cm   ? String(data.height_cm)   : ''),
          sex:            stored?.sex            ?? '',
          age:            stored?.age            ? String(stored.age)           : computedAge,
          activity_level: stored?.activityLevel  ?? (data.activity_level ?? ''),
          diet_id:        stored?.dietId         ?? (data.diet_id         ?? ''),
        })
      })
  }, [session])

  // Live TDEE preview from current fitness inputs
  const tdeePreview = useMemo(() => {
    const h = parseFloat(fitness.height_cm)
    const a = parseFloat(fitness.age)
    const wt = latestWeight ?? parseFloat(personal.weight_kg)
    if (!h || !a || !wt || !fitness.sex || !fitness.activity_level || !fitness.diet_id) return null
    const bmr  = calcBMR(wt, h, a, fitness.sex as Sex)
    const tdee = calcTDEE(bmr, fitness.activity_level as ActivityLevel)
    const diet = DIET_PROGRAMS.find((d) => d.id === fitness.diet_id)!
    return calcMacros(wt, tdee, diet)
  }, [fitness, latestWeight, personal.weight_kg])

  function setP(field: keyof PersonalData, val: string) {
    setPersonal((p) => ({ ...p, [field]: val }))
  }

  function setF(field: keyof FitnessData, val: string) {
    setFitness((f) => ({ ...f, [field]: val }))
    // When DOB changes, recompute age
    if (field === 'date_of_birth') {
      const age = Math.floor((Date.now() - new Date(val).getTime()) / (365.25 * 24 * 3600 * 1000))
      if (!isNaN(age) && age > 0) setFitness((f) => ({ ...f, date_of_birth: val, age: String(age) }))
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setUploadingImg(true)
    setError('')
    try {
      const ext  = file.name.split('.').pop()
      const path = `${session.user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      setPersonal((p) => ({ ...p, avatar_url: url }))
      await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: url, updated_at: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingImg(false)
    }
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      const wt = personal.weight_kg.trim() === '' ? null : parseFloat(personal.weight_kg)

      // ── Save personal + fitness fields to Supabase ───────────────────────
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id:             session.user.id,
        first_name:     personal.first_name.trim()    || null,
        last_name:      personal.last_name.trim()     || null,
        date_of_birth:  personal.date_of_birth        || null,
        address:        personal.address.trim()       || null,
        mobile:         personal.mobile.trim()        || null,
        weight_kg:      isNaN(wt as number)           ? null : wt,
        // Fitness columns
        height_cm:      fitness.height_cm ? parseFloat(fitness.height_cm) : null,
        activity_level: fitness.activity_level        || null,
        diet_id:        fitness.diet_id               || null,
        updated_at:     new Date().toISOString(),
      })
      if (profileErr) throw profileErr

      // ── Save full TDEE profile to localStorage ───────────────────────────
      const h  = parseFloat(fitness.height_cm)
      const a  = parseFloat(fitness.age)
      if (h && a && fitness.sex && fitness.activity_level && fitness.diet_id) {
        saveProfile({
          heightCm:      h,
          age:           a,
          sex:           fitness.sex           as Sex,
          activityLevel: fitness.activity_level as ActivityLevel,
          dietId:        fitness.diet_id        as DietId,
        })
      }

      // ── Email / password ─────────────────────────────────────────────────
      if (email.trim() && email.trim() !== session.user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() })
        if (emailErr) throw emailErr
      }
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) throw new Error('Password must be at least 6 characters.')
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword.trim() })
        if (pwErr) throw pwErr
        setNewPassword('')
      }

      setSavedMsg('Profile saved!')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const initials = [personal.first_name, personal.last_name]
    .filter(Boolean).map((s) => s[0].toUpperCase()).join('') || '?'

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-8">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-app-border bg-app-card sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-app-border flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-app-text flex-1">My Profile</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingImg}
            className="relative w-24 h-24 rounded-full bg-accent flex items-center justify-center overflow-hidden active:opacity-80"
          >
            {personal.avatar_url
              ? <img src={personal.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl font-extrabold text-app-text">{initials}</span>
            }
            {uploadingImg && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zM12 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-app-muted">Tap photo to change</p>
        </div>

        {/* ── Personal info ── */}
        <section>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Personal</h2>
          <div className="rounded-2xl bg-app-card border border-app-border overflow-hidden">
            {([
              ['First name',    'first_name',    'text',   'Dewald'],
              ['Last name',     'last_name',     'text',   'Van Zyl'],
              ['Date of birth', 'date_of_birth', 'date',   ''],
              ['Mobile',        'mobile',        'tel',    '+61 4xx xxx xxx'],
              ['Address',       'address',       'text',   '123 Gym St, Sydney'],
            ] as [string, keyof PersonalData, string, string][]).map(([label, field, type, ph], i, arr) => (
              <div key={field} className={`px-4 py-3 flex items-center gap-3 ${i < arr.length - 1 ? 'border-b border-app-border' : ''}`}>
                <span className="text-sm text-app-muted w-28 flex-shrink-0">{label}</span>
                <input
                  type={type}
                  value={personal[field]}
                  onChange={(e) => setP(field, e.target.value)}
                  placeholder={ph}
                  inputMode={type === 'tel' ? 'tel' : undefined}
                  className="flex-1 bg-transparent text-sm text-app-text placeholder-app-faint focus:outline-none text-right"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Fitness & Goals ── */}
        <section>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Fitness & Goals</h2>
          <div className="rounded-2xl bg-app-card border border-app-border overflow-hidden">

            {/* Height */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-app-border">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">Height (cm)</span>
              <input
                type="number"
                inputMode="numeric"
                value={fitness.height_cm}
                onChange={(e) => setF('height_cm', e.target.value)}
                placeholder="178"
                className="flex-1 bg-transparent text-sm text-app-text placeholder-app-faint focus:outline-none text-right"
              />
            </div>

            {/* Age */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-app-border">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">Age</span>
              <input
                type="number"
                inputMode="numeric"
                value={fitness.age}
                onChange={(e) => setF('age', e.target.value)}
                placeholder="28"
                className="flex-1 bg-transparent text-sm text-app-text placeholder-app-faint focus:outline-none text-right"
              />
            </div>

            {/* Sex */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-app-border">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">Sex</span>
              <div className="flex gap-2 ml-auto">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setF('sex', s)}
                    className={[
                      'px-4 py-1.5 rounded-full text-xs font-bold border transition-colors',
                      fitness.sex === s
                        ? 'bg-accent border-accent text-app-text'
                        : 'bg-app-bg border-app-border text-app-muted',
                    ].join(' ')}
                  >
                    {s === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity level */}
            <div className="px-4 py-3 border-b border-app-border">
              <span className="text-sm text-app-muted block mb-2">Activity Level</span>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setF('activity_level', a)}
                    className={[
                      'w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors',
                      fitness.activity_level === a
                        ? 'bg-accent-light border-accent text-accent-dark font-bold'
                        : 'bg-app-bg border-app-border text-app-muted',
                    ].join(' ')}
                  >
                    {ACTIVITY_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal / diet */}
            <div className="px-4 py-3">
              <span className="text-sm text-app-muted block mb-2">My Goal</span>
              <div className="flex flex-col gap-1.5">
                {DIET_PROGRAMS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setF('diet_id', d.id)}
                    className={[
                      'w-full text-left px-3 py-2.5 rounded-xl border transition-colors',
                      fitness.diet_id === d.id
                        ? 'bg-accent-light border-accent'
                        : 'bg-app-bg border-app-border',
                    ].join(' ')}
                  >
                    <p className={`text-xs font-bold ${fitness.diet_id === d.id ? 'text-accent-dark' : 'text-app-text'}`}>
                      {GOAL_LABELS[d.id as DietId]}
                    </p>
                    <p className="text-[10px] text-app-muted mt-0.5">{d.tagline}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live TDEE preview */}
          {tdeePreview && (
            <div className="mt-3 bg-accent-light rounded-2xl border border-accent p-4">
              <p className="text-xs font-bold text-accent-dark mb-2">Your Daily Targets</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: `${tdeePreview.calories}`, unit: 'kcal' },
                  { label: 'Protein',  value: `${tdeePreview.proteinG}`, unit: 'g' },
                  { label: 'Carbs',    value: `${tdeePreview.carbsG}`,   unit: 'g' },
                  { label: 'Fat',      value: `${tdeePreview.fatG}`,     unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="text-center">
                    <p className="text-base font-extrabold text-app-text">{value}<span className="text-[10px] text-app-muted ml-0.5">{unit}</span></p>
                    <p className="text-[10px] text-app-muted">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-app-muted mt-2">These targets update everywhere in the app when you save.</p>
            </div>
          )}
        </section>

        {/* ── Account ── */}
        <section>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Account</h2>
          <div className="rounded-2xl bg-app-card border border-app-border overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-app-border">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm text-app-text focus:outline-none text-right"
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-app-muted w-28 flex-shrink-0">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep"
                className="flex-1 bg-transparent text-sm text-app-text placeholder-app-faint focus:outline-none text-right"
              />
            </div>
          </div>
        </section>

        {error    && <p className="text-sm text-red-500 text-center">{error}</p>}
        {savedMsg && <p className="text-sm text-green-600 text-center font-semibold">{savedMsg}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-accent text-app-text py-3.5 font-bold text-sm active:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>

        <button
          onClick={signOut}
          className="w-full rounded-2xl border border-red-200 text-red-500 py-3.5 font-bold text-sm active:bg-red-50"
        >
          Sign Out
        </button>

      </div>
    </div>
  )
}
