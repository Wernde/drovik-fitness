/**
 * Profile — view and edit personal details, photo, email and password.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ProfileData {
  first_name:    string
  last_name:     string
  date_of_birth: string
  address:       string
  mobile:        string
  weight_kg:     string
  avatar_url:    string
}

const EMPTY: ProfileData = {
  first_name: '', last_name: '', date_of_birth: '',
  address: '', mobile: '', weight_kg: '', avatar_url: '',
}

export default function Profile() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [profile,       setProfile]       = useState<ProfileData>(EMPTY)
  const [email,         setEmail]         = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [uploadingImg,  setUploadingImg]  = useState(false)
  const [savedMsg,      setSavedMsg]      = useState('')
  const [error,         setError]         = useState('')

  useEffect(() => {
    if (!session) return
    setEmail(session.user.email ?? '')
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            first_name:    data.first_name    ?? '',
            last_name:     data.last_name     ?? '',
            date_of_birth: data.date_of_birth ?? '',
            address:       data.address       ?? '',
            mobile:        data.mobile        ?? '',
            weight_kg:     data.weight_kg != null ? String(data.weight_kg) : '',
            avatar_url:    data.avatar_url    ?? '',
          })
        }
      })
  }, [session])

  function set(field: keyof ProfileData, val: string) {
    setProfile((p) => ({ ...p, [field]: val }))
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
      // bust cache
      const url = `${publicUrl}?t=${Date.now()}`
      setProfile((p) => ({ ...p, avatar_url: url }))
      await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: url, updated_at: new Date().toISOString() })
    } catch (err: unknown) {
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
      const wt = profile.weight_kg.trim() === '' ? null : parseFloat(profile.weight_kg)

      const { error: profileErr } = await supabase.from('profiles').upsert({
        id:            session.user.id,
        first_name:    profile.first_name.trim()    || null,
        last_name:     profile.last_name.trim()     || null,
        date_of_birth: profile.date_of_birth        || null,
        address:       profile.address.trim()       || null,
        mobile:        profile.mobile.trim()         || null,
        weight_kg:     isNaN(wt as number) ? null : wt,
        updated_at:    new Date().toISOString(),
      })
      if (profileErr) throw profileErr

      // Email change
      if (email.trim() && email.trim() !== session.user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() })
        if (emailErr) throw emailErr
      }

      // Password change
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) throw new Error('Password must be at least 6 characters.')
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword.trim() })
        if (pwErr) throw pwErr
        setNewPassword('')
      }

      setSavedMsg('Profile saved!')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map((s) => s[0].toUpperCase()).join('') || '?'

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-app-border bg-app-card">
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
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
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

        {/* Personal info */}
        <section>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Personal</h2>
          <div className="rounded-2xl bg-app-card border border-app-border overflow-hidden">
            {([
              ['First name',     'first_name',    'text',  'Dewald'],
              ['Last name',      'last_name',     'text',  'Van Zyl'],
              ['Date of birth',  'date_of_birth', 'date',  ''],
              ['Mobile',         'mobile',        'tel',   '+61 4xx xxx xxx'],
              ['Address',        'address',       'text',  '123 Gym St, Sydney'],
              ['Weight (kg)',    'weight_kg',     'number','83'],
            ] as [string, keyof ProfileData, string, string][]).map(([label, field, type, ph], i, arr) => (
              <div key={field} className={`px-4 py-3 flex items-center gap-3 ${i < arr.length - 1 ? 'border-b border-app-border' : ''}`}>
                <span className="text-sm text-app-muted w-28 flex-shrink-0">{label}</span>
                <input
                  type={type}
                  value={profile[field]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder={ph}
                  inputMode={type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : undefined}
                  className="flex-1 bg-transparent text-sm text-app-text placeholder-app-faint focus:outline-none text-right"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Account */}
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

        {error   && <p className="text-sm text-red-500 text-center">{error}</p>}
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
