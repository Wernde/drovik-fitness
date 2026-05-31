/**
 * ExerciseForm — slide-up modal for adding or editing an exercise.
 *
 * Pass `exercise` to edit an existing one, or leave it undefined to add a new one.
 * Call `onClose()` when you want to dismiss the modal (save or cancel).
 */

import { useState, useEffect, useRef } from 'react'
import { db, now, type Exercise, type ExerciseCategory } from '../db/db'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'barbell',    label: 'Barbell' },
  { value: 'dumbbell',   label: 'Dumbbell' },
  { value: 'machine',    label: 'Machine' },
  { value: 'cable',      label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band',       label: 'Band' },
  { value: 'cardio',     label: 'Cardio' },
]

export const MUSCLE_GROUPS = [
  'Back',
  'Biceps',
  'Calves',
  'Cardio',
  'Chest',
  'Core',
  'Forearms',
  'Full Body',
  'Glutes',
  'Hamstrings',
  'Inner Thigh',
  'Lower Back',
  'Quads',
  'Shoulders',
  'Traps',
  'Triceps',
]

interface Props {
  exercise?: Exercise       // undefined → add mode; defined → edit mode
  onClose: () => void
}

export default function ExerciseForm({ exercise, onClose }: Props) {
  const [name,         setName]         = useState(exercise?.name ?? '')
  const [category,     setCategory]     = useState<ExerciseCategory>(exercise?.category ?? 'barbell')
  const [muscleGroup,  setMuscleGroup]  = useState(exercise?.muscleGroup ?? '')
  const [videoUrl,     setVideoUrl]     = useState(exercise?.videoUrl ?? '')
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  // Local video state
  const [localVideoBlob,    setLocalVideoBlob]    = useState<Blob | null>(null)
  const [localVideoObjUrl,  setLocalVideoObjUrl]  = useState<string | null>(null)
  const [localVideoMime,    setLocalVideoMime]    = useState<string>('video/mp4')
  const [deletingLocalVid,  setDeletingLocalVid]  = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Load existing local video on mount
  useEffect(() => {
    if (!exercise) return
    db.exerciseVideos.get(exercise.id).then((ev) => {
      if (!ev) return
      const url = URL.createObjectURL(ev.data)
      setLocalVideoBlob(ev.data)
      setLocalVideoObjUrl(url)
      setLocalVideoMime(ev.mimeType)
    })
    return () => {
      // Revoked in the delete handler or on unmount below
    }
  }, [exercise])

  useEffect(() => {
    return () => {
      if (localVideoObjUrl) URL.revokeObjectURL(localVideoObjUrl)
    }
  }, [localVideoObjUrl])

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (localVideoObjUrl) URL.revokeObjectURL(localVideoObjUrl)
    const url = URL.createObjectURL(file)
    setLocalVideoBlob(file)
    setLocalVideoObjUrl(url)
    setLocalVideoMime(file.type || 'video/mp4')
  }

  async function removeLocalVideo() {
    if (!exercise) {
      setLocalVideoBlob(null)
      if (localVideoObjUrl) URL.revokeObjectURL(localVideoObjUrl)
      setLocalVideoObjUrl(null)
      return
    }
    setDeletingLocalVid(true)
    await db.exerciseVideos.delete(exercise.id)
    setLocalVideoBlob(null)
    if (localVideoObjUrl) URL.revokeObjectURL(localVideoObjUrl)
    setLocalVideoObjUrl(null)
    setDeletingLocalVid(false)
  }

  const videoId      = videoUrl.trim() ? getYouTubeId(videoUrl.trim()) : null
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : null

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed)     { setError('Exercise name is required.'); return }
    if (!muscleGroup) { setError('Please select a muscle group.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp    = now()
      const cleanVideoUrl = videoUrl.trim() || null
      let exerciseId = exercise?.id ?? ''

      if (exercise) {
        await db.exercises.update(exercise.id, {
          name: trimmed, category, muscleGroup,
          videoUrl: cleanVideoUrl, instructions: instructions.trim(),
          updatedAt: timestamp, syncedAt: null,
        })
      } else {
        exerciseId = crypto.randomUUID()
        await db.exercises.add({
          id: exerciseId, name: trimmed, category, muscleGroup,
          videoUrl: cleanVideoUrl, instructions: instructions.trim(),
          isCustom: true, createdAt: timestamp, updatedAt: timestamp,
          syncedAt: null, deleted: false,
        })
      }

      // Save local video blob if one was picked
      if (localVideoBlob && exerciseId) {
        await db.exerciseVideos.put({
          exerciseId, mimeType: localVideoMime, data: localVideoBlob,
          createdAt: timestamp, updatedAt: timestamp,
        })
      }

      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    /* Darkened backdrop — tapping it closes the modal */
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Slide-up panel */}
      <div className="w-full bg-app-card rounded-t-2xl shadow-xl p-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-app-text">
            {exercise ? 'Edit Exercise' : 'Add Exercise'}
          </h2>
          <button
            onClick={onClose}
            className="text-app-muted active:text-app-text p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Incline Dumbbell Press"
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Muscle group */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Muscle Group
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select muscle group…</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Video — local upload OR YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Exercise Video <span className="text-app-muted font-normal">(optional)</span>
            </label>

            {/* Local video upload */}
            <div className="mb-3">
              <p className="text-xs text-app-muted mb-1.5">Your own recording (stored on-device)</p>
              {localVideoObjUrl ? (
                <div className="rounded-xl overflow-hidden bg-black relative">
                  <video
                    src={localVideoObjUrl}
                    controls
                    playsInline
                    className="w-full max-h-48 object-contain"
                  />
                  <button
                    onClick={removeLocalVideo}
                    disabled={deletingLocalVid}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full active:bg-black"
                  >
                    {deletingLocalVid ? '…' : 'Remove'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-app-border rounded-xl py-4 text-sm text-app-muted font-semibold flex items-center justify-center gap-2 active:bg-app-bg"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Upload video
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoFile}
              />
              <p className="text-[10px] text-app-faint mt-1">MP4, MOV, WEBM — stored only on this device</p>
            </div>

            {/* YouTube URL (optional fallback) */}
            <p className="text-xs text-app-muted mb-1.5">
              {localVideoObjUrl ? 'YouTube URL (shown if local video removed)' : 'Or paste a YouTube URL'}
            </p>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {thumbnailUrl && (
              <div className="mt-2 rounded-lg overflow-hidden relative">
                <img src={thumbnailUrl} alt="YouTube preview" className="w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            {videoUrl.trim() && !videoId && (
              <p className="text-xs text-amber-600 mt-1">Paste a youtube.com or youtu.be link to see a preview.</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Instructions <span className="text-app-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Keep chest up, drive knees out, full depth"
              rows={3}
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Validation error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-accent text-app-text py-3 font-semibold text-sm disabled:opacity-60 active:bg-accent-dark"
          >
            {saving ? 'Saving…' : exercise ? 'Save Changes' : 'Add Exercise'}
          </button>
        </div>
      </div>
    </div>
  )
}
