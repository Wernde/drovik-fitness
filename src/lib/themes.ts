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

const LIGHT = {
  appBg:     '#F4F6F9',
  appCard:   '#ffffff',
  appBorder: '#E3E5E5',
  appText:   '#241F20',
  appMuted:  '#7A7980',
  appFaint:  '#C8C8C8',
}

const DARK = {
  appBg:     '#111317',
  appCard:   '#1C1F26',
  appBorder: '#2A2E3A',
  appText:   '#F0F0F0',
  appMuted:  '#9BA3B0',
  appFaint:  '#4A5060',
}

export const THEMES: Theme[] = [
  { id: 'gold',   name: 'Gold',   dark: false, accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#FFF9E0', ...LIGHT },
  { id: 'sky',    name: 'Sky',    dark: false, accent: '#0EA5E9', accentDark: '#0369A1', accentDarker: '#024F82', accentLight: '#E0F2FE', ...LIGHT },
  { id: 'forest', name: 'Forest', dark: false, accent: '#22C55E', accentDark: '#15803D', accentDarker: '#0F5C2E', accentLight: '#DCFCE7', ...LIGHT },
  { id: 'coral',  name: 'Coral',  dark: false, accent: '#F97316', accentDark: '#C2540A', accentDarker: '#9A3F07', accentLight: '#FFEDD5', ...LIGHT },
  { id: 'purple', name: 'Purple', dark: false, accent: '#A855F7', accentDark: '#7E22CE', accentDarker: '#5B1A96', accentLight: '#F3E8FF', ...LIGHT },
  {
    id: 'dark', name: 'Dark', dark: true,
    accent: '#FFCA10', accentDark: '#B8900A', accentDarker: '#8A6C00', accentLight: '#2A2410',
    ...DARK,
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
