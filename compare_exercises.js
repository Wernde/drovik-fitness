const fs = require('fs');
const exercises = JSON.parse(fs.readFileSync('C:/Users/Owner/Documents/Projects/drovik-fitness/exercises_filtered.json', 'utf8'));

const existing = [
  'Back Squat', 'Front Squat', 'Box Squat', 'Zercher Squat', 'Barbell Lunge', 'Bench Press',
  'Incline Bench Press', 'Decline Bench Press', 'Close-Grip Bench Press', 'Deadlift',
  'Romanian Deadlift', 'Sumo Deadlift', 'Stiff-Leg Deadlift', 'Overhead Press', 'Push Press',
  'Barbell Row', 'Pendlay Row', 'Barbell Hip Thrust', 'Good Morning', 'Barbell Curl',
  'Barbell Skullcrusher', 'Barbell Shrug', 'Upright Row', 'Power Clean', 'Hang Power Clean',
  'Power Snatch', 'Safety Bar Squat', 'Pause Squat', 'Barbell Step-Up', 'Barbell Bulgarian Split Squat',
  'Barbell Calf Raise', 'Landmine Press', 'Landmine Row', 'Landmine Squat', 'JM Press',
  'Spoto Press', 'Floor Press', 'Pin Press', 'Rack Pull', 'Deficit Deadlift',
  'Barbell Glute Bridge', 'Barbell Good Morning', 'Barbell Hack Squat', 'Dumbbell Bench Press',
  'Incline Dumbbell Press', 'Dumbbell Fly', 'Incline Dumbbell Fly', 'Dumbbell Pullover',
  'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Front Raise',
  'Bent-Over Lateral Raise', 'Single-Arm Dumbbell Row', 'Dumbbell Curl', 'Hammer Curl',
  'Concentration Curl', 'Incline Dumbbell Curl', 'Dumbbell Tricep Extension', 'Dumbbell Kickback',
  'Dumbbell Romanian Deadlift', 'Goblet Squat', 'Dumbbell Lunge', 'Dumbbell Reverse Lunge',
  'Dumbbell Step-Up', 'Dumbbell Hip Thrust', 'Dumbbell Shrug', 'Dumbbell Calf Raise',
  'Dumbbell Wrist Curl', 'Dumbbell Bulgarian Split Squat', 'Dumbbell Sumo Squat',
  'Dumbbell Box Step-Up', 'Dumbbell Chest-Supported Row', 'Dumbbell Seal Row', 'Spider Curl',
  'Prone Incline Curl', 'Dumbbell Floor Press', 'Dumbbell Skull Crusher', 'Dumbbell JM Press',
  'Dumbbell Reverse Curl', 'Farmers Carry', 'Dumbbell Romanian Split Squat',
  'Dumbbell Seated Calf Raise', 'Leg Press', 'Hack Squat Machine', 'Leg Extension',
  'Seated Leg Curl', 'Lying Leg Curl', 'Seated Calf Raise', 'Standing Calf Raise',
  'Leg Abductor', 'Leg Adductor', 'Chest Press Machine', 'Pec Dec', 'Shoulder Press Machine',
  'Lat Pulldown Machine', 'Seated Row Machine', 'Chest-Supported Row', 'Pullover Machine',
  'Back Extension Machine', 'Ab Crunch Machine', 'Smith Machine Squat', 'Assisted Pull-Up',
  'Assisted Dip', 'Reverse Hyper', 'GHD Sit-Up', 'GHD Hip Extension', 'Leg Press Calf Raise',
  'Preacher Curl Machine', 'T-Bar Row', 'Seated Hip Abduction', 'Seated Hip Adduction',
  'Chest Fly Machine', 'Pendulum Squat', 'Belt Squat', 'Rowing Machine (Ergometer)', 'Ski Erg',
  'Assault Bike', 'Cable Row (Seated)', 'Cable Row (Standing)', 'Cable Lat Pulldown',
  'Straight-Arm Pulldown', 'Cable Fly (Low to High)', 'Cable Fly (High to Low)', 'Cable Fly (Mid)',
  'Cable Curl (Straight Bar)', 'Cable Curl (Rope)', 'Cable Curl (Single Arm)',
  'Cable Tricep Pushdown (Rope)', 'Cable Tricep Pushdown (Bar)', 'Cable Overhead Extension',
  'Cable Face Pull', 'Cable Lateral Raise', 'Cable Upright Row', 'Cable Reverse Fly',
  'Cable Kickback', 'Cable Pull-Through', 'Cable Hip Abduction', 'Cable Crunch',
  'Cable Woodchop', 'Cable Hip Extension', 'Cable Glute Kickback', 'Single-Arm Cable Row',
  'Single-Arm Cable Press', 'Half-Kneeling Cable Chop', 'Cable Romanian Deadlift', 'Cable Squat',
  'Cable Shrug', 'Cable Preacher Curl', 'Cable Wrist Curl', 'Low Cable Fly', 'Cable Crossover',
  'Kneeling Cable Crunch', 'Cable Drag Curl', 'Cable Reverse Curl', 'Cable Hammer Curl (Rope)',
  'Cable Incline Fly', 'Cable Decline Fly', 'Half-Kneeling Cable Row', 'Cable Good Morning',
  'Cable Concentration Curl', 'Cable Overhead Press', 'Cable Rear Delt Row', 'Cable Pallof Press',
  'Cable Wrist Extension', 'Cable Sumo Deadlift', 'Cable Close-Grip Row', 'Cable Wide-Grip Row',
  'Pull-Up', 'Chin-Up', 'Neutral-Grip Pull-Up', 'Inverted Row', 'Push-Up', 'Wide Push-Up',
  'Diamond Push-Up', 'Pike Push-Up', 'Archer Push-Up', 'Chest Dip', 'Tricep Dip', 'Plank',
  'Side Plank', 'Hollow Body Hold', 'Crunch', 'Sit-Up', 'Leg Raise', 'Hanging Leg Raise',
  'Ab Wheel Rollout', 'Glute Bridge', 'Single-Leg Glute Bridge', 'Hip Thrust (Bodyweight)',
  'Bodyweight Squat', 'Jump Squat', 'Lunge', 'Reverse Lunge', 'Walking Lunge', 'Step-Up',
  'Nordic Curl', 'Mountain Climber', 'Burpee', 'L-Sit', 'Pistol Squat', 'Shrimp Squat',
  'Bulgarian Split Squat', 'Handstand Push-Up', 'Wall Handstand Hold', 'Muscle-Up',
  'Dragon Flag', 'Hollow Body Rock', 'Superman Hold', 'Back Extension', 'Box Jump',
  'Broad Jump', 'Depth Jump', 'Calf Raise (Bodyweight)', 'Single-Leg Calf Raise', 'Wall Sit',
  'Nordic Hamstring Curl', 'Tuck Planche Hold', 'Front Lever Hold', 'Ring Dip', 'Ring Row',
  'Typewriter Pull-Up', 'Archer Pull-Up', 'Chest-to-Bar Pull-Up', 'Kipping Pull-Up',
  'Scapular Pull-Up', 'Dead Hang', 'Active Hang', 'Tuck Jump', 'Lateral Lunge', 'Cossack Squat',
  'Skater Squat', 'Sissy Squat', 'Jefferson Curl', 'Single-Leg Romanian Deadlift',
  'Reverse Nordic Curl', 'Glute-Ham Raise', 'Copenhagen Plank', 'Bear Crawl', 'Inchworm',
  'Hip Airplane', 'Tuck Planche Push-Up', 'Ring Muscle-Up', 'Bar Muscle-Up', 'V-Up',
  'Windshield Wiper', 'Toes to Bar', 'Knees to Chest', 'Explosive Push-Up', 'Treadmill Run',
  'Treadmill Walk', 'Outdoor Run', 'Stationary Bike', 'Outdoor Cycling', 'Rowing Machine',
  'Elliptical', 'Stair Climber', 'Jump Rope', 'Swimming', 'Battle Ropes', 'HIIT Cardio',
  'Sled Push', 'Sled Pull', 'Yoke Walk', 'Sandbag Carry', 'Hiking', 'Sprint Intervals',
  'Versa Climber', 'Hand Bike Ergometer', 'Prowler Push', 'Farmers Walk', 'Boxing',
  'Kickboxing', 'Stadium Stairs', 'Cycling Sprints', 'Cross-Country Skiing', 'Aqua Jogging',
  'Dance Cardio', 'Treadmill Incline Walk', 'Treadmill Hill Sprint', 'Swimming Laps',
  'Overhead Squat', 'Snatch-Grip Deadlift', 'Paused Deadlift', 'Barbell Walking Lunge',
  'Bradford Press', 'Behind-the-Neck Press', 'Barbell Preacher Curl', 'Barbell Drag Curl',
  'Barbell Reverse Curl', 'Barbell Wrist Curl', 'Barbell Rollout', 'Barbell Pullover',
  'Barbell Reverse Lunge', 'Barbell Front Split Squat', 'Cambered Bar Squat',
  'Barbell Lateral Lunge', 'Barbell Good Morning (Seated)', 'Push Jerk', 'Clean and Jerk',
  'Snatch', 'Barbell Z-Press', 'Dumbbell Preacher Curl', 'Dumbbell Zottman Curl',
  'Dumbbell Rear Delt Row', 'Dumbbell Thruster', 'Dumbbell Snatch', 'Dumbbell Lateral Lunge',
  'Dumbbell Good Morning', 'Dumbbell Walking Lunge', 'Dumbbell Y-Raise', 'Lying Dumbbell Row',
  'Dumbbell Close-Grip Press', 'Dumbbell Svend Press', 'Dumbbell Tate Press',
  'Dumbbell Single-Leg Deadlift', 'Dumbbell Sumo Squat', 'Dumbbell Split Squat',
  'Incline Chest Press Machine', 'Decline Chest Press Machine', 'Lateral Raise Machine',
  'Rear Delt Machine', 'Bicep Curl Machine', 'Tricep Extension Machine', 'Rotary Torso Machine',
  'Roman Chair Sit-Up', 'Roman Chair Hyperextension', 'Incline Leg Press', 'Glute Drive Machine',
  'Hip Thrust Machine', 'Low Row Machine', 'High Row Machine', 'Shoulder Shrug Machine',
  'Diverging Lat Pulldown', 'Converging Chest Press', 'Kettlebell Swing',
  'Kettlebell Single-Arm Swing', 'Turkish Get-Up', 'Kettlebell Goblet Squat',
  'Kettlebell Deadlift', 'Kettlebell Romanian Deadlift', 'Kettlebell Sumo Deadlift',
  'Kettlebell Clean', 'Kettlebell Snatch', 'Kettlebell Overhead Press', 'Kettlebell Push Press',
  'Kettlebell Jerk', 'Kettlebell Row', 'Kettlebell Windmill', 'Kettlebell Figure-8',
  'Kettlebell Halo', 'Kettlebell Thruster', 'Kettlebell Farmer\'s Carry', 'Kettlebell Lunge',
  'Kettlebell Lateral Lunge', 'Kettlebell Front Rack Squat', 'Kettlebell Hip Thrust',
  'Kettlebell Clean and Press', 'Kettlebell Curl', 'Kettlebell Skull Crusher',
  'Kettlebell Around the World', 'Kettlebell Suitcase Deadlift', 'Kettlebell Step-Up',
  'Kettlebell Box Squat', 'Double Kettlebell Press', 'Band Pull-Apart', 'Band Face Pull',
  'Band Lateral Walk', 'Band Clamshell', 'Band Monster Walk', 'Band Hip Thrust',
  'Band Glute Bridge', 'Band Kickback', 'Band Squat', 'Band Deadlift', 'Band Romanian Deadlift',
  'Band Good Morning', 'Band Row', 'Band Pull-Down', 'Band Pull-Through', 'Band Overhead Press',
  'Band Lateral Raise', 'Band Bicep Curl', 'Band Hammer Curl', 'Band Tricep Pushdown',
  'Band Overhead Extension', 'Band Chest Press', 'Band Chest Fly', 'Band External Rotation',
  'Band Internal Rotation', 'Band Woodchop', 'Band Pallof Press', 'Band Crunch', 'Band Lunge',
  'Band Step-Up'
];

