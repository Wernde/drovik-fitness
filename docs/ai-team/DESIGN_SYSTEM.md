# Design and Experience Guide

## Experience target

Drovik should feel fast, focused, premium, and dependable during a gym session. Visual polish supports clarity; it does not compete with logging a set.

## Product language

- Use Australian English and metric units.
- Preserve approved names, especially Home, Program, Nutrition, and History.
- Prefer short labels and direct actions.
- Explain destructive or data-related consequences before confirmation.

## Layout principles

- Phone: touch-first app shell with stable navigation and one clear scrolling owner.
- Tablet: use available width intentionally; avoid oversized phone layouts.
- Desktop: provide a true desktop composition, including sidebar-aware fixed content where applicable.
- Installed PWA: respect dynamic viewport height and safe-area insets.
- Fixed navigation, timers, and sheets must not hide content or controls.
- Opening overlays or Quick Add must not unexpectedly shift the underlying page.

## Interaction principles

- Optimise workout logging for one hand and low attention.
- Persist important input immediately or clearly communicate when it is saved.
- Provide recovery for interrupted or stale sessions.
- Keep videos inline where they are useful instead of forcing unnecessary navigation.
- Ensure primary actions are visually distinct from destructive actions.

## Shared components

Before creating a new button, field, card, sheet, icon tile, or feedback pattern, inspect `src/components/ui` and established application patterns. Add a shared variant when repetition and consistent behaviour justify it; avoid abstractions that serve only one use.

## Required states

Every reusable interactive component should consider:

- Default, hover where applicable, active, focus-visible, disabled, loading, success, and error
- Light and dark appearance
- Long labels and small screens
- Keyboard and touch input
- Offline implications where the action writes or fetches data

## Accessibility baseline

- Text and essential controls require sufficient contrast.
- Interactive controls require visible focus and meaningful accessible names.
- Touch targets should remain comfortable during movement or fatigue.
- Colour must not be the only carrier of meaning.
- Motion should not be essential to understanding a result.

## Visual review output

For a meaningful interface change, record the approved reference, affected viewports, component states, responsive intent, and acceptance screenshots or observations. Clearly separate simulated viewport checks from real-device verification.
