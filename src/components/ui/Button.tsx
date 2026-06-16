import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  fullWidth?: boolean
  loading?:   boolean
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-accent text-app-text active:bg-accent-hover disabled:opacity-60',
  secondary: 'border border-app-border text-app-muted active:bg-app-bg disabled:opacity-60',
  // bg-red-500 used intentionally — no danger semantic token in theme yet
  danger:    'bg-red-500 text-white active:bg-red-600 disabled:opacity-60',
  ghost:     'text-app-muted active:bg-app-bg',
}

const SIZE: Record<Size, string> = {
  sm: 'py-2 px-3 text-xs font-semibold rounded-input',
  md: 'py-3 px-4 text-sm font-semibold rounded-card',
  lg: 'py-3.5 px-4 text-sm font-bold rounded-card',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, loading = false,
    disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  )
})

export default Button
