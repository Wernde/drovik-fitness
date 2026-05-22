/** Shared utility functions used across multiple screens. */

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return 'In progress'
  const mins = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
