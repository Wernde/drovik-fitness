export interface Theme {
  id:           string
  name:         string
  dark:         boolean
  accent:       string
  accentDark:   string
  accentDarker: string
  accentLight:  string
  accentLabel:  string
  appBg:        string
  appCard:      string
  appRaised:    string
  appBorder:    string
  appBorderSubtle: string
  appText:      string
  appMuted:     string
  appFaint:     string
  appDisabled:  string
  successBg:    string
  successText:  string
  infoBg:       string
  infoText:     string
  warningBg:    string
  warningText:  string
  errorBg:      string
  errorText:    string
  neutralBg:    string
  neutralText:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// Color principles applied here (from design research):
//
//   Backgrounds: #0F–#14 lightness range — dark enough to feel premium,
//     light enough to allow elevation layers and avoid halation.
//     Pure black (#000) causes halos around text for people with astigmatism.
//
//   Accents: 50–65% HSB brightness, not 80–100% neon. Neon on dark causes
//     chromatic aberration — eyes can't focus on opposite wavelengths simultaneously.
//     Each accent here is proven (Strava orange, lime-500, blue-400, rose-500, amber-400).
//
//   Text: #EDEDF2 not #FFFFFF. Slightly off-white prevents the halation/bloom
//     effect where bright text "glows" into dark surrounds. 16:1 contrast is fine,
//     17:1 starts to cause strain at extended reading.
//
//   Semantic states: dark-surface safe values — vivid enough to read but not neon.
// ─────────────────────────────────────────────────────────────────────────────

export const DARK_THEME_ID = 'carbon'
export const LIGHT_THEME_ID = 'arctic'

export const THEMES: Theme[] = [
  {
    // Near-black charcoal + warm amber — premium, like a luxury watch brand
    // amber-400 (#FBBF24) gives 11.7:1 contrast on this bg. Not golden-brown.
    id: 'carbon', name: 'Carbon', dark: true,
    accent: '#FBBF24', accentDark: '#D97706', accentDarker: '#B45309', accentLight: '#1C1400',
    accentLabel: '#FBBF24',
    appBg: '#111115', appCard: '#1C1C22', appRaised: '#252530',
    appBorder: '#303038', appBorderSubtle: '#28282E',
    appText: '#EDEDF2', appMuted: '#9090A0', appFaint: '#3C3C48', appDisabled: '#2C2C38',
    successBg: '#0F2818', successText: '#22C55E',
    infoBg:    '#0A1830', infoText:    '#60A5FA',
    warningBg: '#1E1608', warningText: '#FBBF24',
    errorBg:   '#1E0A10', errorText:   '#F87171',
    neutralBg: '#130E20', neutralText: '#A78BFA',
  },
  {
    // Dark forest + vivid lime — Nike Volt energy, 10:1 contrast proven
    // lime-500 (#84CC16) is vivid but grounded — not the fluorescent #B5F018
    id: 'volt', name: 'Volt', dark: true,
    accent: '#84CC16', accentDark: '#65A30D', accentDarker: '#4D7C0F', accentLight: '#0C1600',
    accentLabel: '#84CC16',
    appBg: '#0E1410', appCard: '#181F19', appRaised: '#212A22',
    appBorder: '#2C3A2E', appBorderSubtle: '#242E26',
    appText: '#EBF2EC', appMuted: '#7A9480', appFaint: '#2A3C2C', appDisabled: '#1E2C20',
    successBg: '#0A2010', successText: '#22C55E',
    infoBg:    '#0A1428', infoText:    '#60A5FA',
    warningBg: '#1C1608', warningText: '#FBBF24',
    errorBg:   '#1C0A0E', errorText:   '#F87171',
    neutralBg: '#0E0820', neutralText: '#A78BFA',
  },
  {
    // Warm dark + Strava orange — THE proven fitness accent, 7.1:1 contrast
    // #F97316 is orange-500; Strava built their entire brand identity on this hue
    id: 'blaze', name: 'Blaze', dark: true,
    accent: '#F97316', accentDark: '#EA580C', accentDarker: '#C2410C', accentLight: '#1E0C00',
    accentLabel: '#F97316',
    appBg: '#130F09', appCard: '#1E1710', appRaised: '#272015',
    appBorder: '#362C1C', appBorderSubtle: '#2C2418',
    appText: '#F2EEE6', appMuted: '#9A8C78', appFaint: '#382C18', appDisabled: '#281E10',
    successBg: '#0F2818', successText: '#22C55E',
    infoBg:    '#0A1428', infoText:    '#60A5FA',
    warningBg: '#1E1200', warningText: '#FBBF24',
    errorBg:   '#1E0A0E', errorText:   '#F87171',
    neutralBg: '#110820', neutralText: '#A78BFA',
  },
  {
    // Deep navy + electric blue — precision, tech, Whoop-adjacent, 8:1 contrast
    // blue-400 (#60A5FA) is electric but readable — not the harsh cyan that causes eye strain
    id: 'surge', name: 'Surge', dark: true,
    accent: '#60A5FA', accentDark: '#3B82F6', accentDarker: '#2563EB', accentLight: '#0A1830',
    accentLabel: '#60A5FA',
    appBg: '#0A0E18', appCard: '#131B2C', appRaised: '#1C2640',
    appBorder: '#253552', appBorderSubtle: '#1C2A44',
    appText: '#E4EEFF', appMuted: '#7090B8', appFaint: '#1C2C44', appDisabled: '#142238',
    successBg: '#0A2018', successText: '#22C55E',
    infoBg:    '#0A1430', infoText:    '#60A5FA',
    warningBg: '#1C1608', warningText: '#FBBF24',
    errorBg:   '#1C0A0E', errorText:   '#F87171',
    neutralBg: '#10082A', neutralText: '#A78BFA',
  },
  {
    // Dark charcoal + rose-red — beast mode, Peloton-adjacent, 5.6:1 contrast
    // rose-500 (#F43F5E) is pink-shifted from pure red — less chromatic aberration,
    // more readable, same intensity
    id: 'crimson', name: 'Crimson', dark: true,
    accent: '#F43F5E', accentDark: '#E11D48', accentDarker: '#BE123C', accentLight: '#200010',
    accentLabel: '#F43F5E',
    appBg: '#120A0E', appCard: '#1C1018', appRaised: '#261824',
    appBorder: '#362030', appBorderSubtle: '#2A1828',
    appText: '#F5ECF0', appMuted: '#9A8090', appFaint: '#3A1830', appDisabled: '#281020',
    successBg: '#0A2018', successText: '#22C55E',
    infoBg:    '#0A1428', infoText:    '#60A5FA',
    warningBg: '#1C1608', warningText: '#FBBF24',
    errorBg:   '#1E0A10', errorText:   '#F87171',
    neutralBg: '#100820', neutralText: '#A78BFA',
  },
  {
    // Clean white + electric indigo — the one light option, confident and bold
    // Pairs well with the strong typographic hierarchy that makes fitness apps feel premium
    id: 'arctic', name: 'Light', dark: false,
    accent: '#4F46E5', accentDark: '#4338CA', accentDarker: '#312E81', accentLight: '#EEF2FF',
    accentLabel: '#4338CA',
    appBg: '#FAFAFD', appCard: '#FFFFFF', appRaised: '#F6F7FC',
    appBorder: '#E3E5F0', appBorderSubtle: '#EEF0F6',
    appText: '#17172F', appMuted: '#5D6187', appFaint: '#C6C9DB', appDisabled: '#B8BCCE',
    successBg: '#F0FDF4', successText: '#15803D',
    infoBg:    '#EEF2FF', infoText:    '#4338CA',
    warningBg: '#FFFBEB', warningText: '#B45309',
    errorBg:   '#FEF2F2', errorText:   '#B91C1C',
    neutralBg: '#F5F3FF', neutralText: '#4F46E5',
  },
]

const STORAGE_KEY = 'drovik:theme'

export function applyTheme(themeId: string): void {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const s = document.documentElement.style

  s.setProperty('--color-accent',        theme.accent)
  s.setProperty('--color-accent-dark',   theme.accentDark)
  s.setProperty('--color-accent-darker', theme.accentDarker)
  s.setProperty('--color-accent-light',  theme.accentLight)
  s.setProperty('--color-accent-label',  theme.accentLabel)

  s.setProperty('--color-app-bg',             theme.appBg)
  s.setProperty('--color-app-card',           theme.appCard)
  s.setProperty('--color-app-raised',         theme.appRaised)
  s.setProperty('--color-app-border',         theme.appBorder)
  s.setProperty('--color-app-border-subtle',  theme.appBorderSubtle)
  s.setProperty('--color-app-text',           theme.appText)
  s.setProperty('--color-app-muted',          theme.appMuted)
  s.setProperty('--color-app-faint',          theme.appFaint)
  s.setProperty('--color-app-disabled',       theme.appDisabled)

  s.setProperty('--color-success-bg',   theme.successBg)
  s.setProperty('--color-success-text', theme.successText)
  s.setProperty('--color-info-bg',      theme.infoBg)
  s.setProperty('--color-info-text',    theme.infoText)
  s.setProperty('--color-warning-bg',   theme.warningBg)
  s.setProperty('--color-warning-text', theme.warningText)
  s.setProperty('--color-error-bg',     theme.errorBg)
  s.setProperty('--color-error-text',   theme.errorText)
  s.setProperty('--color-neutral-bg',   theme.neutralBg)
  s.setProperty('--color-neutral-text', theme.neutralText)

  s.setProperty('--muscle-body', theme.dark ? '#4A4A52' : '#C8C8DC')
  s.setProperty('--muscle-hi',   theme.accent)

  document.documentElement.classList.toggle('dark-theme', theme.dark)
}

export function saveTheme(themeId: string): void {
  try { localStorage.setItem(STORAGE_KEY, themeId) } catch {}
  applyTheme(themeId)
}

export function getActiveThemeId(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? DARK_THEME_ID } catch { return DARK_THEME_ID }
}

export function loadTheme(): void {
  applyTheme(getActiveThemeId())
}
