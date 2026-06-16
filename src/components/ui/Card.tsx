interface CardProps {
  children:   React.ReactNode
  padding?:   boolean
  shadow?:    boolean
  className?: string
  onClick?:   () => void
  as?:        keyof JSX.IntrinsicElements
}

export default function Card({
  children,
  padding = false,
  shadow  = false,
  className = '',
  onClick,
  as: Tag = 'div',
}: CardProps) {
  return (
    // @ts-expect-error — polymorphic `as` prop; Tag is always a valid element
    <Tag
      onClick={onClick}
      className={[
        'bg-app-surface border border-app-border rounded-card',
        shadow  ? 'shadow-card' : '',
        padding ? 'px-4 py-3'  : '',
        onClick ? 'active:opacity-80 cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  )
}
