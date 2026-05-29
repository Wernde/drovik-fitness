export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type DietId = 'standard' | 'high_protein' | 'cutting' | 'bulking' | 'keto' | 'paleo' | 'mediterranean'

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, no exercise)',
  light:       'Light activity (1–3 days/week)',
  moderate:    'Moderate (3–5 days/week)',
  active:      'Active (6–7 days/week)',
  very_active: 'Very active (physical job + exercise)',
}

export interface DietProgram {
  id: DietId
  name: string
  tagline: string
  adjustTDEE: number
  proteinMultiplier: number
  fatPct: number
  restrictedCategories: string[]
  allowedNote: string
}

export const DIET_PROGRAMS: DietProgram[] = [
  { id: 'standard',      name: 'Balanced',       tagline: 'Maintenance, all foods',           adjustTDEE: 0,    proteinMultiplier: 2.0, fatPct: 0.25, restrictedCategories: [],                        allowedNote: 'All foods allowed. Hit your macro targets each day.' },
  { id: 'high_protein',  name: 'High Protein',    tagline: 'Max muscle growth and retention',  adjustTDEE: 0,    proteinMultiplier: 2.4, fatPct: 0.22, restrictedCategories: [],                        allowedNote: 'All foods allowed. Prioritise protein-rich foods at every meal.' },
  { id: 'cutting',       name: 'Cutting',         tagline: 'Fat loss, −500 cal deficit',       adjustTDEE: -500, proteinMultiplier: 2.4, fatPct: 0.25, restrictedCategories: [],                        allowedNote: 'All foods allowed. Stick to the deficit and hit your protein target.' },
  { id: 'bulking',       name: 'Bulking',         tagline: 'Muscle gain, +300 cal surplus',    adjustTDEE: 300,  proteinMultiplier: 2.0, fatPct: 0.25, restrictedCategories: [],                        allowedNote: 'All foods allowed. Eat in a controlled surplus — quality calories matter.' },
  { id: 'keto',          name: 'Ketogenic',       tagline: 'Very low carb (<50 g/day)',        adjustTDEE: 0,    proteinMultiplier: 1.8, fatPct: 0.70, restrictedCategories: ['grain', 'legume', 'fruit'], allowedNote: 'Eat meat, fish, eggs, cheese, nuts, and low-carb vegetables. Avoid grains, most fruit, and legumes.' },
  { id: 'paleo',         name: 'Paleo',           tagline: 'No grains, dairy, or legumes',     adjustTDEE: 0,    proteinMultiplier: 2.0, fatPct: 0.30, restrictedCategories: ['grain', 'dairy', 'legume'], allowedNote: 'Eat meat, fish, eggs, vegetables, fruit, nuts, and seeds. Avoid grains, dairy, legumes, and processed foods.' },
  { id: 'mediterranean', name: 'Mediterranean',   tagline: 'Heart-healthy whole foods',        adjustTDEE: 0,    proteinMultiplier: 1.8, fatPct: 0.35, restrictedCategories: [],                        allowedNote: 'Focus on vegetables, legumes, whole grains, fish, and olive oil. Limit red meat and processed foods.' },
]

export interface MacroTargets {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}

export function calcBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

export function calcMacros(weightKg: number, tdee: number, diet: DietProgram): MacroTargets {
  const calories = Math.max(1200, tdee + diet.adjustTDEE)
  const proteinG = Math.round(weightKg * diet.proteinMultiplier)
  const fatG     = Math.round((calories * diet.fatPct) / 9)
  const carbsG   = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4))
  return { calories, proteinG, fatG, carbsG }
}

export interface NutritionProfile {
  heightCm: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
  dietId: DietId
}

const STORAGE_KEY = 'drovik:nutritionProfile'

export function loadProfile(): NutritionProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(p: NutritionProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}
