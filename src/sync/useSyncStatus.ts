/**
 * useSyncStatus — runs a sync whenever the user goes online and tracks
 * whether a sync is currently in progress or has errored.
 *
 * Used in Layout.tsx to show a small sync indicator in the nav bar.
 */

import { useEffect, useState, useCallback } from 'react'
import { syncAll, type SyncStatus } from './sync'
import { useAuth } from '../contexts/AuthContext'

export function useSyncStatus() {
  const { session } = useAuth()
  const [status, setStatus] = useState<SyncStatus>('idle')

  const runSync = useCallback(async () => {
    if (!session) return
    setStatus('syncing')
    try {
      await syncAll(session.user.id)
      setStatus('idle')
    } catch (e) {
      console.error('Sync failed:', e)
      setStatus('error')
    }
  }, [session])

  // Run once on login / session restore.
  useEffect(() => {
    if (session) runSync()
  }, [session, runSync])

  // Re-sync whenever the device comes back online.
  useEffect(() => {
    window.addEventListener('online', runSync)
    return () => window.removeEventListener('online', runSync)
  }, [runSync])

  return { status, runSync }
}
