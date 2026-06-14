/**
 * DragList — native drag-and-drop reorderable list.
 * No external dependencies. Works on desktop (HTML5 drag) and mobile (touch).
 */

import { useRef, useState, type ReactNode } from 'react'

interface Props<T> {
  items: T[]
  keyOf: (item: T) => string
  onReorder: (from: number, to: number) => void
  renderItem: (item: T, dragHandleProps: React.HTMLAttributes<HTMLElement>, isDragging: boolean) => ReactNode
  className?: string
  gap?: string
}

export default function DragList<T>({
  items, keyOf, onReorder, renderItem, className = '', gap = 'gap-2',
}: Props<T>) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx,     setOverIdx]     = useState<number | null>(null)

  // ── Touch state ──────────────────────────────────────────────────────────────
  const touchSrcIdx  = useRef<number | null>(null)
  const touchEl      = useRef<HTMLElement | null>(null)
  const touchClone   = useRef<HTMLElement | null>(null)
  const touchStartY  = useRef(0)
  const itemEls      = useRef<(HTMLElement | null)[]>([])

  // ── HTML5 drag (desktop) ──────────────────────────────────────────────────────

  function onDragStart(idx: number) {
    setDraggingIdx(idx)
    setOverIdx(idx)
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setOverIdx(idx)
  }

  function onDrop(idx: number) {
    if (draggingIdx !== null && draggingIdx !== idx) {
      onReorder(draggingIdx, idx)
    }
    setDraggingIdx(null)
    setOverIdx(null)
  }

  function onDragEnd() {
    setDraggingIdx(null)
    setOverIdx(null)
  }

  // ── Touch (mobile) ────────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent, idx: number) {
    touchSrcIdx.current = idx
    touchStartY.current = e.touches[0].clientY
    const el = itemEls.current[idx]
    touchEl.current = el

    // Create a floating clone that follows the finger
    if (el) {
      const rect = el.getBoundingClientRect()
      const clone = el.cloneNode(true) as HTMLElement
      clone.style.cssText = `
        position:fixed; left:${rect.left}px; top:${rect.top}px;
        width:${rect.width}px; opacity:0.9; z-index:9999;
        pointer-events:none; box-shadow:0 8px 24px rgba(0,0,0,0.15);
        border-radius:16px; transition:none;
      `
      document.body.appendChild(clone)
      touchClone.current = clone
    }
    setDraggingIdx(idx)
    setOverIdx(idx)
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    const dy = touch.clientY - touchStartY.current

    // Move clone
    if (touchClone.current && touchEl.current) {
      const rect = touchEl.current.getBoundingClientRect()
      touchClone.current.style.top = `${rect.top + dy}px`
    }

    // Find which item we're hovering over
    const hoveredEl = document.elementFromPoint(touch.clientX, touch.clientY)
    for (let i = 0; i < itemEls.current.length; i++) {
      const el = itemEls.current[i]
      if (el && (el === hoveredEl || el.contains(hoveredEl))) {
        setOverIdx(i)
        break
      }
    }
  }

  function onTouchEnd() {
    // Remove clone
    if (touchClone.current) {
      document.body.removeChild(touchClone.current)
      touchClone.current = null
    }

    const from = touchSrcIdx.current
    const to   = overIdx

    if (from !== null && to !== null && from !== to) {
      onReorder(from, to)
    }

    touchSrcIdx.current = null
    setDraggingIdx(null)
    setOverIdx(null)
  }

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {items.map((item, idx) => {
        const isDragging = draggingIdx === idx
        const isOver     = overIdx === idx && draggingIdx !== null && draggingIdx !== idx

        const dragHandleProps: React.HTMLAttributes<HTMLElement> = {
          draggable: true,
          onDragStart:  () => onDragStart(idx),
          onDragOver:   (e) => onDragOver(e as React.DragEvent, idx),
          onDrop:       () => onDrop(idx),
          onDragEnd,
          onTouchStart: (e) => onTouchStart(e as React.TouchEvent, idx),
          onTouchMove:  (e) => onTouchMove(e as React.TouchEvent),
          onTouchEnd,
          style: { touchAction: 'none', cursor: 'grab' },
        }

        return (
          <div
            key={keyOf(item)}
            ref={(el) => { itemEls.current[idx] = el }}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            style={{
              opacity:   isDragging ? 0.4 : 1,
              outline:   isOver ? '2px solid var(--color-accent)' : undefined,
              borderRadius: isOver ? '16px' : undefined,
              transition: 'opacity 0.15s, outline 0.1s',
            }}
          >
            {renderItem(item, dragHandleProps, isDragging)}
          </div>
        )
      })}
    </div>
  )
}
