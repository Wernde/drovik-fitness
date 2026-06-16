/**
 * Nutrition — food diary, food database, recipe builder, and TDEE/diet plan.
 *
 * Tabs: Diary | Foods | Recipes | Plan
 */

import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { Food, FoodLog, Recipe, RecipeFood, MealSlot, FoodCategory } from '../db/db'
import {
  calcBMR, calcTDEE, calcMacros,
  loadProfile, saveProfile,
  ACTIVITY_LABELS, DIET_PROGRAMS,
  type Sex, type ActivityLevel, type DietId, type NutritionProfile,
} from '../lib/tdee'
import { useUnits } from '../contexts/UnitsContext'
import { mlToDisplay, waterLabel } from '../lib/units'

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

const WATER_GOAL_ML = 2500

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  grain: 'Grain',
  vegetable: 'Vegetable',
  fruit: 'Fruit',
  fat: 'Fat',
  nut: 'Nut',
  legume: 'Legume',
  supplement: 'Supplement',
  other: 'Other',
}

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  protein:    'bg-blue-100 text-blue-700',
  dairy:      'bg-purple-100 text-purple-700',
  grain:      'bg-amber-100 text-amber-700',
  vegetable:  'bg-green-100 text-green-700',
  fruit:      'bg-orange-100 text-orange-700',
  fat:        'bg-yellow-100 text-yellow-700',
  nut:        'bg-amber-200 text-amber-800',
  legume:     'bg-teal-100 text-teal-700',
  supplement: 'bg-violet-100 text-violet-700',
  other:      'bg-gray-100 text-gray-600',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function macroFromLog(food: Food, log: FoodLog) {
  const factor = log.amountG / 100
  return {
    calories: food.caloriesPer100g * factor,
    protein:  food.proteinPer100g  * factor,
    carbs:    food.carbsPer100g    * factor,
    fat:      food.fatPer100g      * factor,
  }
}

function fmt1(n: number) { return Math.round(n * 10) / 10 }
function fmtInt(n: number) { return Math.round(n) }

