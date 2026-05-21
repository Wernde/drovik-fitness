/**
 * seed.ts — the pre-loaded exercise library.
 *
 * These exercises are inserted into IndexedDB the first time the app runs on
 * a device. IDs are stable slugs (not random UUIDs) so that if we ever need
 * to migrate seed data we can reference them reliably.
 *
 * isCustom: false means the app seeded it. The user can still edit or delete
 * any exercise — this is a single-user app and you should have full control.
 */

import type { Exercise } from './db'

const SEED_DATE = '2025-01-01T00:00:00.000Z'

function seed(
  name: string,
  category: Exercise['category'],
  muscleGroup: string,
): Exercise {
  return {
    id: 'seed-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
    name,
    category,
    muscleGroup,
    isCustom: false,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    syncedAt: null,
    deleted: false,
  }
}

export const seedExercises: Exercise[] = [

  // ── Barbell ────────────────────────────────────────────────────────────────

  seed('Back Squat',             'barbell', 'Quads'),
  seed('Front Squat',            'barbell', 'Quads'),
  seed('Box Squat',              'barbell', 'Quads'),
  seed('Zercher Squat',          'barbell', 'Quads'),
  seed('Barbell Lunge',          'barbell', 'Quads'),
  seed('Bench Press',            'barbell', 'Chest'),
  seed('Incline Bench Press',    'barbell', 'Chest'),
  seed('Decline Bench Press',    'barbell', 'Chest'),
  seed('Close-Grip Bench Press', 'barbell', 'Triceps'),
  seed('Deadlift',               'barbell', 'Back'),
  seed('Romanian Deadlift',      'barbell', 'Hamstrings'),
  seed('Sumo Deadlift',          'barbell', 'Quads'),
  seed('Stiff-Leg Deadlift',     'barbell', 'Hamstrings'),
  seed('Overhead Press',         'barbell', 'Shoulders'),
  seed('Push Press',             'barbell', 'Shoulders'),
  seed('Barbell Row',            'barbell', 'Back'),
  seed('Pendlay Row',            'barbell', 'Back'),
  seed('Barbell Hip Thrust',     'barbell', 'Glutes'),
  seed('Good Morning',           'barbell', 'Hamstrings'),
  seed('Barbell Curl',           'barbell', 'Biceps'),
  seed('Barbell Skullcrusher',   'barbell', 'Triceps'),
  seed('Barbell Shrug',          'barbell', 'Traps'),
  seed('Upright Row',            'barbell', 'Shoulders'),
  seed('Power Clean',            'barbell', 'Full Body'),

  // ── Dumbbell ───────────────────────────────────────────────────────────────

  seed('Dumbbell Bench Press',         'dumbbell', 'Chest'),
  seed('Incline Dumbbell Press',       'dumbbell', 'Chest'),
  seed('Dumbbell Fly',                 'dumbbell', 'Chest'),
  seed('Incline Dumbbell Fly',         'dumbbell', 'Chest'),
  seed('Dumbbell Pullover',            'dumbbell', 'Back'),
  seed('Dumbbell Shoulder Press',      'dumbbell', 'Shoulders'),
  seed('Arnold Press',                 'dumbbell', 'Shoulders'),
  seed('Lateral Raise',                'dumbbell', 'Shoulders'),
  seed('Front Raise',                  'dumbbell', 'Shoulders'),
  seed('Bent-Over Lateral Raise',      'dumbbell', 'Shoulders'),
  seed('Single-Arm Dumbbell Row',      'dumbbell', 'Back'),
  seed('Dumbbell Curl',                'dumbbell', 'Biceps'),
  seed('Hammer Curl',                  'dumbbell', 'Biceps'),
  seed('Concentration Curl',           'dumbbell', 'Biceps'),
  seed('Incline Dumbbell Curl',        'dumbbell', 'Biceps'),
  seed('Dumbbell Tricep Extension',    'dumbbell', 'Triceps'),
  seed('Dumbbell Kickback',            'dumbbell', 'Triceps'),
  seed('Dumbbell Romanian Deadlift',   'dumbbell', 'Hamstrings'),
  seed('Goblet Squat',                 'dumbbell', 'Quads'),
  seed('Dumbbell Lunge',               'dumbbell', 'Quads'),
  seed('Dumbbell Reverse Lunge',       'dumbbell', 'Quads'),
  seed('Dumbbell Step-Up',             'dumbbell', 'Quads'),
  seed('Dumbbell Hip Thrust',          'dumbbell', 'Glutes'),
  seed('Dumbbell Shrug',               'dumbbell', 'Traps'),
  seed('Dumbbell Calf Raise',          'dumbbell', 'Calves'),
  seed('Dumbbell Wrist Curl',          'dumbbell', 'Forearms'),

  // ── Machine ────────────────────────────────────────────────────────────────

  seed('Leg Press',              'machine', 'Quads'),
  seed('Hack Squat Machine',     'machine', 'Quads'),
  seed('Leg Extension',          'machine', 'Quads'),
  seed('Seated Leg Curl',        'machine', 'Hamstrings'),
  seed('Lying Leg Curl',         'machine', 'Hamstrings'),
  seed('Seated Calf Raise',      'machine', 'Calves'),
  seed('Standing Calf Raise',    'machine', 'Calves'),
  seed('Leg Abductor',           'machine', 'Glutes'),
  seed('Leg Adductor',           'machine', 'Inner Thigh'),
  seed('Chest Press Machine',    'machine', 'Chest'),
  seed('Pec Dec',                'machine', 'Chest'),
  seed('Shoulder Press Machine', 'machine', 'Shoulders'),
  seed('Lat Pulldown Machine',   'machine', 'Back'),
  seed('Seated Row Machine',     'machine', 'Back'),
  seed('Chest-Supported Row',    'machine', 'Back'),
  seed('Pullover Machine',       'machine', 'Back'),
  seed('Back Extension Machine', 'machine', 'Lower Back'),
  seed('Ab Crunch Machine',      'machine', 'Core'),
  seed('Smith Machine Squat',    'machine', 'Quads'),
  seed('Assisted Pull-Up',       'machine', 'Back'),
  seed('Assisted Dip',           'machine', 'Chest'),

  // ── Cable ──────────────────────────────────────────────────────────────────

  seed('Cable Row (Seated)',           'cable', 'Back'),
  seed('Cable Row (Standing)',         'cable', 'Back'),
  seed('Cable Lat Pulldown',          'cable', 'Back'),
  seed('Straight-Arm Pulldown',       'cable', 'Back'),
  seed('Cable Fly (Low to High)',     'cable', 'Chest'),
  seed('Cable Fly (High to Low)',     'cable', 'Chest'),
  seed('Cable Fly (Mid)',             'cable', 'Chest'),
  seed('Cable Curl (Straight Bar)',   'cable', 'Biceps'),
  seed('Cable Curl (Rope)',           'cable', 'Biceps'),
  seed('Cable Curl (Single Arm)',     'cable', 'Biceps'),
  seed('Cable Tricep Pushdown (Rope)','cable', 'Triceps'),
  seed('Cable Tricep Pushdown (Bar)', 'cable', 'Triceps'),
  seed('Cable Overhead Extension',    'cable', 'Triceps'),
  seed('Cable Face Pull',             'cable', 'Shoulders'),
  seed('Cable Lateral Raise',         'cable', 'Shoulders'),
  seed('Cable Upright Row',           'cable', 'Shoulders'),
  seed('Cable Reverse Fly',           'cable', 'Shoulders'),
  seed('Cable Kickback',              'cable', 'Triceps'),
  seed('Cable Pull-Through',          'cable', 'Glutes'),
  seed('Cable Hip Abduction',         'cable', 'Glutes'),
  seed('Cable Crunch',                'cable', 'Core'),
  seed('Cable Woodchop',              'cable', 'Core'),

  // ── Bodyweight ─────────────────────────────────────────────────────────────

  seed('Pull-Up',             'bodyweight', 'Back'),
  seed('Chin-Up',             'bodyweight', 'Back'),
  seed('Neutral-Grip Pull-Up','bodyweight', 'Back'),
  seed('Inverted Row',        'bodyweight', 'Back'),
  seed('Push-Up',             'bodyweight', 'Chest'),
  seed('Wide Push-Up',        'bodyweight', 'Chest'),
  seed('Diamond Push-Up',     'bodyweight', 'Triceps'),
  seed('Pike Push-Up',        'bodyweight', 'Shoulders'),
  seed('Archer Push-Up',      'bodyweight', 'Chest'),
  seed('Chest Dip',           'bodyweight', 'Chest'),
  seed('Tricep Dip',          'bodyweight', 'Triceps'),
  seed('Plank',               'bodyweight', 'Core'),
  seed('Side Plank',          'bodyweight', 'Core'),
  seed('Hollow Body Hold',    'bodyweight', 'Core'),
  seed('Crunch',              'bodyweight', 'Core'),
  seed('Sit-Up',              'bodyweight', 'Core'),
  seed('Leg Raise',           'bodyweight', 'Core'),
  seed('Hanging Leg Raise',   'bodyweight', 'Core'),
  seed('Ab Wheel Rollout',    'bodyweight', 'Core'),
  seed('Glute Bridge',        'bodyweight', 'Glutes'),
  seed('Single-Leg Glute Bridge', 'bodyweight', 'Glutes'),
  seed('Hip Thrust (Bodyweight)', 'bodyweight', 'Glutes'),
  seed('Bodyweight Squat',    'bodyweight', 'Quads'),
  seed('Jump Squat',          'bodyweight', 'Quads'),
  seed('Lunge',               'bodyweight', 'Quads'),
  seed('Reverse Lunge',       'bodyweight', 'Quads'),
  seed('Walking Lunge',       'bodyweight', 'Quads'),
  seed('Step-Up',             'bodyweight', 'Quads'),
  seed('Nordic Curl',         'bodyweight', 'Hamstrings'),
  seed('Mountain Climber',    'bodyweight', 'Core'),
  seed('Burpee',              'bodyweight', 'Full Body'),
  seed('L-Sit',               'bodyweight', 'Core'),

  // ── Cardio ─────────────────────────────────────────────────────────────────

  seed('Treadmill Run',       'cardio', 'Cardio'),
  seed('Treadmill Walk',      'cardio', 'Cardio'),
  seed('Outdoor Run',         'cardio', 'Cardio'),
  seed('Stationary Bike',     'cardio', 'Cardio'),
  seed('Outdoor Cycling',     'cardio', 'Cardio'),
  seed('Rowing Machine',      'cardio', 'Full Body'),
  seed('Elliptical',          'cardio', 'Cardio'),
  seed('Stair Climber',       'cardio', 'Cardio'),
  seed('Jump Rope',           'cardio', 'Cardio'),
  seed('Swimming',            'cardio', 'Full Body'),
  seed('Battle Ropes',        'cardio', 'Full Body'),
  seed('HIIT Cardio',         'cardio', 'Full Body'),
]
