/**
 * merge-exercises.mjs
 *
 * One-off script: reads exercises from the free-exercise-db clone and outputs
 * seed() lines for any exercises NOT already in our library.
 *
 * Usage:
 *   node scripts/merge-exercises.mjs > scripts/new-exercises.txt
 *
 * Then review new-exercises.txt and paste the lines you want into seed.ts.
 */

import { readFileSync } from 'fs'

const SOURCE = 'C:/Users/Owner/free-exercise-db/dist/exercises.json'

// ── Equipment → our category ──────────────────────────────────────────────────

const EQUIPMENT_MAP = {
  'barbell':   'barbell',
  'dumbbell':  'dumbbell',
  'machine':   'machine',
  'cable':     'cable',
  'body only': 'bodyweight',
  'kettlebells': 'kettlebell',
  'bands':     'band',
}

// ── Primary muscle → our muscleGroup ─────────────────────────────────────────

function mapMuscle(muscle) {
  if (!muscle) return 'Full Body'
  const m = muscle.toLowerCase()
  if (m === 'abdominals' || m === 'obliques') return 'Core'
  if (m === 'lats' || m === 'middle back' || m === 'upper back') return 'Back'
  if (m === 'lower back') return 'Lower Back'
  if (m === 'chest') return 'Chest'
  if (m === 'biceps') return 'Biceps'
  if (m === 'triceps') return 'Triceps'
  if (m.includes('deltoid') || m === 'shoulders') return 'Shoulders'
  if (m === 'hamstrings') return 'Hamstrings'
  if (m === 'quadriceps') return 'Quads'
  if (m === 'glutes' || m === 'abductors') return 'Glutes'
  if (m === 'calves') return 'Calves'
  if (m === 'traps') return 'Traps'
  if (m === 'forearms') return 'Forearms'
  if (m === 'adductors') return 'Inner Thigh'
  if (m === 'neck') return 'Neck'
  return 'Full Body'
}

// ── Normalise a name for de-duplication ───────────────────────────────────────
// Strips punctuation, "barbell"/"dumbbell" prefixes when comparing, etc.

function normalise(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')   // punctuation → space
    .replace(/\b(\w+)s\b/g, '$1')  // strip trailing 's' (simple plural → singular)
    .replace(/\s+/g, ' ')
    .trim()
}

// These token replacements let us fuzzy-match variants like
// "Barbell Bench Press - Medium Grip" against "Bench Press".
function tokens(name) {
  return new Set(
    normalise(name)
      .split(' ')
      .filter(t => t.length > 2 && !STOP_WORDS.has(t))
  )
}

const STOP_WORDS = new Set([
  'the', 'with', 'and', 'from', 'into', 'over', 'under', 'against',
  'barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell',
  'medium', 'grip', 'wide', 'close', 'narrow', 'single', 'double',
  'one', 'two', 'arm', 'leg', 'hand', 'seated', 'standing', 'lying',
  'prone', 'supine', 'bent', 'straight',
])