const DIARY_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DIARY_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
function formatDiaryDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${DIARY_DAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${DIARY_MONTHS[m - 1]}`
}
function addDiaryDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-')
}

// ── Small shared components ───────────────────────────────────────────────────

function CategoryBadge({ category }: { category: FoodCategory }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1 bg-app-border rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Food search modal ─────────────────────────────────────────────────────────

interface FoodSearchModalProps {
  meal: MealSlot
  date: string
  onClose: () => void
}

function FoodSearchModal({ meal, date, onClose }: FoodSearchModalProps) {
  const [query, setQuery]   = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [amount, setAmount] = useState('100')
  const [pickedRecipe, setPickedRecipe] = useState<Recipe | null>(null)
  const [servingCount, setServingCount] = useState('1')
  const [saving, setSaving] = useState(false)

  const allFoodsRaw = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray().then((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    ),
    [],
  )
  const allFoods    = allFoodsRaw ?? []
  const foodsLoading = allFoodsRaw === undefined

  const recipes = useLiveQuery(
    () => db.recipes.filter((r) => !r.deleted).toArray().then((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    ),
    [],
  ) ?? []

  const allRecipeFoods = useLiveQuery(
    () => db.recipeFoods.filter((r) => !r.deleted).toArray(),
    [],
  ) ?? []

  const foodMap = useMemo(() => {
    const m = new Map<string, Food>()
    allFoods.forEach((f) => m.set(f.id, f))
    return m
  }, [allFoods])

  const results = useMemo(() => {
    if (!query.trim()) return allFoods
    const q = query.toLowerCase()
    return allFoods.filter((f) =>
      f.name.toLowerCase().includes(q) || f.category.includes(q)
    )
  }, [allFoods, query])

  const filteredRecipes = useMemo(() => {
    if (!query.trim()) return recipes
    const q = query.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, query])

  function getRecipeMacros(recipe: Recipe) {
    const rfs = allRecipeFoods.filter((rf) => rf.recipeId === recipe.id)
    const servings = recipe.servings || 1
    let cal = 0, pro = 0
    for (const rf of rfs) {
      const food = foodMap.get(rf.foodId)
      if (!food) continue
      cal += food.caloriesPer100g * rf.amountG / 100
      pro += food.proteinPer100g  * rf.amountG / 100
    }
    return { cal: cal / servings, pro: pro / servings }
  }

  async function handleAdd() {
    if (!picked) return
    const g = parseFloat(amount)
    if (isNaN(g) || g <= 0) return
    setSaving(true)
    try {
      const timestamp = now()
      await db.foodLogs.add({
        id: crypto.randomUUID(),
        date,
        foodId: picked.id,
        meal,
        amountG: g,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddRecipe() {
    if (!pickedRecipe) return
    const count = parseFloat(servingCount)
    if (isNaN(count) || count <= 0) return
    setSaving(true)
    try {
      const timestamp = now()
      const rfs = allRecipeFoods.filter((rf) => rf.recipeId === pickedRecipe.id)
      const servings = pickedRecipe.servings || 1
      const logs: FoodLog[] = rfs.map((rf) => ({
        id: crypto.randomUUID(),
        date,
        foodId: rf.foodId,
        meal,
        amountG: (rf.amountG / servings) * count,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      }))
      if (logs.length > 0) await db.foodLogs.bulkAdd(logs)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const Chevron = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-app-faint flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={onClose}>
      <div
        className="w-full bg-app-card rounded-t-2xl p-5 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-app-border rounded-full mx-auto mb-4" />
        <p className="text-base font-extrabold text-app-text mb-3">
          Add to {MEAL_LABELS[meal]}
        </p>

        {pickedRecipe ? (
          /* Recipe serving step */
          <div className="flex flex-col gap-4">
            <div className="bg-app-bg rounded-xl border border-app-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-dark">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-app-text">{pickedRecipe.name}</p>
              </div>
              {(() => { const m = getRecipeMacros(pickedRecipe); return (
                <p className="text-xs text-app-muted">
                  {fmtInt(m.cal)} kcal · {fmt1(m.pro)}g protein per serving
                </p>
              ) })()}
            </div>
            <div>
              <label className="text-xs font-bold text-app-muted block mb-1">Servings</label>
              <input
                type="number"
                inputMode="decimal"
                value={servingCount}
                onChange={(e) => setServingCount(e.target.value)}
                min={0.25}
                step={0.25}
                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              {parseFloat(servingCount) > 0 && (() => {
                const m = getRecipeMacros(pickedRecipe)
                const s = parseFloat(servingCount)
                return (
                  <p className="text-xs text-app-muted mt-1.5">
                    = {fmtInt(m.cal * s)} kcal · {fmt1(m.pro * s)}g protein
                  </p>
                )
              })()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPickedRecipe(null)}
                className="flex-1 bg-app-bg border border-app-border text-app-text font-bold rounded-xl py-2.5 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleAddRecipe}
                disabled={saving || !servingCount || parseFloat(servingCount) <= 0}
                className="flex-1 bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:bg-app-border disabled:text-app-muted"
              >
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        ) : picked ? (
          /* Food amount step */
          <div className="flex flex-col gap-4">
            <div className="bg-app-bg rounded-xl border border-app-border p-3">
              <p className="text-sm font-bold text-app-text">{picked.name}</p>
              <p className="text-xs text-app-muted mt-0.5">
                {picked.caloriesPer100g} kcal · {picked.proteinPer100g}g protein · {picked.carbsPer100g}g carbs · {picked.fatPer100g}g fat per 100 g
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-app-muted block mb-1">Amount (grams)</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              {parseFloat(amount) > 0 && (
                <p className="text-xs text-app-muted mt-1.5">
                  = {fmtInt(picked.caloriesPer100g * parseFloat(amount) / 100)} kcal ·{' '}
                  {fmt1(picked.proteinPer100g * parseFloat(amount) / 100)}g protein
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPicked(null)}
                className="flex-1 bg-app-bg border border-app-border text-app-text font-bold rounded-xl py-2.5 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:bg-app-border disabled:text-app-muted"
              >
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        ) : (
          /* Search step */
          <>
            <input
              type="search"
              placeholder="Search foods…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent mb-3"
              autoFocus
            />
            <div className="overflow-y-auto flex-1 -mx-5 px-5">
              {foodsLoading ? (
                <p className="text-sm text-app-muted text-center py-8">Loading foods…</p>
              ) : (
                <>
                  {/* Recipes section */}
                  {filteredRecipes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[11px] font-bold text-app-muted uppercase tracking-wide mb-1.5">My Recipes</p>
                      <div className="flex flex-col divide-y divide-app-border">
                        {filteredRecipes.map((recipe) => {
                          const { cal, pro } = getRecipeMacros(recipe)
                          return (
                            <button
                              key={recipe.id}
                              onClick={() => { setPickedRecipe(recipe); setServingCount('1') }}
                              className="py-2.5 flex items-center gap-3 text-left active:bg-app-bg/50 w-full"
                            >
                              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent-dark">
                                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-app-text truncate">{recipe.name}</p>
                                <p className="text-xs text-app-muted">{fmtInt(cal)} kcal · {fmt1(pro)}g protein / serving</p>
                              </div>
                              <Chevron />
                            </button>
                          )
                        })}
                      </div>
                      {results.length > 0 && (
                        <p className="text-[11px] font-bold text-app-muted uppercase tracking-wide mt-3 mb-1.5">Foods</p>
                      )}
                    </div>
                  )}

                  {/* Foods section */}
                  {results.length === 0 && filteredRecipes.length === 0 ? (
                    <p className="text-sm text-app-muted text-center py-8">No foods found</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-app-border">
                      {results.map((food) => (
                        <button
                          key={food.id}
                          onClick={() => { setPicked(food); setAmount('100') }}
                          className="py-3 flex items-center gap-3 text-left active:bg-app-bg/50 w-full"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-app-text truncate">{food.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <CategoryBadge category={food.category} />
                              <span className="text-xs text-app-muted">{food.caloriesPer100g} kcal/100g</span>
                            </div>
                          </div>
                          <Chevron />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Diary tab ─────────────────────────────────────────────────────────────────

interface DiaryTabProps {
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number } | null
  date: string
}

// localStorage key for meal photos: drovik:meal-photo:{date}:{meal}
function mealPhotoKey(date: string, meal: MealSlot) {
  return `drovik:meal-photo:${date}:${meal}`
}

function DiaryTab({ targets, date }: DiaryTabProps) {
  const [addingMeal, setAddingMeal] = useState<MealSlot | null>(null)
  const [photoTick, setPhotoTick]   = useState(0)
  const { units } = useUnits()

  const mealPhotos = useMemo(() => {
    const out: Partial<Record<MealSlot, string>> = {}
    for (const m of MEAL_ORDER) {
      const stored = localStorage.getItem(mealPhotoKey(date, m))
      if (stored) out[m] = stored
    }
    return out
  }, [date, photoTick])

  function captureMealPhoto(meal: MealSlot) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        localStorage.setItem(mealPhotoKey(date, meal), dataUrl)
        setPhotoTick((t) => t + 1)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function clearMealPhoto(meal: MealSlot) {
    localStorage.removeItem(mealPhotoKey(date, meal))
    setPhotoTick((t) => t + 1)
  }

  const foodLogs = useLiveQuery(
    () => db.foodLogs.where('date').equals(date).filter((l) => !l.deleted).toArray(),
    [date],
  ) ?? []

  const allFoods = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray(),
    [],
  ) ?? []

  const foodMap = useMemo(() => {
    const m = new Map<string, Food>()
    allFoods.forEach((f) => m.set(f.id, f))
    return m
  }, [allFoods])

  // Nutrition log for water
  const nutritionLog = useLiveQuery(
    () => db.nutritionLogs.filter((l) => l.date === date && !l.deleted).first(),
    [date],
  )

  const waterMl  = nutritionLog?.waterMl ?? 0
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100))

  async function addWater(ml: number) {
    const newTotal = Math.min(waterMl + ml, WATER_GOAL_ML * 2)
    const timestamp = now()
    if (nutritionLog) {
      await db.nutritionLogs.update(nutritionLog.id, { waterMl: newTotal, updatedAt: timestamp, syncedAt: null })
    } else {
      await db.nutritionLogs.add({
        id: crypto.randomUUID(), date,
        calories: null, proteinG: null, carbsG: null, fatG: null, waterMl: newTotal,
        notes: '', createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
      })
    }
  }

  async function removeLog(logId: string) {
    const timestamp = now()
    await db.foodLogs.update(logId, { deleted: true, updatedAt: timestamp, syncedAt: null })
  }

  // Compute daily totals
  const totals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0
    for (const log of foodLogs) {
      const food = foodMap.get(log.foodId)
      if (!food) continue
      const m = macroFromLog(food, log)
      calories += m.calories
      protein  += m.protein
      carbs    += m.carbs
      fat      += m.fat
    }
    return { calories, protein, carbs, fat }
  }, [foodLogs, foodMap])

  return (
    <div className="flex flex-col gap-4">
      {/* Macro summary card */}
      <div className="bg-app-card rounded-2xl border border-app-border p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-app-muted mb-3">Nutrition</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Calories', value: fmtInt(totals.calories), unit: 'kcal', target: targets?.calories, color: 'bg-accent' },
            { label: 'Protein',  value: fmtInt(totals.protein),  unit: 'g',    target: targets?.proteinG, color: 'bg-blue-500' },
            { label: 'Carbs',    value: fmtInt(totals.carbs),    unit: 'g',    target: targets?.carbsG,   color: 'bg-amber-500' },
            { label: 'Fat',      value: fmtInt(totals.fat),      unit: 'g',    target: targets?.fatG,     color: 'bg-red-400' },
          ].map(({ label, value, unit, target, color }) => (
            <div key={label} className="flex flex-col">
              <p className="text-xs text-app-muted">{label}</p>
              <p className="text-base font-extrabold text-app-text leading-tight">{value}<span className="text-[10px] font-normal text-app-muted ml-0.5">{unit}</span></p>
              {target != null && (
                <>
                  <MiniBar value={parseFloat(String(value))} max={target} color={color} />
                  <p className="text-[10px] text-app-faint mt-0.5">{target}{unit}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Meal sections */}
      {MEAL_ORDER.map((meal) => {
        const mealLogs = foodLogs.filter((l) => l.meal === meal)
        const mealTotals = mealLogs.reduce(
          (acc, log) => {
            const food = foodMap.get(log.foodId)
            if (!food) return acc
            const m = macroFromLog(food, log)
            return { cal: acc.cal + m.calories, pro: acc.pro + m.protein }
          },
          { cal: 0, pro: 0 },
        )

        const photo = mealPhotos[meal]
        return (
          <div key={meal} className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div>
                <p className="text-sm font-extrabold text-app-text">{MEAL_LABELS[meal]}</p>
                {mealLogs.length > 0 && (
                  <p className="text-xs text-app-muted">
                    {fmtInt(mealTotals.cal)} kcal · {fmt1(mealTotals.pro)}g protein
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Camera button */}
                <button
                  onClick={() => captureMealPhoto(meal)}
                  className="w-8 h-8 rounded-xl bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-gray-100"
                  aria-label="Add meal photo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setAddingMeal(meal)}
                  className="bg-accent text-app-text text-xs font-bold px-3 py-1.5 rounded-xl active:bg-accent-dark"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Meal photo thumbnail */}
            {photo && (
              <div className="relative mx-4 mb-2 rounded-xl overflow-hidden" style={{ aspectRatio: '16/7' }}>
                <img src={photo} alt="Meal photo" className="w-full h-full object-cover" />
                <button
                  onClick={() => clearMealPhoto(meal)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white"
                  aria-label="Remove photo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {mealLogs.length > 0 ? (
              <div className="divide-y divide-app-border border-t border-app-border">
                {mealLogs.map((log) => {
                  const food = foodMap.get(log.foodId)
                  if (!food) return null
                  const m = macroFromLog(food, log)
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-app-text truncate">{food.name}</p>
                        <p className="text-xs text-app-muted">
                          {log.amountG}g · {fmtInt(m.calories)} kcal · {fmt1(m.protein)}g P · {fmt1(m.carbs)}g C · {fmt1(m.fat)}g F
                        </p>
                      </div>
                      <button
                        onClick={() => removeLog(log.id)}
                        className="w-7 h-7 flex items-center justify-center text-app-faint active:text-red-500 flex-shrink-0"
                        aria-label="Remove"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-app-faint px-4 pb-3">Nothing logged yet</p>
            )}
          </div>
        )
      })}

      {/* Water tracking */}
      <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
              <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 017.877 10.58 7.423 7.423 0 01-7.603 7.5c-4.114 0-7.47-3.036-7.47-7.125 0-3.6 2.488-6.7 5.91-7.765a.75.75 0 01.977.702v5.263a.75.75 0 001.5 0V4.14a.75.75 0 01.777-.746z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-app-text">Water</p>
            <p className="text-xs text-app-muted">{mlToDisplay(waterMl, units.water)} {waterLabel(units.water)} · {mlToDisplay(Math.max(0, WATER_GOAL_ML - waterMl), units.water)} {waterLabel(units.water)} remaining</p>
          </div>
          <p className="text-sm font-extrabold text-blue-500">{waterPct}%</p>
        </div>
        <div className="h-1.5 bg-app-border mx-4 mb-3 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${waterPct}%` }} />
        </div>
        <div className="flex gap-2 px-4 pb-4">
          {(units.water === 'fl_oz' ? [237, 473, 710] : [250, 500, 750]).map((ml) => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              className="flex-1 bg-blue-50 text-blue-600 text-sm font-bold py-2 rounded-xl active:bg-blue-100"
            >
              +{mlToDisplay(ml, units.water)} {waterLabel(units.water)}
            </button>
          ))}
        </div>
      </div>

      {addingMeal && (
        <FoodSearchModal meal={addingMeal} date={date} onClose={() => setAddingMeal(null)} />
      )}
    </div>
  )
}

