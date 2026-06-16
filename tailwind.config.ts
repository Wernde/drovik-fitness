import type { Config } from 'tailwindcss'

// ─────────────────────────────────────────────────────────────────────────────
// Design Token Reference
// ─────────────────────────────────────────────────────────────────────────────
// All colour tokens point to CSS custom properties. The actual hex values live
// in index.css (:root defaults) and src/lib/themes.ts (per-theme overrides).
// This means you can ship a new theme by changing only those two files — the
// Tailwind config never needs to change.
//
// BACKWARD COMPAT: every token that existed before is still present. Nothing
// is removed. Old class names (bg-app-bg, text-app-muted, etc.) still work so
// the migration to new names can happen incrementally in Step 4 and beyond.
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  // NOTE: darkMode is 'class' but the theme system toggles class="dark-theme"
  // (not "dark"), so Tailwind dark: variants are currently inactive. All dark
  // theming is handled by swapping CSS custom properties in src/lib/themes.ts.
  darkMode: 'class',

  theme: {
    extend: {

      // ── Font family ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },

      // ── Type scale ─────────────────────────────────────────────────────────
      // Tailwind defaults are kept: xs=12px, sm=14px, base=16px, lg=18px,
      // xl=20px, 2xl=24px, 3xl=30px. These two sub-xs sizes fill the gap:
      //   text-nav   — replaces text-[10px] (bottom-nav labels, micro chips)
      //   text-label — replaces text-[11px] (date-strip DOW, small badges)
      // Letter-spacing and line-height are baked in so they're always applied
      // together. Use like: className="text-nav font-bold uppercase"
      fontSize: {
        nav:   ['0.625rem',  { lineHeight: '1',   letterSpacing: '0.07em' }],
        label: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.02em' }],
      },

      // ── Colours ────────────────────────────────────────────────────────────
      colors: {

        // ── Surfaces & structure ─────────────────────────────────────────────
        // Semantic hierarchy — use these to set depth, not raw white/grey.
        //
        //  app-bg          page background (lowest layer)
        //  app-surface     card / panel (first elevation)  ← prefer over app-card
        //  app-raised      modal / sheet (second elevation, NEW)
        //  app-border      structural dividers, card outlines
        //  app-border-subtle  inner row dividers, table lines (NEW, lighter)
        //
        app: {
          bg:      'var(--color-app-bg)',
          surface: 'var(--color-app-card)',     // semantic name going forward
          card:    'var(--color-app-card)',      // compat alias — don't use in new code
          raised:  'var(--color-app-raised)',    // NEW: elevated surface for modals/sheets
          border:       'var(--color-app-border)',
          'border-subtle': 'var(--color-app-border-subtle)', // NEW: lighter inner dividers

          // ── Text hierarchy ────────────────────────────────────────────────
          // Contrast ratios (Gold theme, on white #FFF):
          //   app-text     #1E1A1B  ~15:1  ✓ AAA
          //   app-muted    #5C5B62  ~5.0:1 ✓ AA  (was #7A7980 at 3.87 — fails)
          //   app-faint    #999899  ~2.9:1 — decorative/placeholder only
          //   app-disabled #BBBABA  — non-interactive decoration only
          text:     'var(--color-app-text)',
          muted:    'var(--color-app-muted)',
          faint:    'var(--color-app-faint)',
          disabled: 'var(--color-app-disabled)', // NEW
        },

        // ── Accent palette ───────────────────────────────────────────────────
        // accent (bg only, never as text on light bg — contrast 1.51:1 on white)
        // accent-label is the ONLY safe way to write gold-toned text on light bgs.
        //
        // Prefer semantic names (hover/deep/subtle/label) in new code.
        // Legacy names (dark/darker/light) kept for compat.
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-dark)',    // pressed/hover state on accent backgrounds
          deep:    'var(--color-accent-darker)',  // deepest shade — rarely needed
          subtle:  'var(--color-accent-light)',   // tinted surface behind accent elements
          label:   'var(--color-accent-label)',   // NEW: ~5.2:1 on white — use for gold text
          // Legacy aliases
          dark:    'var(--color-accent-dark)',
          darker:  'var(--color-accent-darker)',
          light:   'var(--color-accent-light)',
        },

        // ── Semantic state colours ───────────────────────────────────────────
        // Replace all raw bg-green-50/text-green-500 etc. with these tokens.
        // Each has two variants: -bg (tinted container) and -text (label inside).
        // CSS vars are set per-theme so dark themes get dark-surface-safe values.
        //
        // Usage:
        //   <div className="bg-success-bg">
        //     <span className="text-success-text">Logged</span>
        //   </div>
        success: {
          bg:   'var(--color-success-bg)',
          text: 'var(--color-success-text)',
        },
        info: {
          bg:   'var(--color-info-bg)',
          text: 'var(--color-info-text)',
        },
        warning: {
          bg:   'var(--color-warning-bg)',
          text: 'var(--color-warning-text)',
        },
        error: {
          bg:   'var(--color-error-bg)',
          text: 'var(--color-error-text)',
        },
        neutral: {
          bg:   'var(--color-neutral-bg)',
          text: 'var(--color-neutral-text)',
        },
      },

      // ── Spacing scale ──────────────────────────────────────────────────────
      // Tailwind's default 4px-base scale covers everything needed — no custom
      // additions. Canonical semantic uses to reference across the codebase:
      //
      //   Component padding:     px-4 py-3    (16px / 12px)
      //   Dense padding:         px-3 py-2    (12px / 8px)
      //   Inter-section gap:     gap-5        (20px)
      //   Card content gap:      gap-3        (12px)
      //   Page top padding:      pt-6         (24px)

      // ── Border radius ──────────────────────────────────────────────────────
      // Four named radii replace the mixed rounded-xl / rounded-2xl / rounded-3xl
      // scattered across the codebase. Tailwind defaults (rounded, rounded-md,
      // etc.) are kept for internal use (e.g. skeleton bars, progress fills).
      //
      //   rounded-sm     6px   subtle row highlights, inner chips
      //   rounded-input  12px  all inputs, toggles, selects  (= old rounded-xl)
      //   rounded-card   16px  cards, primary buttons        (= old rounded-2xl)
      //   rounded-sheet  16px  bottom-sheet and modal tops   (= old rounded-2xl)
      //   rounded-full   pill  avatars, FAB, icon dots       (Tailwind default)
      //
      // NOTE: rounded-3xl (24px) is removed from intended use — the Login card
      // is the only occurrence and it will be migrated to rounded-card in Step 4.
      borderRadius: {
        sm:    '0.375rem', // 6px
        input: '0.75rem',  // 12px
        card:  '1rem',     // 16px
        sheet: '1rem',     // 16px
      },

      // ── Box shadows ────────────────────────────────────────────────────────
      // Three-tier semantic shadow system. Tailwind's own shadow-sm / shadow-xl
      // etc. are kept as-is; these named variants carry intent:
      //
      //   shadow-card    card-level lift — pair with border for definition
      //   shadow-float   popovers, FAB, action buttons
      //   shadow-modal   full-screen overlays, bottom sheets
      //
      // Rule: if it has a border → add shadow-card.
      //       if it floats over content → shadow-float.
      //       if it covers the screen  → shadow-modal.
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        float: '0 4px 16px -2px rgb(0 0 0 / 0.12), 0 2px 6px -1px rgb(0 0 0 / 0.06)',
        modal: '0 8px 32px -4px rgb(0 0 0 / 0.18), 0 4px 12px -2px rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
}

export default config
