/**
 * ToastContext — lightweight global notification system.
 *
 * Call showToast(message) from any component. Toasts auto-dismiss after 3.5 s.
 * Type 'error' = red, 'success' = green, 'info' = dark grey.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'error' | 'success' | 'info'

interface Toast {
  id:      string
  message: string
  type:    ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack — fixed top, above everything */}
      <div className="fixed top-4 left-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'rounded-xl px-4 py-3 text-sm font-medium shadow-lg pointer-events-auto',
              toast.type === 'error'   ? 'bg-red-500 text-white' :
              toast.type === 'success' ? 'bg-emerald-500 text-white' :
                                         'bg-gray-800 text-white',
            ].join(' ')}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