// ── Custom food modal ─────────────────────────────────────────────────────────

function AddCustomFoodModal({ onClose }: { onClose: () => void }) {
  const [name, setName]       = useState('')
  const [category, setCategory] = useState<FoodCategory>('other')
  const [cal, setCal]         = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs]     = useState('')
  const [fat, setFat]         = useState('')
  const [saving, setSaving]   = useState(false)

  const categories = Object.keys(CATEGORY_LABELS) as FoodCategory[]

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const timestamp = now()
      await db.foods.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        category,
        caloriesPer100g: parseFloat(cal) || 0,
        proteinPer100g:  parseFloat(protein) || 0,
        carbsPer100g:    parseFloat(carbs) || 0,
        fatPer100g:      parseFloat(fat) || 0,
        isCustom: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={onClose}>
      <div
        className="w-full bg-app-card rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-app-border rounded-full mx-auto mb-4" />
        <p className="text-base font-extrabold text-app-text mb-4">Add Custom Food</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Food name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Homemade Granola"
              className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <p className="text-xs font-bold text-app-muted mt-1">Per 100 g</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories (kcal)', value: cal, setter: setCal },
              { label: 'Protein (g)',     value: protein, setter: setProtein },
              { label: 'Carbs (g)',       value: carbs, setter: setCarbs },
              { label: 'Fat (g)',         value: fat, setter: setFat },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs text-app-muted block mb-1">{label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  min={0}
                  className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-app-bg border border-app-border text-app-text font-bold rounded-xl py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Food'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Foods tab ─────────────────────────────────────────────────────────────────

