/**
 * exerciseSearch.ts — rich exercise search with aliases, synonyms, and multi-field matching.
 *
 * Covers:
 *  - Alternative/common names  (e.g. "skull crusher" → Skullcrusher)
 *  - Abbreviations             (e.g. "rdl", "ohp", "dl", "cgbp")
 *  - Muscle-group synonyms     (e.g. "pec" → Chest, "delts" → Shoulders)
 *  - Equipment synonyms        (e.g. "smith" → machine, "ez" → barbell)
 *  - Movement patterns         (e.g. "push", "pull", "hinge", "squat")
 */

import type { Exercise } from '../db/db'

// ── Synonym / alias expansion ─────────────────────────────────────────────────
// Each key is a word the user might type; values are words we inject into the
// searchable text so they match exercises.

const SYNONYMS: Record<string, string[]> = {
  // ── Abbreviations ──────────────────────────────────────────────────────────
  'rdl':   ['romanian', 'deadlift'],
  'ohp':   ['overhead', 'press', 'shoulder'],
  'dl':    ['deadlift'],
  'bp':    ['bench', 'press'],
  'cgbp':  ['close', 'grip', 'bench', 'press'],
  'db':    ['dumbbell'],
  'bb':    ['barbell'],
  'kb':    ['kettlebell'],
  'ez':    ['barbell', 'curl', 'skullcrusher'],
  'bw':    ['bodyweight'],
  'rpe':   [],
  'rir':   [],
  'amrap': [],

  // ── Muscle group synonyms ──────────────────────────────────────────────────
  'pec':          ['chest'],
  'pecs':         ['chest'],
  'pectoral':     ['chest'],
  'pectorals':    ['chest'],
  'lat':          ['back', 'latissimus'],
  'lats':         ['back', 'latissimus'],
  'latissimus':   ['back'],
  'trap':         ['traps', 'upper back'],
  'traps':        ['traps'],
  'delt':         ['shoulders'],
  'delts':        ['shoulders'],
  'deltoid':      ['shoulders'],
  'deltoids':     ['shoulders'],
  'bi':           ['biceps'],
  'bis':          ['biceps'],
  'bicep':        ['biceps'],
  'tri':          ['triceps'],
  'tris':         ['triceps'],
  'tricep':       ['triceps'],
  'quad':         ['quads'],
  'quads':        ['quads'],
  'quadricep':    ['quads'],
  'quadriceps':   ['quads'],
  'ham':          ['hamstrings'],
  'hams':         ['hamstrings'],
  'hamstring':    ['hamstrings'],
  'glute':        ['glutes'],
  'gluteus':      ['glutes'],
  'butt':         ['glutes'],
  'booty':        ['glutes'],
  'calf':         ['calves'],
  'forearm':      ['forearms'],
  'ab':           ['core', 'abs'],
  'abs':          ['core'],
  'abdominal':    ['core'],
  'abdominals':   ['core'],
  'oblique':      ['core'],
  'obliques':     ['core'],
  'lower back':   ['lower back', 'erector'],
  'erector':      ['lower back', 'spinae'],
  'neck':         ['neck'],
  'adductor':     ['inner thigh'],
  'inner':        ['inner thigh', 'adductor'],
  'groin':        ['inner thigh', 'adductor'],

  // ── Common alternative exercise names ─────────────────────────────────────
  'skull crusher':         ['skullcrusher', 'triceps'],
  'skull crushers':        ['skullcrusher', 'triceps'],
  'skullcrusher':          ['skull', 'crusher', 'triceps'],
  'lying tricep':          ['skullcrusher', 'triceps'],
  'lying extension':       ['skullcrusher', 'triceps'],
  'french press':          ['overhead', 'triceps', 'extension'],
  'close grip':            ['close-grip', 'triceps'],
  'cg bench':              ['close-grip', 'bench', 'press'],

  'military press':        ['overhead', 'press', 'shoulders'],
  'shoulder press':        ['overhead', 'press', 'shoulders'],
  'strict press':          ['overhead', 'press', 'shoulders'],
  'standing press':        ['overhead', 'press', 'shoulders'],

  'chin up':               ['pull-up', 'chinup', 'biceps'],
  'chin-up':               ['pull-up', 'chinup', 'biceps'],
  'chinup':                ['pull-up', 'biceps'],
  'pullup':                ['pull-up'],
  'pull up':               ['pull-up'],
  'bodyweight row':        ['inverted row', 'back'],
  'inverted row':          ['bodyweight', 'row', 'back'],
  'aussie pull up':        ['inverted row', 'back'],
  'australian pull up':    ['inverted row', 'back'],

  'hip hinge':             ['deadlift', 'rdl', 'romanian', 'kettlebell', 'swing'],
  'hip thrust':            ['glutes', 'thrust'],
  'glute bridge':          ['hip thrust', 'glutes'],
  'bridge':                ['glutes', 'hip thrust'],

  'stiff leg':             ['romanian', 'deadlift', 'hamstrings'],
  'sldl':                  ['stiff-leg', 'deadlift', 'hamstrings'],
  'conventional':          ['deadlift'],
  'sumo':                  ['sumo deadlift', 'inner thigh', 'quads'],
  'trap bar':              ['deadlift', 'hex bar'],
  'hex bar':               ['deadlift', 'trap bar'],

  'back squat':            ['squat', 'quads', 'barbell'],
  'front squat':           ['squat', 'quads', 'barbell'],
  'goblet':                ['squat', 'dumbbell', 'kettlebell', 'quads'],
  'split squat':           ['lunge', 'bulgarian', 'quads'],
  'bulgarian':             ['split squat', 'quads', 'glutes'],
  'lunges':                ['lunge', 'quads', 'glutes'],
  'step up':               ['step-up', 'quads', 'glutes'],
  'leg day':               ['squat', 'lunge', 'press', 'quads'],

  'flat bench':            ['bench press', 'chest'],
  'incline bench':         ['incline', 'press', 'chest'],
  'decline bench':         ['decline', 'press', 'chest'],
  'chest press':           ['bench press', 'chest'],
  'push up':               ['push-up', 'chest', 'triceps'],
  'pushup':                ['push-up', 'chest'],
  'dip':                   ['chest', 'triceps', 'dips'],
  'dips':                  ['chest', 'triceps'],
  'fly':                   ['fly', 'chest'],
  'flye':                  ['fly', 'chest'],
  'flyes':                 ['fly', 'chest'],
  'flies':                 ['fly', 'chest'],
  'cable fly':             ['cable', 'fly', 'chest'],
  'pec deck':              ['fly', 'machine', 'chest'],
  'cable crossover':       ['cable', 'fly', 'chest'],

  'bent over row':         ['row', 'back', 'barbell'],
  'bent-over':             ['row', 'back'],
  'pendlay':               ['row', 'back', 'barbell'],
  'yates':                 ['row', 'back'],
  't-bar':                 ['row', 'back'],
  'seal row':              ['row', 'back'],
  'chest supported':       ['row', 'back'],
  'seated row':            ['row', 'cable', 'back'],
  'cable row':             ['row', 'cable', 'back'],

  'lat pull':              ['lat pulldown', 'back'],
  'lat pulldown':          ['lat', 'pulldown', 'back'],
  'pulldown':              ['lat', 'back'],
  'straight arm':          ['pulldown', 'back'],
  'pull through':          ['cable', 'glutes', 'hamstrings'],

  'lateral raise':         ['shoulder', 'dumbbell', 'delt'],
  'side raise':            ['lateral raise', 'shoulders'],
  'front raise':           ['shoulder', 'front', 'delt'],
  'reverse fly':           ['rear delt', 'back', 'shoulders'],
  'rear delt':             ['reverse fly', 'shoulders', 'back'],
  'face pull':             ['rear delt', 'cable', 'shoulders'],
  'upright row':           ['shoulders', 'traps'],
  'shrug':                 ['traps', 'shoulders'],
  'shrugs':                ['traps', 'shoulders'],

  'hammer curl':           ['biceps', 'forearms', 'dumbbell'],
  'preacher curl':         ['biceps', 'curl'],
  'concentration curl':    ['biceps', 'dumbbell'],
  'incline curl':          ['biceps', 'dumbbell'],
  'spider curl':           ['biceps'],
  'cable curl':            ['biceps', 'cable'],
  'reverse curl':          ['forearms', 'biceps'],
  'wrist curl':            ['forearms'],

  'pushdown':              ['triceps', 'cable'],
  'push down':             ['triceps', 'cable'],
  'tricep pushdown':       ['triceps', 'cable', 'pushdown'],
  'overhead extension':    ['triceps', 'extension'],
  'kick back':             ['triceps', 'dumbbell'],
  'kickback':              ['triceps', 'dumbbell'],

  'good morning':          ['hamstrings', 'lower back', 'barbell'],
  'back extension':        ['lower back', 'glutes', 'hamstrings'],
  'hyperextension':        ['lower back', 'glutes', 'hamstrings'],
  'glute ham raise':       ['hamstrings', 'glutes'],
  'ghr':                   ['glute', 'ham', 'raise', 'hamstrings'],
  'nordic curl':           ['hamstrings', 'bodyweight'],

  'calf raise':            ['calves'],
  'standing calf':         ['calves'],
  'seated calf':           ['calves'],
  'donkey calf':           ['calves'],

  'plank':                 ['core', 'bodyweight'],
  'crunch':                ['core', 'abs'],
  'sit up':                ['core', 'abs'],
  'situp':                 ['core', 'abs'],
  'leg raise':             ['core', 'abs'],
  'hanging':               ['core', 'abs', 'bodyweight'],
  'russian twist':         ['core', 'obliques'],
  'ab wheel':              ['core', 'abs'],
  'rollout':               ['core', 'abs'],
  'pallof':                ['core', 'cable'],

  'clean':                 ['power clean', 'full body'],
  'snatch':                ['power snatch', 'full body'],
  'thruster':              ['squat', 'press', 'full body'],
  'kettlebell swing':      ['kettlebell', 'glutes', 'hamstrings'],
  'swing':                 ['kettlebell', 'glutes'],

  'run':                   ['running', 'cardio'],
  'jog':                   ['running', 'cardio'],
  'sprint':                ['running', 'cardio'],
  'bike':                  ['cycling', 'cardio'],
  'cycle':                 ['cycling', 'cardio'],
  'row machine':           ['rowing', 'cardio'],
  'rowing machine':        ['rowing', 'cardio'],
  'erg':                   ['rowing', 'cardio'],
  'jump rope':             ['cardio', 'jump'],
  'skip':                  ['cardio', 'jump rope'],
  'jumping jack':          ['cardio', 'bodyweight'],
  'burpee':                ['cardio', 'bodyweight', 'full body'],
  'assault bike':          ['cardio', 'bike'],
  'sled':                  ['cardio', 'push', 'legs'],
  'prowler':               ['sled', 'cardio'],
}