function normalise(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(barbell|dumbbell|kettlebell|with|the|a|an|on|to|from|for|in|at|of|and|or|machine|cable|band|single|arm|two|double)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const existingNorm = new Set(existing.map(normalise));
const existingKeywords = existing.map(e => normalise(e));

function isTooSimilar(candidate) {
  const cn = normalise(candidate);
  if (existingNorm.has(cn)) return true;
  for (const en of existingKeywords) {
    if (cn === en) return true;
    const cnWords = cn.split(' ').filter(Boolean);
    const enWords = en.split(' ').filter(Boolean);
    if (cnWords.length === 0 || enWords.length === 0) continue;
    const shared = cnWords.filter(w => enWords.includes(w));
    const shorter = Math.min(cnWords.length, enWords.length);
    if (shorter > 0 && shared.length / shorter >= 0.85) return true;
  }
  return false;
}

const skipKeywords = [
  'stretch', 'flexibility', 'mobility', 'yoga', 'foam', 'massage', 'smr',
  'jogging', 'running', 'cycling', 'swimming', 'cardio', 'hiit', 'aerobic',
  'warmup', 'warm up', 'cool down', 'cooldown', 'breathing',
  'treadmill', 'elliptical', 'stationary bike', 'rower', 'ski erg',
  'jump rope', 'sled', 'prowler', 'battle rope', 'agility', 'bounce',
  'diagonal', 'bound', 'triceps warmup', 'chest stretch', 'standing long',
  'back flyes', 'cat stretch', 'groin', 'quad stretch', 'hip flexor',
  'pigeon', 'calf stretch', 'hamstring stretch', 'it band', 'doorway'
];

function isStretchOrCardio(name) {
  const lower = name.toLowerCase();
  return skipKeywords.some(kw => lower.includes(kw));
}

const newExercises = exercises.filter(e => {
  if (isStretchOrCardio(e.name)) return false;
  if (!isTooSimilar(e.name)) return true;
  return false;
});

console.log('New exercises found:', newExercises.length);
newExercises.forEach(e => console.log(JSON.stringify({ name: e.name, equipment: e.equipment, primaryMuscles: e.primaryMuscles })));
