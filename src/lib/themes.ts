export interface Theme {
  id:           string
  name:         string
  dark:         boolean
  accent:       string
  accentDark:   string
  accentDarker: string
  accentLight:  string
  appBg:        string
  appCard:      string
  appBorder:    string
  appText:      string
  appMuted:     string
  appFaint:     string
}

export const THEMES: Theme[] = [
  {
    // Brand default — warm light grey, gold accent
    id: 'gold', name: 'Gold', dark: false,
    accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#FFF9E0',
    appBg: '#F4F6F9', appCard: '#FFFFFF', appBorder: '#E3E5E5',
    appText: '#241F20', appMuted: '#7A7980', appFaint: '#C8C8C8',
  },
  {
    // Pure dark — near-black surfaces, gold accent stays
    id: 'onyx', name: 'Onyx', dark: true,
    accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#1E1A08',
    appBg: '#0C0D0F', appCard: '#161819', appBorder: '#252729',
    appText: '#F0EFE8', appMuted: '#8B8A87', appFaint: '#3E3D3A',
  },
  {
    // Dark navy — deep blue surfaces, electric blue accent
    id: 'midnight', name: 'Midnight', dark: true,
    accent: '#4F90FF', accentDark: '#2563EB', accentDarker: '#1D4ED8', accentLight: '#0D1A3A',
    appBg: '#080D1C', appCard: '#0E1630', appBorder: '#1A2545',
    appText: '#EEF2FF', appMuted: '#8B9CC8', appFaint: '#2A3552',
  },
  {
    // Warm dark — charcoal with electric orange, high energy
    id: 'ember', name: 'Ember', dark: true,
    accent: '#FF6B2C', accentDark: '#CC4F15', accentDarker: '#A33A0A', accentLight: '#1E0E05',
    appBg: '#0F0A07', appCard: '#1A1209', appBorder: '#2E1E0E',
    appText: '#FFF0E8', appMuted: '#A08070', appFaint: '#3D2518',
  },
  {
    // Clean light — blue-white surfaces, deep indigo accent
    id: 'arctic', name: 'Arctic', dark: false,
    accent: '#4F46E5', accentDark: '#3730A3', accentDarker: '#2C278A', accentLight: '#EEF2FF',
    appBg: '#F0F4FF', appCard: '#FFFFFF', appBorder: '#D8E2FF',
    appText: '#1E1B4B', appMuted: '#6366A0', appFaint: '#C4C7D4',
  },
  {
    // Earthy — warm sage backgrounds, deep forest green accent
    id: 'sage', name: 'Sage', dark: false,
    accent: '#16A34A', accentDark: '#15803D', accentDarker: '#0F6030', accentLight: '#DCFCE7',
    appBg: '#F2F5F1', appCard: '#FFFFFF', appBorder: '#D0DECA',
    appText: '#1A2C1A', appMuted: '#5D7A5D', appFaint: '#B8C8B4',
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
  s.setProperty('--color-app-bg',        theme.appBg)
  s.setProperty('--color-app-card',      theme.appCard)
  s.setProperty('--color-app-border',    theme.appBorder)
  s.setProperty('--color-app-text',      theme.appText)
  s.setProperty('--color-app-muted',     theme.appMuted)
  s.setProperty('--color-app-faint',     theme.appFaint)
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