// ── Build searchable text for one exercise ────────────────────────────────────

function buildSearchText(e: Exercise): string {
  return [
    e.name,
    e.muscleGroup,
    e.category,
    e.instructions ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

// ── Score: how well does this exercise match the query? ───────────────────────
// Returns 0 (no match) or a positive number (higher = better).

export function scoreExercise(e: Exercise, rawQuery: string): number {
  if (!rawQuery.trim()) return 1 // empty query matches everything

  const query = rawQuery.toLowerCase().trim()
  const searchText = buildSearchText(e)

  // Exact name match — highest priority
  if (e.name.toLowerCase() === query) return 100

  // Name starts with query
  if (e.name.toLowerCase().startsWith(query)) return 80

  // Check direct substring match on searchable text
  if (searchText.includes(query)) return 60

  // Tokenise query into words, require ALL tokens to match (direct or via synonym)
  const tokens = query.split(/\s+/).filter(Boolean)
  let totalScore = 0

  for (const token of tokens) {
    let tokenScore = 0

    // Direct match in searchable text
    if (searchText.includes(token)) {
      tokenScore = 40
    } else {
      // Try synonym expansion for this token
      const expanded = SYNONYMS[token] ?? []
      for (const syn of expanded) {
        if (searchText.includes(syn)) {
          tokenScore = 20
          break
        }
      }

      // Also try multi-word synonym keys that start with this token
      if (!tokenScore) {
        for (const [key, syns] of Object.entries(SYNONYMS)) {
          if (key.startsWith(token) || key.includes(token)) {
            for (const syn of syns) {
              if (searchText.includes(syn)) {
                tokenScore = 15
                break
              }
            }
          }
          if (tokenScore) break
        }
      }
    }

    if (tokenScore === 0) return 0 // all tokens must match
    totalScore += tokenScore
  }

  return totalScore
}

// ── Main filter function ──────────────────────────────────────────────────────

export function filterExercises(exercises: Exercise[], query: string): Exercise[] {
  if (!query.trim()) return exercises

  const scored = exercises
    .map((e) => ({ e, score: scoreExercise(e, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map(({ e }) => e)
}
