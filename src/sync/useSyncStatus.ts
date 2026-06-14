/**
 * useSyncStatus — runs a sync whenever the user goes online and tracks
 * whether a sync is currently in progress or has errored.
 *
 * Used in Layout.tsx to show a small sync indicator in the nav bar.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { syncAll, type SyncStatus } from './sync'
import { useAuth } from '../contexts/AuthContext'

const SYNC_INTERVAL_MS = 30_000

export function useSyncStatus() {
  const { session } = useAuth()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const syncingRef = useRef(false)

  const runSync = useCallback(async () => {
    if (!session || syncingRef.current) return
    syncingRef.current = true
    setStatus('syncing')
    try {
      await syncAll(session.user.id)
      setStatus('idle')
    } catch (e) {
      console.error('Sync failed:', e)
      setStatus('error')
    } finally {
      syncingRef.current = false
    }
  }, [session])

  // Run once on login / session restore.
  useEffect(() => {
    if (session) runSync()
  }, [session, runSync])

  // Re-sync when the device comes back online.
  useEffect(() => {
    window.addEventListener('online', runSync)
    return () => window.removeEventListener('online', runSync)
  }, [runSync])

  // Re-sync when the user switches back to this tab/app.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') runSync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [runSync])

  // Background sync every 30 s while online.
  useEffect(() => {
    if (!session) return
    const id = setInterval(() => {
      if (navigator.onLine) runSync()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [session, runSync])

  return { status, runSync }
}