function jaccard(setA, setB) {
  const intersection = [...setA].filter(t => setB.has(t)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

// ── Our existing seed names ───────────────────────────────────────────────────

const EXISTING = [
  'Back Squat','Front Squat','Box Squat','Zercher Squat','Barbell Lunge',
  'Bench Press','Incline Bench Press','Decline Bench Press','Close-Grip Bench Press',
  'Deadlift','Romanian Deadlift','Sumo Deadlift','Stiff-Leg Deadlift',
  'Overhead Press','Push Press','Barbell Row','Pendlay Row','Barbell Hip Thrust',
  'Good Morning','Barbell Curl','Barbell Skullcrusher','Barbell Shrug','Upright Row',
  'Power Clean','Hang Power Clean','Power Snatch','Safety Bar Squat','Pause Squat',
  'Barbell Step-Up','Barbell Bulgarian Split Squat','Barbell Calf Raise',
  'Landmine Press','Landmine Row','Landmine Squat','JM Press','Spoto Press',
  'Floor Press','Pin Press','Rack Pull','Deficit Deadlift','Barbell Glute Bridge',
  'Barbell Good Morning','Barbell Hack Squat',
  'Dumbbell Bench Press','Incline Dumbbell Press','Dumbbell Fly','Incline Dumbbell Fly',
  'Dumbbell Pullover','Dumbbell Shoulder Press','Arnold Press','Lateral Raise',
  'Front Raise','Bent-Over Lateral Raise','Single-Arm Dumbbell Row','Dumbbell Curl',
  'Hammer Curl','Concentration Curl','Incline Dumbbell Curl','Dumbbell Tricep Extension',
  'Dumbbell Kickback','Dumbbell Romanian Deadlift','Goblet Squat','Dumbbell Lunge',
  'Dumbbell Reverse Lunge','Dumbbell Step-Up','Dumbbell Hip Thrust','Dumbbell Shrug',
  'Dumbbell Calf Raise','Dumbbell Wrist Curl','Dumbbell Bulgarian Split Squat',
  'Dumbbell Sumo Squat','Dumbbell Box Step-Up','Dumbbell Chest-Supported Row',
  'Dumbbell Seal Row','Spider Curl','Prone Incline Curl','Dumbbell Floor Press',
  'Dumbbell Skull Crusher','Dumbbell JM Press','Dumbbell Reverse Curl','Farmers Carry',
  'Dumbbell Romanian Split Squat','Dumbbell Seated Calf Raise',
  'Leg Press','Hack Squat Machine','Leg Extension','Seated Leg Curl','Lying Leg Curl',
  'Seated Calf Raise','Standing Calf Raise','Leg Abductor','Leg Adductor',
  'Chest Press Machine','Pec Dec','Shoulder Press Machine','Lat Pulldown Machine',
  'Seated Row Machine','Chest-Supported Row','Pullover Machine','Back Extension Machine',
  'Ab Crunch Machine','Smith Machine Squat','Assisted Pull-Up','Assisted Dip',
  'Reverse Hyper','GHD Sit-Up','GHD Hip Extension','Leg Press Calf Raise',
  'Preacher Curl Machine','T-Bar Row','Seated Hip Abduction','Seated Hip Adduction',
  'Chest Fly Machine','Pendulum Squat','Belt Squat','Rowing Machine (Ergometer)',
  'Ski Erg','Assault Bike',
  'Cable Row (Seated)','Cable Row (Standing)','Cable Lat Pulldown','Straight-Arm Pulldown',
  'Cable Fly (Low to High)','Cable Fly (High to Low)','Cable Fly (Mid)',
  'Cable Curl (Straight Bar)','Cable Curl (Rope)','Cable Curl (Single Arm)',
  'Cable Tricep Pushdown (Rope)','Cable Tricep Pushdown (Bar)','Cable Overhead Extension',
  'Cable Face Pull','Cable Lateral Raise','Cable Upright Row','Cable Reverse Fly',
  'Cable Kickback','Cable Pull-Through','Cable Hip Abduction','Cable Crunch',
  'Cable Woodchop','Cable Hip Extension','Cable Glute Kickback','Single-Arm Cable Row',
  'Single-Arm Cable Press','Half-Kneeling Cable Chop','Cable Romanian Deadlift',
  'Cable Squat','Cable Shrug','Cable Preacher Curl','Cable Wrist Curl','Low Cable Fly',
  'Cable Crossover','Kneeling Cable Crunch','Cable Drag Curl','Cable Reverse Curl',
  'Cable Hammer Curl (Rope)','Cable Incline Fly','Cable Decline Fly',
  'Half-Kneeling Cable Row','Cable Good Morning','Cable Concentration Curl',
  'Cable Overhead Press','Cable Rear Delt Row','Cable Pallof Press',
  'Cable Wrist Extension','Cable Sumo Deadlift','Cable Close-Grip Row','Cable Wide-Grip Row',
  'Pull-Up','Chin-Up','Neutral-Grip Pull-Up','Inverted Row','Push-Up','Wide Push-Up',
  'Diamond Push-Up','Pike Push-Up','Archer Push-Up','Chest Dip','Tricep Dip',
  'Plank','Side Plank','Hollow Body Hold','Crunch','Sit-Up','Leg Raise',
  'Hanging Leg Raise','Ab Wheel Rollout','Glute Bridge','Single-Leg Glute Bridge',
  'Hip Thrust (Bodyweight)','Bodyweight Squat','Jump Squat','Lunge','Reverse Lunge',
  'Walking Lunge','Step-Up','Nordic Curl','Mountain Climber','Burpee','L-Sit',
  'Pistol Squat','Shrimp Squat','Bulgarian Split Squat','Handstand Push-Up',
  'Wall Handstand Hold','Muscle-Up','Dragon Flag','Hollow Body Rock','Superman Hold',
  'Back Extension','Box Jump','Broad Jump','Depth Jump','Calf Raise (Bodyweight)',
  'Single-Leg Calf Raise','Wall Sit','Nordic Hamstring Curl','Tuck Planche Hold',
  'Front Lever Hold','Ring Dip','Ring Row','Typewriter Pull-Up','Archer Pull-Up',
  'Chest-to-Bar Pull-Up','Kipping Pull-Up','Scapular Pull-Up','Dead Hang','Active Hang',
  'Tuck Jump','Lateral Lunge','Cossack Squat','Skater Squat','Sissy Squat',
  'Jefferson Curl','Single-Leg Romanian Deadlift','Reverse Nordic Curl','Glute-Ham Raise',
  'Copenhagen Plank','Bear Crawl','Inchworm','Hip Airplane','Tuck Planche Push-Up',
  'Ring Muscle-Up','Bar Muscle-Up','V-Up','Windshield Wiper','Toes to Bar',
  'Knees to Chest','Explosive Push-Up',
  'Treadmill Run','Treadmill Walk','Outdoor Run','Stationary Bike','Outdoor Cycling',
  'Rowing Machine','Elliptical','Stair Climber','Jump Rope','Swimming','Battle Ropes',
  'HIIT Cardio','Sled Push','Sled Pull','Yoke Walk','Sandbag Carry','Hiking',
  'Sprint Intervals','Versa Climber','Hand Bike Ergometer','Prowler Push','Farmers Walk',
  'Boxing','Kickboxing','Stadium Stairs','Cycling Sprints','Cross-Country Skiing',
  'Aqua Jogging','Dance Cardio','Treadmill Incline Walk','Treadmill Hill Sprint',
  'Swimming Laps',
  'Overhead Squat','Snatch-Grip Deadlift','Paused Deadlift','Barbell Walking Lunge',
  'Bradford Press','Behind-the-Neck Press','Barbell Preacher Curl','Barbell Drag Curl',
  'Barbell Reverse Curl','Barbell Wrist Curl','Barbell Rollout','Barbell Pullover',
  'Barbell Reverse Lunge','Barbell Front Split Squat','Cambered Bar Squat',
  'Barbell Lateral Lunge','Barbell Good Morning (Seated)','Push Jerk','Clean and Jerk',
  'Snatch','Barbell Z-Press',
  'Dumbbell Preacher Curl','Dumbbell Zottman Curl','Dumbbell Rear Delt Row',
  'Dumbbell Thruster','Dumbbell Snatch','Dumbbell Lateral Lunge','Dumbbell Good Morning',
  'Dumbbell Walking Lunge','Dumbbell Y-Raise','Lying Dumbbell Row','Dumbbell Close-Grip Press',
  'Dumbbell Svend Press','Dumbbell Tate Press','Dumbbell Single-Leg Deadlift',
  'Dumbbell Sumo Squat','Dumbbell Split Squat',
  'Incline Chest Press Machine','Decline Chest Press Machine','Lateral Raise Machine',
  'Rear Delt Machine','Bicep Curl Machine','Tricep Extension Machine','Rotary Torso Machine',
  'Roman Chair Sit-Up','Roman Chair Hyperextension','Incline Leg Press','Glute Drive Machine',
  'Hip Thrust Machine','Low Row Machine','High Row Machine','Shoulder Shrug Machine',
  'Diverging Lat Pulldown','Converging Chest Press',
  'Kettlebell Swing','Kettlebell Single-Arm Swing','Turkish Get-Up','Kettlebell Goblet Squat',
  'Kettlebell Deadlift','Kettlebell Romanian Deadlift','Kettlebell Sumo Deadlift',
  'Kettlebell Clean','Kettlebell Snatch','Kettlebell Overhead Press','Kettlebell Push Press',
  'Kettlebell Jerk','Kettlebell Row','Kettlebell Windmill','Kettlebell Figure-8',
  'Kettlebell Halo','Kettlebell Thruster',"Kettlebell Farmer's Carry",'Kettlebell Lunge',
  'Kettlebell Lateral Lunge','Kettlebell Front Rack Squat','Kettlebell Hip Thrust',
  'Kettlebell Clean and Press','Kettlebell Curl','Kettlebell Skull Crusher',
  'Kettlebell Around the World','Kettlebell Suitcase Deadlift','Kettlebell Step-Up',
  'Kettlebell Box Squat','Double Kettlebell Press',
  'Band Pull-Apart','Band Face Pull','Band Lateral Walk','Band Clamshell','Band Monster Walk',
  'Band Hip Thrust','Band Glute Bridge','Band Kickback','Band Squat','Band Deadlift',
  'Band Romanian Deadlift','Band Good Morning','Band Row','Band Pull-Down','Band Pull-Through',
  'Band Overhead Press','Band Lateral Raise','Band Bicep Curl','Band Hammer Curl',
  'Band Tricep Pushdown','Band Overhead Extension','Band Chest Press','Band Chest Fly',
  'Band External Rotation','Band Internal Rotation','Band Woodchop','Band Pallof Press',
  'Band Crunch','Band Lunge','Band Step-Up',
]

const existingTokenSets = EXISTING.map(tokens)

// Names from the free-db that are clearly duplicates of existing exercises
// (plurals the fuzzy match doesn't catch, renamed cardio machines, etc.)
const EXPLICIT_SKIP = new Set([
  'barbell full squat',           // = Back Squat / Front Squat
  'barbell squat to a bench',     // = Box Squat
  'barbell step ups',             // = Barbell Step-Up
  'zercher squats',               // = Zercher Squat
  'rack pulls',                   // = Rack Pull
  'pin presses',                  // = Pin Press
  'seated good mornings',         // = Barbell Good Morning (Seated)
  'bradford/rocky presses',       // = Bradford Press
  'narrow stance squats',         // = Back Squat variation
  'speed squats',                 // = Back Squat variation
  'olympic squat',                // = Back Squat variation
  'standing military press',      // = Overhead Press
  'seated barbell military press',// = Overhead Press
  'hanging bar good morning',     // = Good Morning
  'wrist rotations with straight bar', // too niche
  'concentration curls',          // = Concentration Curl
  'hammer curls',                 // = Hammer Curl
  'dumbbell flyes',               // = Dumbbell Fly
  'incline dumbbell flyes',       // = Incline Dumbbell Fly
  'decline dumbbell flyes',       // = Dumbbell Fly (decline)
  'dumbbell lunges',              // = Dumbbell Lunge
  'dumbbell step ups',            // = Dumbbell Step-Up
  'dumbbell rear lunge',          // = Dumbbell Reverse Lunge
  'bicycling, stationary',        // = Stationary Bike
  'elliptical trainer',           // = Elliptical
  'jogging, treadmill',           // = Treadmill Run
  'running, treadmill',           // = Treadmill Run
  'walking, treadmill',           // = Treadmill Walk
  'rowing, stationary',           // = Rowing Machine
  'stairmaster',                  // = Stair Climber
  'leg extensions',               // = Leg Extension
  'lying leg curls',              // = Lying Leg Curl
  'standing calf raises',         // = Standing Calf Raise
  'cable shrugs',                 // = Cable Shrug
  'seated cable rows',            // = Cable Row (Seated)
  'triceps pushdown',             // = Cable Tricep Pushdown (Bar)
  'triceps pushdown - rope attachment', // = Cable Tricep Pushdown (Rope)
  'triceps pushdown - v-bar attachment',// = Cable Tricep Pushdown (Bar)
  'pullups',                      // = Pull-Up
  'pushups',                      // = Push-Up
  'pushups (close and wide hand positions)', // = Push-Up variants
  'v-bar pullup',                 // = Neutral-Grip Pull-Up
  'lunge sprint',                 // = Lunge
  'step mill',                    // = Stair Climber
  'chair squat',                  // = Bodyweight Squat / Box Squat
])

function isAlreadyCovered(newName) {
  if (EXPLICIT_SKIP.has(normalise(newName))) return true
  const newTok = tokens(newName)
  if (newTok.size === 0) return true
  for (const existing of existingTokenSets) {
    if (jaccard(newTok, existing) >= 0.6) return true
  }
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(SOURCE, 'utf8'))

// Group new exercises by category
const buckets = {
  barbell: [], dumbbell: [], machine: [], cable: [],
  bodyweight: [], kettlebell: [], band: [],
}

const CATEGORY_ORDER = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band']

let totalNew = 0

for (const ex of raw) {
  const cat = EQUIPMENT_MAP[ex.equipment]
  if (!cat) continue                          // skip foam roll, medicine ball, etc.
  if (ex.category === 'stretching') continue  // skip stretching
  if (isAlreadyCovered(ex.name)) continue     // already in our seed

  const muscle = mapMuscle(ex.primaryMuscles?.[0])
  buckets[cat].push({ name: ex.name, cat, muscle })
  totalNew++
}

// ── Output ────────────────────────────────────────────────────────────────────

console.log(`// ── New exercises from free-exercise-db (${totalNew} total) ─────────────────\n`)

for (const cat of CATEGORY_ORDER) {
  const list = buckets[cat]
  if (list.length === 0) continue
  const label = cat.charAt(0).toUpperCase() + cat.slice(1)
  console.log(`  // ── New ${label} ─────────────────────────────────────────────────────`)
  for (const { name, cat: c, muscle } of list) {
    const escaped = name.replace(/'/g, "\\'")
    console.log(`  seed('${escaped}', '${c}', '${muscle}'),`)
  }
  console.log()
}

console.log(`// Total new: ${totalNew}`)
