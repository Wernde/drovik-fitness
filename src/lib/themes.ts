export interface Theme {
  id:           string
  name:         string
  dark:         boolean
  accent:       string
  accentDark:   string
  accentDarker: string
  accentLight:  string
  accentLabel:  string  // safe for text on this theme's bg surface
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

export const THEMES: Theme[] = [
  {
    // Matte black + electric gold — raw power, premium default
    id: 'carbon', name: 'Carbon', dark: true,
    accent: '#FFD60A', accentDark: '#E6BF00', accentDarker: '#C8A500', accentLight: '#1A1500',
    accentLabel: '#FFD60A',
    appBg: '#0C0C0E', appCard: '#141416', appRaised: '#1C1C1F',
    appBorder: '#242428', appBorderSubtle: '#1A1A1E',
    appText: '#F2F2F5', appMuted: '#8A8A8F', appFaint: '#3A3A3E', appDisabled: '#2A2A2E',
    successBg: '#0A2215', successText: '#34D399',
    infoBg:    '#081428', infoText:    '#60A5FA',
    warningBg: '#1C1408', warningText: '#FBBF24',
    errorBg:   '#1C0808', errorText:   '#F87171',
    neutralBg: '#130820', neutralText: '#A78BFA',
  },
  {
    // Deep black + neon lime — electric, Nike Volt energy
    id: 'volt', name: 'Volt', dark: true,
    accent: '#B5F018', accentDark: '#96D400', accentDarker: '#7AB800', accentLight: '#0E1800',
    accentLabel: '#B5F018',
    appBg: '#070A06', appCard: '#0C1009', appRaised: '#121808',
    appBorder: '#1C2818', appBorderSubtle: '#141C10',
    appText: '#F0F5E6', appMuted: '#7A8870', appFaint: '#283020', appDisabled: '#1E2818',
    successBg: '#0A2210', successText: '#4ADE80',
    infoBg:    '#080F20', infoText:    '#60A5FA',
    warningBg: '#1C1508', warningText: '#FBBF24',
    errorBg:   '#1C0808', errorText:   '#F87171',
    neutralBg: '#100820', neutralText: '#A78BFA',
  },
  {
    // Charcoal + electric orange — fire intensity, high output
    id: 'blaze', name: 'Blaze', dark: true,
    accent: '#FF5720', accentDark: '#E03A00', accentDarker: '#C02C00', accentLight: '#1E0800',
    accentLabel: '#FF5720',
    appBg: '#0D0806', appCard: '#150D08', appRaised: '#1C1208',
    appBorder: '#2C1A0C', appBorderSubtle: '#201410',
    appText: '#FFF2EC', appMuted: '#9A7A68', appFaint: '#3A2018', appDisabled: '#2A1810',
    successBg: '#0A2215', successText: '#4ADE80',
    infoBg:    '#080F24', infoText:    '#60A5FA',
    warningBg: '#1E1008', warningText: '#FBBF24',
    errorBg:   '#1E0808', errorText:   '#F87171',
    neutralBg: '#100820', neutralText: '#A78BFA',
  },
  {
    // Deep navy + electric cyan — precision, tech, Whoop-like
    id: 'pulse', name: 'Pulse', dark: true,
    accent: '#00D4FF', accentDark: '#00AACC', accentDarker: '#0088AA', accentLight: '#001824',
    accentLabel: '#00D4FF',
    appBg: '#040810', appCard: '#080F1E', appRaised: '#0C1428',
    appBorder: '#122038', appBorderSubtle: '#0A1830',
    appText: '#E8F4FF', appMuted: '#6A8CAA', appFaint: '#1C3050', appDisabled: '#142440',
    successBg: '#082215', successText: '#4ADE80',
    infoBg:    '#081428', infoText:    '#60A5FA',
    warningBg: '#1C1208', warningText: '#FBBF24',
    errorBg:   '#1C0808', errorText:   '#F87171',
    neutralBg: '#100820', neutralText: '#A78BFA',
  },
  {
    // Black + vivid red — beast mode, combat sport energy
    id: 'crimson', name: 'Crimson', dark: true,
    accent: '#FF1744', accentDark: '#E0002C', accentDarker: '#C00020', accentLight: '#1E0010',
    accentLabel: '#FF1744',
    appBg: '#0A0305', appCard: '#120408', appRaised: '#1A080C',
    appBorder: '#2A0C14', appBorderSubtle: '#1E0810',
    appText: '#FFF0F2', appMuted: '#9A7080', appFaint: '#3A1820', appDisabled: '#2A1018',
    successBg: '#0A2215', successText: '#4ADE80',
    infoBg:    '#080F24', infoText:    '#60A5FA',
    warningBg: '#1C1008', warningText: '#FBBF24',
    errorBg:   '#1C0808', errorText:   '#F87171',
    neutralBg: '#100820', neutralText: '#A78BFA',
  },
  {
    // Bright white + electric violet — crisp, clean, the one light option
    id: 'arctic', name: 'Arctic', dark: false,
    accent: '#7C3AED', accentDark: '#6D28D9', accentDarker: '#5B21B6', accentLight: '#F5F3FF',
    accentLabel: '#6D28D9',
    appBg: '#F5F5FF', appCard: '#FFFFFF', appRaised: '#F8F7FF',
    appBorder: '#E0DEFF', appBorderSubtle: '#ECEAFF',
    appText: '#1A1040', appMuted: '#6B5E9A', appFaint: '#C8C4E0', appDisabled: '#B8B4D0',
    successBg: '#F0FDF4', successText: '#15803D',
    infoBg:    '#EEF2FF', infoText:    '#4338CA',
    warningBg: '#FFFBEB', warningText: '#B45309',
    errorBg:   '#FEF2F2', errorText:   '#B91C1C',
    neutralBg: '#F5F3FF', neutralText: '#7C3AED',
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

  // Muscle diagram colours track the theme
  s.setProperty('--muscle-body', theme.dark ? '#4A4A4E' : '#D0D0D0')
  s.setProperty('--muscle-hi',   theme.accent)

  document.documentElement.classList.toggle('dark-theme', theme.dark)
}

export function saveTheme(themeId: string): void {
  try { localStorage.setItem(STORAGE_KEY, themeId) } catch {}
  applyTheme(themeId)
}

export function getActiveThemeId(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? 'carbon' } catch { return 'carbon' }
}

export function loadTheme(): void {
  applyTheme(getActiveThemeId())
}
