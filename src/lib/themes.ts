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
  premiumIconFilter: string
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
    // Glossy black/chrome + logo orange/blue.
    id: 'carbon', name: 'Carbon', dark: true,
    accent: '#FF7A00', accentDark: '#EA580C', accentDarker: '#9A3412', accentLight: '#261003',
    accentLabel: '#FF7A00',
    appBg: '#02070B', appCard: '#07111A', appRaised: '#0C1824',
    appBorder: '#243545', appBorderSubtle: '#162432',
    appText: '#F8FAFC', appMuted: '#A9B4C0', appFaint: '#4B5D6D', appDisabled: '#263545',
    successBg: '#0A2010', successText: '#22C55E',
    infoBg: '#031B2C', infoText: '#00A8FF',
    warningBg: '#261003', warningText: '#FF9A1F',
    errorBg: '#250A0A', errorText: '#F87171',
    neutralBg: '#061728', neutralText: '#38BDF8',
    premiumIconFilter: 'saturate(1)',
  },
  {
    // White/chrome version using the same logo orange/blue accents.
    id: 'arctic', name: 'Light', dark: false,
    accent: '#FF6B00', accentDark: '#EA580C', accentDarker: '#C2410C', accentLight: '#FFF1E6',
    accentLabel: '#F25A00',
    appBg: '#F8FBFF', appCard: '#FFFFFF', appRaised: '#F0F5FB',
    appBorder: '#D6E0EA', appBorderSubtle: '#E8EEF5',
    appText: '#101827', appMuted: '#4B5565', appFaint: '#AAB6C4', appDisabled: '#C6D0DB',
    successBg: '#F0FDF4', successText: '#15803D',
    infoBg: '#E6F6FF', infoText: '#0078E7',
    warningBg: '#FFF1E6', warningText: '#EA580C',
    errorBg: '#FEF2F2', errorText: '#B91C1C',
    neutralBg: '#EAF6FF', neutralText: '#0284C7',
    premiumIconFilter: 'saturate(1)',
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
  s.setProperty('--premium-icon-filter', theme.premiumIconFilter)
  s.setProperty('--color-icon-tile', theme.dark ? '#F5F0E4' : '#FFFFFF')
  s.setProperty('--color-icon-tile-muted', theme.dark ? '#DDD6C7' : '#EEF3F8')
  s.setProperty('--color-icon-tile-deep', theme.dark ? '#BFB4A4' : '#DCE5EF')

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
