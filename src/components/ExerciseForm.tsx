/**
 * ExerciseForm — slide-up modal for adding or editing an exercise.
 *
 * Pass `exercise` to edit an existing one, or leave it undefined to add a new one.
 * Call `onClose()` when you want to dismiss the modal (save or cancel).
 */

import { useState } from 'react'
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
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  const videoId        = videoUrl.trim() ? getYouTubeId(videoUrl.trim()) : null
  const thumbnailUrl   = videoId ? getYouTubeThumbnail(videoId) : null

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed)     { setError('Exercise name is required.'); return }
    if (!muscleGroup) { setError('Please select a muscle group.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp = now()

      const cleanVideoUrl = videoUrl.trim() || null

      if (exercise) {
        await db.exercises.update(exercise.id, {
          name: trimmed,
          category,
          muscleGroup,
          videoUrl:     cleanVideoUrl,
          instructions: instructions.trim(),
          updatedAt:    timestamp,
          syncedAt:     null,
        })
      } else {
        await db.exercises.add({
          id:           crypto.randomUUID(),
          name:         trimmed,
          category,
          muscleGroup,
          videoUrl:     cleanVideoUrl,
          instructions: instructions.trim(),
          isCustom:     true,
          createdAt:    timestamp,
          updatedAt:    timestamp,
          syncedAt:     null,
          deleted:      false,
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Slide-up panel */}
      <div className="w-full bg-gray-900 rounded-t-2xl shadow-xl p-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {exercise ? 'Edit Exercise' : 'Add Exercise'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 active:text-gray-300 p-1"
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Incline Dumbbell Press"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Muscle group */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Muscle Group
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="">Select muscle group…</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              YouTube URL <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            {/* Live thumbnail preview */}
            {thumbnailUrl && (
              <a href={videoUrl.trim()} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden relative">
                <img src={thumbnailUrl} alt="Video preview" className="w-full object-cover" />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </a>
            )}
            {videoUrl.trim() && !videoId && (
              <p className="text-xs text-amber-500 mt-1">Paste a youtube.com or youtu.be link to see a preview.</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Instructions <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Keep chest up, drive knees out, full depth"
              rows={3}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
            />
          </div>

          {/* Validation error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-lime-400 text-gray-900 py-3 font-semibold text-sm disabled:opacity-60 active:bg-lime-500"
          >
            {saving ? 'Saving…' : exercise ? 'Save Changes' : 'Add Exercise'}
          </button>
        </div>
      </div>
    </div>
  )
}