function FoodsTab() {
  const [query, setQuery]         = useState('')
  const [catFilter, setCatFilter] = useState<FoodCategory | 'all'>('all')
  const [showAdd, setShowAdd]     = useState(false)

  const allFoods = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray().then((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    ),
    [],
  ) ?? []

  const filtered = useMemo(() => {
    let list = allFoods
    if (catFilter !== 'all') list = list.filter((f) => f.category === catFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((f) => f.name.toLowerCase().includes(q))
    }
    return list
  }, [allFoods, catFilter, query])

  const categories: Array<FoodCategory | 'all'> = ['all', 'protein', 'grain', 'vegetable', 'fruit', 'dairy', 'fat', 'nut', 'legume', 'supplement', 'other']

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Search */}
      <input
        type="search"
        placeholder="Search foods…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={[
              'flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
              catFilter === c
                ? 'bg-accent border-accent text-app-text'
                : 'bg-app-bg border-app-border text-app-muted',
            ].join(' ')}
          >
            {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Food list */}
      <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-app-muted text-center py-8">No foods found</p>
        ) : (
          <div className="divide-y divide-app-border">
            {filtered.map((food) => (
              <div key={food.id} className="px-4 py-3">
                <div className="flex items-start gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-app-text flex-1">{food.name}</p>
                  <CategoryBadge category={food.category} />
                  {food.isCustom && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-light text-accent-dark">Custom</span>
                  )}
                </div>
                <p className="text-xs text-app-muted">
                  {food.caloriesPer100g} kcal · {food.proteinPer100g}g P · {food.carbsPer100g}g C · {food.fatPer100g}g F per 100g
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Add Custom Food */}
      <div className="sticky bottom-4 flex justify-end pb-20">
        <button
          onClick={() => setShowAdd(true)}
          className="bg-accent text-app-text font-bold text-sm rounded-2xl px-4 py-3 shadow-lg active:bg-accent-dark flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" />
          </svg>
          Add Custom Food
        </button>
      </div>

      {showAdd && <AddCustomFoodModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Recipe builder ────────────────────────────────────────────────────────────

interface RecipeFoodEntry {
  foodId: string
  amountG: number
}

function NewRecipeModal({ onClose }: { onClose: () => void }) {
  const [name, setName]           = useState('')
  const [servings, setServings]   = useState('1')
  const [notes, setNotes]         = useState('')
  const [ingredients, setIngredients] = useState<RecipeFoodEntry[]>([])
  const [foodQuery, setFoodQuery] = useState('')
  const [pickingFood, setPickingFood] = useState(false)
  const [pickedFood, setPickedFood]   = useState<Food | null>(null)
  const [ingAmount, setIngAmount] = useState('100')
  const [saving, setSaving]       = useState(false)

  const allFoods = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray().then((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    ),
    [],
  ) ?? []

  const foodMap = useMemo(() => {
    const m = new Map<string, Food>()
    allFoods.forEach((f) => m.set(f.id, f))
    return m
  }, [allFoods])

  const filteredFoods = useMemo(() => {
    if (!foodQuery.trim()) return allFoods
    const q = foodQuery.toLowerCase()
    return allFoods.filter((f) => f.name.toLowerCase().includes(q))
  }, [allFoods, foodQuery])

  function addIngredient() {
    if (!pickedFood) return
    const g = parseFloat(ingAmount)
    if (isNaN(g) || g <= 0) return
    setIngredients((prev) => [...prev, { foodId: pickedFood.id, amountG: g }])
    setPickedFood(null)
    setPickingFood(false)
    setFoodQuery('')
    setIngAmount('100')
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const timestamp = now()
      const recipeId = crypto.randomUUID()
      await db.recipes.add({
        id: recipeId,
        name: name.trim(),
        servings: parseInt(servings) || 1,
        notes,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      })
      const recipeFoods: RecipeFood[] = ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        recipeId,
        foodId: ing.foodId,
        amountG: ing.amountG,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      }))
      if (recipeFoods.length > 0) await db.recipeFoods.bulkAdd(recipeFoods)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={onClose}>
      <div
        className="w-full bg-app-card rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-app-border rounded-full mx-auto" />
        <p className="text-base font-extrabold text-app-text">New Recipe</p>

        <div>
          <label className="text-xs font-bold text-app-muted block mb-1">Recipe name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken Rice Bowl"
            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-bold text-app-muted block mb-1">Servings</label>
          <input
            type="number"
            inputMode="numeric"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min={1}
            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Ingredients */}
        <div>
          <p className="text-xs font-bold text-app-muted mb-2">Ingredients</p>
          {ingredients.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {ingredients.map((ing, idx) => {
                const food = foodMap.get(ing.foodId)
                if (!food) return null
                return (
                  <div key={idx} className="flex items-center gap-2 bg-app-bg rounded-xl border border-app-border px-3 py-2">
                    <p className="text-sm text-app-text flex-1">{food.name} <span className="text-app-muted">— {ing.amountG}g</span></p>
                    <button onClick={() => removeIngredient(idx)} className="text-app-faint active:text-red-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {pickingFood ? (
            pickedFood ? (
              <div className="flex flex-col gap-2">
                <div className="bg-app-bg rounded-xl border border-app-border px-3 py-2">
                  <p className="text-sm font-semibold text-app-text">{pickedFood.name}</p>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={ingAmount}
                  onChange={(e) => setIngAmount(e.target.value)}
                  placeholder="Amount in grams"
                  className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <button onClick={() => setPickedFood(null)} className="flex-1 bg-app-bg border border-app-border text-app-text font-bold rounded-xl py-2 text-sm">Back</button>
                  <button onClick={addIngredient} className="flex-1 bg-accent text-app-text font-bold rounded-xl py-2 text-sm active:bg-accent-dark">Add</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="search"
                  placeholder="Search foods…"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto divide-y divide-app-border bg-app-bg rounded-xl border border-app-border">
                  {filteredFoods.slice(0, 30).map((food) => (
                    <button
                      key={food.id}
                      onClick={() => { setPickedFood(food); setIngAmount('100') }}
                      className="w-full text-left px-3 py-2 text-sm text-app-text active:bg-app-border/30"
                    >
                      {food.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPickingFood(false)} className="text-sm text-app-muted">Cancel</button>
              </div>
            )
          ) : (
            <button
              onClick={() => setPickingFood(true)}
              className="w-full border border-dashed border-app-border rounded-xl py-2.5 text-sm text-app-muted font-semibold"
            >
              + Add ingredient
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-app-muted block mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-app-bg border border-app-border text-app-text font-bold rounded-xl py-2.5 text-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:bg-app-border disabled:text-app-muted"
          >
            {saving ? 'Saving…' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface RecipeDetailModalProps {
  recipe: Recipe
  onClose: () => void
}

function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
  const [logging, setLogging] = useState(false)
  const [loggedMeal, setLoggedMeal] = useState<MealSlot>('breakfast')

  const recipeFoods = useLiveQuery(
    () => db.recipeFoods.where('recipeId').equals(recipe.id).filter((r) => !r.deleted).toArray(),
    [recipe.id],
  ) ?? []

  const allFoods = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray(),
    [],
  ) ?? []

  const foodMap = useMemo(() => {
    const m = new Map<string, Food>()
    allFoods.forEach((f) => m.set(f.id, f))
    return m
  }, [allFoods])

  const servings = recipe.servings || 1

  const totals = useMemo(() => {
    let cal = 0, pro = 0, carbs = 0, fat = 0
    for (const rf of recipeFoods) {
      const food = foodMap.get(rf.foodId)
      if (!food) continue
      const factor = rf.amountG / 100
      cal   += food.caloriesPer100g * factor
      pro   += food.proteinPer100g  * factor
      carbs += food.carbsPer100g    * factor
      fat   += food.fatPer100g      * factor
    }
    return {
      cal:   cal / servings,
      pro:   pro / servings,
      carbs: carbs / servings,
      fat:   fat / servings,
    }
  }, [recipeFoods, foodMap, servings])

  async function logServing() {
    setLogging(true)
    try {
      const timestamp = now()
      const todayStr  = today()
      const logs: FoodLog[] = recipeFoods.map((rf) => ({
        id: crypto.randomUUID(),
        date: todayStr,
        foodId: rf.foodId,
        meal: loggedMeal,
        amountG: rf.amountG / servings,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: null,
        deleted: false,
      }))
      await db.foodLogs.bulkAdd(logs)
      onClose()
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={onClose}>
      <div
        className="w-full bg-app-card rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-app-border rounded-full mx-auto" />
        <div>
          <p className="text-base font-extrabold text-app-text">{recipe.name}</p>
          <p className="text-xs text-app-muted">{servings} serving{servings !== 1 ? 's' : ''}</p>
        </div>

        {/* Per-serving macros */}
        <div className="grid grid-cols-4 gap-2 bg-app-bg rounded-xl border border-app-border p-3">
          {[
            { label: 'Cal',    value: fmtInt(totals.cal),   unit: 'kcal' },
            { label: 'Protein', value: fmt1(totals.pro),    unit: 'g' },
            { label: 'Carbs',  value: fmt1(totals.carbs),   unit: 'g' },
            { label: 'Fat',    value: fmt1(totals.fat),     unit: 'g' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-app-muted">{label}</p>
              <p className="text-sm font-extrabold text-app-text">{value}<span className="text-[10px] font-normal text-app-muted"> {unit}</span></p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-app-muted -mt-1">Per serving</p>

        {/* Ingredients */}
        {recipeFoods.length > 0 && (
          <div>
            <p className="text-xs font-bold text-app-muted mb-2">Ingredients (per serving)</p>
            <div className="flex flex-col gap-1">
              {recipeFoods.map((rf) => {
                const food = foodMap.get(rf.foodId)
                if (!food) return null
                const perServing = rf.amountG / servings
                return (
                  <div key={rf.id} className="flex items-center gap-2 bg-app-bg rounded-xl border border-app-border px-3 py-2">
                    <p className="text-sm text-app-text flex-1">{food.name}</p>
                    <p className="text-xs text-app-muted">{fmt1(perServing)}g</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recipe.notes.trim() && (
          <div className="bg-app-bg rounded-xl border border-app-border px-3 py-2">
            <p className="text-xs font-bold text-app-muted mb-1">Notes</p>
            <p className="text-sm text-app-text">{recipe.notes}</p>
          </div>
        )}

        {/* Log serving */}
        <div>
          <p className="text-xs font-bold text-app-muted mb-2">Log to meal</p>
          <div className="flex gap-2 mb-3">
            {MEAL_ORDER.map((m) => (
              <button
                key={m}
                onClick={() => setLoggedMeal(m)}
                className={[
                  'flex-1 text-xs font-bold py-2 rounded-xl border transition-colors',
                  loggedMeal === m
                    ? 'bg-accent border-accent text-app-text'
                    : 'bg-app-bg border-app-border text-app-muted',
                ].join(' ')}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={logServing}
            disabled={logging}
            className="w-full bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:opacity-50"
          >
            {logging ? 'Logging…' : 'Log 1 Serving'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecipesTab() {
  const [showNew, setShowNew]       = useState(false)
  const [selected, setSelected]     = useState<Recipe | null>(null)

  const recipes = useLiveQuery(
    () => db.recipes.filter((r) => !r.deleted).toArray().then((list) =>
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    ),
    [],
  ) ?? []

  const allFoods = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).toArray(),
    [],
  ) ?? []

  const allRecipeFoods = useLiveQuery(
    () => db.recipeFoods.filter((r) => !r.deleted).toArray(),
    [],
  ) ?? []

  const foodMap = useMemo(() => {
    const m = new Map<string, Food>()
    allFoods.forEach((f) => m.set(f.id, f))
    return m
  }, [allFoods])

  function recipePerServingMacros(recipe: Recipe) {
    const rfs = allRecipeFoods.filter((rf) => rf.recipeId === recipe.id)
    const servings = recipe.servings || 1
    let cal = 0, pro = 0
    for (const rf of rfs) {
      const food = foodMap.get(rf.foodId)
      if (!food) continue
      cal += food.caloriesPer100g * rf.amountG / 100
      pro += food.proteinPer100g  * rf.amountG / 100
    }
    return { cal: cal / servings, pro: pro / servings }
  }

  return (
    <div className="flex flex-col gap-3 relative">
      {recipes.length === 0 ? (
        <div className="bg-app-card rounded-2xl border border-app-border p-8 text-center">
          <p className="text-sm text-app-muted mb-4">No recipes yet. Create your first recipe to quickly log common meals.</p>
          <button
            onClick={() => setShowNew(true)}
            className="bg-accent text-app-text font-bold text-sm rounded-xl px-4 py-2.5 active:bg-accent-dark"
          >
            + New Recipe
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recipes.map((recipe) => {
              const { cal, pro } = recipePerServingMacros(recipe)
              return (
                <button
                  key={recipe.id}
                  onClick={() => setSelected(recipe)}
                  className="bg-app-card rounded-2xl border border-app-border p-4 text-left active:bg-app-bg"
                >
                  <p className="text-sm font-extrabold text-app-text">{recipe.name}</p>
                  <p className="text-xs text-app-muted mt-0.5">
                    {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} · {fmtInt(cal)} kcal · {fmt1(pro)}g protein per serving
                  </p>
                </button>
              )
            })}
          </div>

          <div className="sticky bottom-4 flex justify-end pb-20">
            <button
              onClick={() => setShowNew(true)}
              className="bg-accent text-app-text font-bold text-sm rounded-2xl px-4 py-3 shadow-lg active:bg-accent-dark flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" />
              </svg>
              New Recipe
            </button>
          </div>
        </>
      )}

      {showNew    && <NewRecipeModal onClose={() => setShowNew(false)} />}
      {selected   && <RecipeDetailModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ── Plan tab ──────────────────────────────────────────────────────────────────

interface PlanTabProps {
  onProfileSaved: (p: NutritionProfile) => void
}

function PlanTab({ onProfileSaved }: PlanTabProps) {
  const storedProfile = loadProfile()

  // Latest body weight for TDEE calc
  const latestWeight = useLiveQuery(
    () => db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => {
        if (list.length === 0) return null
        list.sort((a, b) => b.date.localeCompare(a.date))
        return list[0].weight
      }),
    [],
  )

  const [height,   setHeight]   = useState(String(storedProfile?.heightCm   ?? ''))
  const [age,      setAge]      = useState(String(storedProfile?.age         ?? ''))
  const [sex,      setSex]      = useState<Sex>(storedProfile?.sex           ?? 'male')
  const [activity, setActivity] = useState<ActivityLevel>(storedProfile?.activityLevel ?? 'moderate')
  const [dietId,   setDietId]   = useState<DietId>(storedProfile?.dietId    ?? 'standard')
  const [saved,    setSaved]    = useState(false)

  const weightKg = latestWeight ?? 80

  const bmr = useMemo(() => {
    const h = parseFloat(height)
    const a = parseFloat(age)
    if (!h || !a || !weightKg) return null
    return calcBMR(weightKg, h, a, sex)
  }, [weightKg, height, age, sex])

  const tdee = useMemo(() => {
    if (bmr == null) return null
    return calcTDEE(bmr, activity)
  }, [bmr, activity])

  const diet = DIET_PROGRAMS.find((d) => d.id === dietId)!
  const macros = useMemo(() => {
    if (tdee == null) return null
    return calcMacros(weightKg, tdee, diet)
  }, [weightKg, tdee, diet])

  function handleSave() {
    const h = parseFloat(height)
    const a = parseFloat(age)
    if (!h || !a) return
    const profile: NutritionProfile = { heightCm: h, age: a, sex, activityLevel: activity, dietId }
    saveProfile(profile)
    onProfileSaved(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* TDEE Calculator */}
      <div className="bg-app-card rounded-2xl border border-app-border p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-app-muted mb-3">TDEE Calculator</p>

        {latestWeight == null && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-amber-700">Log your body weight on the Goals page to personalise your TDEE calculation.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Weight (kg)</label>
            <div className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text">
              {latestWeight != null ? `${latestWeight} kg` : 'Not logged'}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Height (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="178"
              className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Age</label>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="28"
              className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-app-muted block mb-1">Sex</label>
            <div className="flex rounded-xl overflow-hidden border border-app-border">
              {(['male', 'female'] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={[
                    'flex-1 py-2.5 text-sm font-bold transition-colors',
                    sex === s ? 'bg-accent text-app-text' : 'bg-app-bg text-app-muted',
                  ].join(' ')}
                >
                  {s === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs font-bold text-app-muted block mb-1">Activity level</label>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
            ))}
          </select>
        </div>

        {bmr != null && tdee != null && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-app-bg rounded-xl border border-app-border p-3 text-center">
              <p className="text-xs text-app-muted">BMR</p>
              <p className="text-base font-extrabold text-app-text">{bmr}</p>
              <p className="text-[10px] text-app-faint">kcal/day</p>
            </div>
            <div className="bg-app-bg rounded-xl border border-app-border p-3 text-center">
              <p className="text-xs text-app-muted">TDEE</p>
              <p className="text-base font-extrabold text-accent-dark">{tdee}</p>
              <p className="text-[10px] text-app-faint">kcal/day</p>
            </div>
            <div className="bg-app-bg rounded-xl border border-app-border p-3 text-center">
              <p className="text-xs text-app-muted">Target</p>
              <p className="text-base font-extrabold text-app-text">{macros?.calories ?? '—'}</p>
              <p className="text-[10px] text-app-faint">kcal/day</p>
            </div>
          </div>
        )}

        {macros != null && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-2 text-center">
              <p className="text-xs text-blue-500">Protein</p>
              <p className="text-sm font-extrabold text-blue-700">{macros.proteinG}g</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-2 text-center">
              <p className="text-xs text-amber-500">Carbs</p>
              <p className="text-sm font-extrabold text-amber-700">{macros.carbsG}g</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-100 p-2 text-center">
              <p className="text-xs text-red-400">Fat</p>
              <p className="text-sm font-extrabold text-red-600">{macros.fatG}g</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!height || !age}
          className="w-full bg-accent text-app-text font-bold rounded-xl py-2.5 text-sm active:bg-accent-dark disabled:opacity-50"
        >
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Diet Program selection */}
      <div className="bg-app-card rounded-2xl border border-app-border p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-app-muted mb-3">Diet Program</p>
        <div className="flex flex-col gap-2">
          {DIET_PROGRAMS.map((program) => {
            const isActive = program.id === dietId
            return (
              <button
                key={program.id}
                onClick={() => setDietId(program.id)}
                className={[
                  'rounded-xl border p-3 text-left transition-colors',
                  isActive
                    ? 'bg-accent-light border-accent'
                    : 'bg-app-bg border-app-border',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-app-text">{program.name}</p>
                    <p className="text-xs text-app-muted">{program.tagline}</p>
                  </div>
                  {isActive && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-accent-dark flex-shrink-0">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {isActive && (
                  <p className="text-xs text-app-text mt-1.5">{program.allowedNote}</p>
                )}
                {isActive && program.restrictedCategories.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {program.restrictedCategories.map((cat) => (
                      <span key={cat} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                        Avoid: {cat}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'diary' | 'foods' | 'recipes' | 'plan'

export default function Nutrition() {
  const [tab, setTab] = useState<Tab>('diary')
  const [diaryDate, setDiaryDate] = useState(today)

  const [profile, setProfile] = useState<NutritionProfile | null>(() => loadProfile())

  // Latest body weight for macro targets
  const latestWeight = useLiveQuery(
    () => db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => {
        if (list.length === 0) return null
        list.sort((a, b) => b.date.localeCompare(a.date))
        return list[0].weight
      }),
    [],
  )

  const targets = useMemo(() => {
    if (!profile || latestWeight == null) return null
    const bmr  = calcBMR(latestWeight, profile.heightCm, profile.age, profile.sex)
    const tdee = calcTDEE(bmr, profile.activityLevel)
    const diet = DIET_PROGRAMS.find((d) => d.id === profile.dietId)!
    return calcMacros(latestWeight, tdee, diet)
  }, [profile, latestWeight])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'diary',   label: 'Diary'   },
    { id: 'foods',   label: 'Foods'   },
    { id: 'recipes', label: 'Recipes' },
    { id: 'plan',    label: 'Plan'    },
  ]

  return (
    <div className="page-x pt-5 overflow-x-hidden">
      <h1 className="text-2xl font-extrabold text-app-text mb-4">Nutrition</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-app-border/30 rounded-2xl p-1 mb-5">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex-1 rounded-xl py-2 text-sm font-bold transition-colors',
              tab === id ? 'bg-accent text-app-text shadow-sm' : 'text-app-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'diary' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDiaryDate((d) => addDiaryDays(d, -1))}
              className="w-9 h-9 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-muted active:bg-app-border"
              aria-label="Previous day"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <p className="text-sm font-bold text-app-text">{formatDiaryDate(diaryDate)}</p>
            <button
              onClick={() => setDiaryDate((d) => addDiaryDays(d, 1))}
              disabled={diaryDate >= today()}
              className="w-9 h-9 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-muted active:bg-app-border disabled:opacity-40"
              aria-label="Next day"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <DiaryTab targets={targets} date={diaryDate} />
        </>
      )}
      {tab === 'foods'   && <FoodsTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'plan'    && <PlanTab onProfileSaved={setProfile} />}
    </div>
  )
}
