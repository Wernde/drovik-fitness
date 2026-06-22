/** Shared utility functions used across multiple screens. */

const MAX_REASONABLE_WORKOUT_MINS = 12 * 60

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return 'In progress'
  const mins = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 0) return 'Check time'
  if (mins > MAX_REASONABLE_WORKOUT_MINS) return 'Left open'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
