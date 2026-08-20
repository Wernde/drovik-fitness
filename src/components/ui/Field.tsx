import { useId } from 'react'

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label:      React.ReactNode
  id?:        string
  error?:     string
  hint?:      string
  multiline?: boolean
  rows?:      number
}

const inputBase = (hasError: boolean) =>
  [
    'w-full min-w-0 max-w-full rounded-input border bg-app-bg text-app-text placeholder-app-faint',
    // iOS zooms the whole PWA when a focused input is smaller than 16px.
    'px-3 py-2.5 text-base sm:text-sm',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-info-text',
    hasError ? 'border-error-text' : 'border-app-border focus-visible:border-info-text',
  ].join(' ')

export default function Field({
  label,
  id,
  error,
  hint,
  multiline = false,
  rows = 3,
  className = '',
  ...rest
}: FieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const cls = [inputBase(!!error), multiline ? 'resize-none' : '', className].filter(Boolean).join(' ')

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-app-text">
        {label}
      </label>

      {multiline ? (
        <textarea
          id={fieldId}
          rows={rows}
          className={cls}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(rest as any)}
        />
      ) : (
        <input id={fieldId} className={cls} {...rest} />
      )}

      {hint && !error && <p className="text-xs text-app-muted">{hint}</p>}
      {error          && <p className="text-xs text-error-text">{error}</p>}
    </div>
  )
}
