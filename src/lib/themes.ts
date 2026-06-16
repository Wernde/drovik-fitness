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
  appRaised:    string  // elevated layer: modal, sheet
  appBorder:    string
  appBorderSubtle: string  // inner row dividers
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
    // Brand default — warm light grey, gold accent
    id: 'gold', name: 'Gold', dark: false,
    accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#FFF9E0',
    accentLabel: '#7A5C00',
    appBg: '#F4F6F9', appCard: '#FFFFFF', appRaised: '#F7F8FA', appBorder: '#E3E5E5', appBorderSubtle: '#ECEEF0',
    appText: '#241F20', appMuted: '#5C5B62', appFaint: '#999899', appDisabled: '#BBBABA',
    successBg: '#F0FDF4', successText: '#15803D',
    infoBg: '#EFF6FF',   infoText: '#1D4ED8',
    warningBg: '#FFFBEB', warningText: '#B45309',
    errorBg: '#FEF2F2',  errorText: '#B91C1C',
    neutralBg: '#F5F3FF', neutralText: '#6D28D9',
  },
  {
    // Pure dark — near-black surfaces, gold accent stays
    id: 'onyx', name: 'Onyx', dark: true,
    accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#1E1A08',
    accentLabel: '#FFCA10',
    appBg: '#0C0D0F', appCard: '#161819', appRaised: '#1E2024', appBorder: '#252729', appBorderSubtle: '#1D1E20',
    appText: '#F0EFE8', appMuted: '#8B8A87', appFaint: '#3E3D3A', appDisabled: '#2A2928',
    successBg: '#052E16', successText: '#4ADE80',
    infoBg: '#0A1628',   infoText: '#60A5FA',
    warningBg: '#1C1005', warningText: '#FCD34D',
    errorBg: '#1C0808',  errorText: '#F87171',
    neutralBg: '#130B24', neutralText: '#A78BFA',
  },
  {
    // Dark navy — deep blue surfaces, electric blue accent
    id: 'midnight', name: 'Midnight', dark: true,
    accent: '#4F90FF', accentDark: '#2563EB', accentDarker: '#1D4ED8', accentLight: '#0D1A3A',
    accentLabel: '#7AABFF',
    appBg: '#080D1C', appCard: '#0E1630', appRaised: '#131D3D', appBorder: '#1A2545', appBorderSubtle: '#0F1835',
    appText: '#EEF2FF', appMuted: '#8B9CC8', appFaint: '#2A3552', appDisabled: '#1E2A45',
    successBg: '#042315', successText: '#4ADE80',
    infoBg: '#0A1428',   infoText: '#60A5FA',
    warningBg: '#1A0E04', warningText: '#FCD34D',
    errorBg: '#1A0505',  errorText: '#F87171',
    neutralBg: '#0E0820', neutralText: '#A78BFA',
  },
  {
    // Warm dark — charcoal with electric orange, high energy
    id: 'ember', name: 'Ember', dark: true,
    accent: '#FF6B2C', accentDark: '#CC4F15', accentDarker: '#A33A0A', accentLight: '#1E0E05',
    accentLabel: '#FF8C55',
    appBg: '#0F0A07', appCard: '#1A1209', appRaised: '#231A0C', appBorder: '#2E1E0E', appBorderSubtle: '#201508',
    appText: '#FFF0E8', appMuted: '#A08070', appFaint: '#3D2518', appDisabled: '#2A1A10',
    successBg: '#042315', successText: '#4ADE80',
    infoBg: '#050F1C',   infoText: '#60A5FA',
    warningBg: '#1A0F04', warningText: '#FCD34D',
    errorBg: '#1A0505',  errorText: '#F87171',
    neutralBg: '#0E0820', neutralText: '#A78BFA',
  },
  {
    // Clean light — blue-white surfaces, deep indigo accent
    id: 'arctic', name: 'Arctic', dark: false,
    accent: '#4F46E5', accentDark: '#3730A3', accentDarker: '#2C278A', accentLight: '#EEF2FF',
    accentLabel: '#3730A3',
    appBg: '#F0F4FF', appCard: '#FFFFFF', appRaised: '#F5F8FF', appBorder: '#D8E2FF', appBorderSubtle: '#E4EAFF',
    appText: '#1E1B4B', appMuted: '#6366A0', appFaint: '#C4C7D4', appDisabled: '#B0B5CF',
    successBg: '#F0FDF4', successText: '#15803D',
    infoBg: '#EEF2FF',   infoText: '#3730A3',
    warningBg: '#FFFBEB', warningText: '#B45309',
    errorBg: '#FEF2F2',  errorText: '#B91C1C',
    neutralBg: '#F5F3FF', neutralText: '#4F46E5',
  },
  {
    // Earthy — warm sage backgrounds, deep forest green accent
    id: 'sage', name: 'Sage', dark: false,
    accent: '#16A34A', accentDark: '#15803D', accentDarker: '#0F6030', accentLight: '#DCFCE7',
    accentLabel: '#0F6030',
    appBg: '#F2F5F1', appCard: '#FFFFFF', appRaised: '#F7F9F6', appBorder: '#D0DECA', appBorderSubtle: '#DCE8D8',
    appText: '#1A2C1A', appMuted: '#567856', appFaint: '#B8C8B4', appDisabled: '#AABCA6',
    successBg: '#ECFDF5', successText: '#166534',
    infoBg: '#EFF6FF',   infoText: '#1D4ED8',
    warningBg: '#FFFBEB', warningText: '#B45309',
    errorBg: '#FEF2F2',  errorText: '#B91C1C',
    neutralBg: '#F5F3FF', neutralText: '#6D28D9',
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

  document.documentElement.classList.toggle('dark-theme', theme.dark)
}

export function saveTheme(themeId: string): void {
  try { localStorage.setItem(STORAGE_KEY, themeId) } catch {}
  applyTheme(themeId)
}

export function getActiveThemeId(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? 'gold' } catch { return 'gold' }
}

export function loadTheme(): void {
  applyTheme(getActiveThemeId())
}
