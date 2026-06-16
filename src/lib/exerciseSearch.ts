/**
 * exerciseSearch.ts — comprehensive exercise search with aliases, synonyms,
 * abbreviations, movement patterns, equipment terms, and muscle-group keywords.
 *
 * Sources: gym community terminology, Wikipedia exercise articles, StrengthLog,
 * ExRx.net naming conventions, powerlifting/bodybuilding/CrossFit vocabulary.
 */

import type { Exercise } from '../db/db'

// ── Synonym / alias expansion ─────────────────────────────────────────────────
// Key  = what the user might type
// Value = words injected into the searchable text to match exercises

const SYNONYMS: Record<string, string[]> = {

  // ══════════════════════════════════════════════════════════════════════════════
  // ABBREVIATIONS & ACRONYMS
  // ══════════════════════════════════════════════════════════════════════════════
  'rdl':    ['romanian', 'deadlift'],
  'sldl':   ['stiff', 'leg', 'deadlift'],
  'ohp':    ['overhead', 'press', 'shoulder'],
  'sbp':    ['shoulder', 'barbell', 'press'],
  'bp':     ['bench', 'press', 'chest'],
  'cgbp':   ['close', 'grip', 'bench', 'press'],
  'wgbp':   ['wide', 'grip', 'bench', 'press'],
  'ibp':    ['incline', 'bench', 'press'],
  'dbp':    ['decline', 'bench', 'press'],
  'db':     ['dumbbell'],
  'bb':     ['barbell'],
  'kb':     ['kettlebell'],
  'bw':     ['bodyweight'],
  'dl':     ['deadlift'],
  'sdl':    ['sumo', 'deadlift'],
  'sq':     ['squat'],
  'bs':     ['back', 'squat'],
  'fs':     ['front', 'squat'],
  'os':     ['overhead', 'squat'],
  'gss':    ['goblet', 'squat', 'split'],
  'bss':    ['bulgarian', 'split', 'squat'],
  'sbs':    ['safety', 'bar', 'squat'],
  'zs':     ['zercher', 'squat'],
  'pu':     ['pull-up', 'pullup'],
  'cu':     ['chin-up', 'chinup'],
  'rpe':    ['rating', 'perceived', 'exertion'],
  'rir':    ['reps', 'reserve'],
  '1rm':    ['one', 'rep', 'max', 'maximum'],
  'pr':     ['personal', 'record'],
  'pb':     ['personal', 'best'],
  'amrap':  ['as', 'many', 'reps'],
  'emom':   ['every', 'minute'],
  'hiit':   ['high', 'intensity', 'interval'],
  'ghr':    ['glute', 'ham', 'raise'],
  'ghd':    ['glute', 'ham', 'developer'],
  'sbd':    ['squat', 'bench', 'deadlift'],
  'ppl':    ['push', 'pull', 'legs'],
  'cj':     ['clean', 'jerk'],
  'ps':     ['power', 'snatch'],
  'pc':     ['power', 'clean'],
  'tgu':    ['turkish', 'get', 'up'],
  'ez':     ['ez-bar', 'barbell', 'curl', 'skullcrusher'],
  'tb':     ['t-bar', 'row'],
  'rp':     ['rack', 'pull'],
  'zp':     ['z', 'press', 'seated', 'overhead'],
  'fc':     ['farmers', 'carry', 'walk'],

  // ══════════════════════════════════════════════════════════════════════════════
  // MUSCLE GROUP SYNONYMS
  // ══════════════════════════════════════════════════════════════════════════════
  'pec':            ['chest'],
  'pecs':           ['chest'],
  'pectoral':       ['chest'],
  'pectorals':      ['chest'],
  'chest day':      ['bench', 'fly', 'chest', 'press', 'dip'],
  'lat':            ['back', 'latissimus', 'pulldown', 'pullup'],
  'lats':           ['back', 'latissimus', 'pulldown', 'pullup'],
  'latissimus':     ['back', 'lat', 'pulldown'],
  'dorsi':          ['back', 'latissimus'],
  'trap':           ['traps', 'upper back', 'shrug'],
  'traps':          ['traps', 'shrug', 'upper back'],
  'trapezius':      ['traps', 'shrug'],
  'rhomboid':       ['back', 'row', 'rear'],
  'rhomboids':      ['back', 'row', 'rear'],
  'delt':           ['shoulders', 'deltoid'],
  'delts':          ['shoulders', 'deltoid'],
  'deltoid':        ['shoulders', 'lateral', 'front', 'rear'],
  'front delt':     ['front raise', 'overhead press', 'shoulders'],
  'side delt':      ['lateral raise', 'upright row', 'shoulders'],
  'rear delt':      ['reverse fly', 'face pull', 'bent over', 'shoulders'],
  'posterior delt': ['reverse fly', 'face pull', 'rear delt'],
  'bi':             ['biceps', 'curl'],
  'bis':            ['biceps', 'curl'],
  'bicep':          ['biceps', 'curl'],
  'bicepss':        ['biceps'],
  'brachialis':     ['biceps', 'hammer curl', 'forearm'],
  'brachioradialis':['forearms', 'hammer curl', 'reverse curl'],
  'tri':            ['triceps', 'extension', 'pushdown'],
  'tris':           ['triceps', 'extension', 'pushdown'],
  'tricep':         ['triceps', 'extension', 'pushdown'],
  'long head':      ['triceps', 'overhead extension', 'skull'],
  'lateral head':   ['triceps', 'pushdown', 'dip'],
  'medial head':    ['triceps', 'pushdown'],
  'quad':           ['quads', 'leg extension', 'squat', 'press'],
  'quads':          ['quads', 'squat', 'leg press', 'lunge'],
  'quadricep':      ['quads'],
  'quadriceps':     ['quads'],
  'vastus':         ['quads', 'leg extension'],
  'rectus femoris': ['quads', 'leg extension'],
  'ham':            ['hamstrings', 'leg curl', 'deadlift', 'nordic'],
  'hams':           ['hamstrings', 'leg curl', 'rdl'],
  'hamstring':      ['hamstrings', 'leg curl', 'romanian'],
  'biceps femoris': ['hamstrings', 'leg curl'],
  'glute':          ['glutes', 'hip thrust', 'bridge', 'deadlift'],
  'glutes':         ['glutes', 'hip thrust', 'bridge', 'glute'],
  'gluteus':        ['glutes', 'hip thrust'],
  'gluteus maximus':['glutes', 'hip thrust', 'squat'],
  'gluteus medius': ['glutes', 'abductor', 'lateral'],
  'butt':           ['glutes', 'hip thrust', 'squat'],
  'booty':          ['glutes', 'hip thrust', 'bridge'],
  'posterior chain':['deadlift', 'rdl', 'hip thrust', 'glutes', 'hamstrings'],
  'calf':           ['calves', 'calf raise'],
  'calves':         ['calves', 'calf raise'],
  'gastrocnemius':  ['calves', 'calf raise'],
  'soleus':         ['calves', 'seated calf raise'],
  'forearm':        ['forearms', 'wrist curl', 'hammer'],
  'forearms':       ['forearms', 'wrist curl', 'grip', 'farmers'],
  'grip':           ['forearms', 'farmers carry', 'hang', 'deadlift'],
  'ab':             ['core', 'crunch', 'plank', 'leg raise'],
  'abs':            ['core', 'crunch', 'sit-up', 'plank'],
  'abdominal':      ['core', 'crunch', 'plank'],
  'abdominals':     ['core'],
  'oblique':        ['core', 'woodchop', 'side', 'russian twist'],
  'obliques':       ['core', 'woodchop', 'side plank'],
  'transverse':     ['core', 'plank', 'dead bug'],
  'tvA':            ['core', 'plank', 'hollow'],
  'serratus':       ['chest', 'push-up', 'pullover'],
  'lower back':     ['lower back', 'erector', 'deadlift', 'good morning'],
  'lumbar':         ['lower back', 'erector', 'deadlift'],
  'erector':        ['lower back', 'spinae', 'deadlift', 'good morning'],
  'spinae':         ['lower back', 'erector', 'back extension'],
  'erectors':       ['lower back', 'back extension', 'deadlift'],
  'neck':           ['neck', 'trap', 'shrug'],
  'adductor':       ['inner thigh', 'adduction', 'sumo'],
  'adductors':      ['inner thigh', 'adduction', 'sumo'],
  'inner thigh':    ['adductor', 'adduction', 'sumo', 'copenhagen'],
  'groin':          ['inner thigh', 'adductor', 'sumo'],
  'hip flexor':     ['lunge', 'squat', 'leg raise', 'mountain climber'],
  'hip flexors':    ['lunge', 'squat', 'hip', 'flexion'],
  'it band':        ['abductor', 'lateral', 'hip'],
  'rotator cuff':   ['external rotation', 'internal rotation', 'band', 'cable'],
  'external rotation': ['rotator', 'cuff', 'band', 'cable'],
  'internal rotation': ['rotator', 'cuff', 'band', 'cable'],
  'infraspinatus':  ['rear delt', 'external rotation', 'rotator'],
  'supraspinatus':  ['shoulder', 'rotator', 'lateral'],
  'subscapularis':  ['internal rotation', 'rotator', 'shoulder'],
  'teres':          ['rear delt', 'external rotation', 'back'],

  // ══════════════════════════════════════════════════════════════════════════════
  // MOVEMENT PATTERNS
  // ══════════════════════════════════════════════════════════════════════════════
  'push':     ['bench', 'press', 'push-up', 'overhead', 'dip', 'chest', 'shoulder'],
  'pull':     ['row', 'pull-up', 'pulldown', 'curl', 'back', 'deadlift'],
  'hinge':    ['deadlift', 'rdl', 'romanian', 'hip thrust', 'good morning', 'swing'],
  'squat':    ['squat', 'goblet', 'front', 'back', 'hack', 'leg press'],
  'carry':    ['farmers', 'carry', 'walk', 'suitcase', 'yoke', 'sandbag'],
  'rotate':   ['woodchop', 'russian twist', 'pallof', 'cable'],
  'plyo':     ['jump', 'box', 'plyometric', 'broad', 'depth', 'tuck'],
  'plyometric': ['jump squat', 'box jump', 'broad jump', 'depth jump', 'explosive'],
  'isometric': ['plank', 'wall sit', 'dead hang', 'hold', 'hollow'],
  'compound': ['squat', 'deadlift', 'bench', 'row', 'press', 'pull-up'],
  'isolation': ['curl', 'extension', 'raise', 'fly', 'crunch', 'kickback'],
  'unilateral': ['single', 'arm', 'leg', 'one', 'arm', 'lunge'],
  'bilateral': ['squat', 'deadlift', 'bench', 'row', 'press'],
  'functional': ['carry', 'squat', 'deadlift', 'lunge', 'push', 'pull'],
  'explosive': ['jump', 'power', 'clean', 'snatch', 'push press', 'plyometric'],
  'eccentric': ['nordic', 'reverse', 'slow', 'lowering'],
  'concentric': ['curl', 'press', 'squat', 'row'],
  'accessory': ['curl', 'extension', 'raise', 'fly', 'calf'],
  'finisher':  ['burnout', 'drop set', 'amrap'],

  // ══════════════════════════════════════════════════════════════════════════════
  // BENCH PRESS FAMILY
  // ══════════════════════════════════════════════════════════════════════════════
  'bench':          ['bench press', 'chest', 'barbell'],
  'flat bench':     ['bench press', 'chest'],
  'incline bench':  ['incline', 'bench press', 'chest', 'upper'],
  'decline bench':  ['decline', 'bench press', 'chest', 'lower'],
  'chest press':    ['bench press', 'dumbbell', 'machine', 'chest'],
  'press':          ['bench press', 'overhead', 'shoulder', 'leg'],
  'push press':     ['overhead', 'press', 'push', 'shoulders'],
  'floor press':    ['floor', 'press', 'bench', 'chest'],
  'pin press':      ['pin', 'press', 'bench', 'partial'],
  'spoto press':    ['spoto', 'bench', 'paused', 'chest'],
  'jm press':       ['jm', 'press', 'triceps', 'close', 'grip'],
  'close grip bench': ['close-grip', 'bench', 'press', 'triceps'],
  'wide grip bench':  ['wide', 'grip', 'bench', 'chest'],
  'board press':    ['board', 'press', 'bench', 'chest', 'partial'],
  'dumbbell press': ['dumbbell', 'bench', 'chest', 'press'],
  'db press':       ['dumbbell', 'press', 'bench', 'chest'],
  'chest day':      ['bench press', 'fly', 'dip', 'chest', 'push-up'],
  'flat':           ['bench', 'press', 'chest', 'dumbbell'],
  'incline':        ['incline', 'bench', 'press', 'dumbbell', 'fly', 'curl'],
  'decline':        ['decline', 'bench', 'press', 'dumbbell', 'fly'],

  // ══════════════════════════════════════════════════════════════════════════════
  // CHEST EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'fly':            ['fly', 'chest', 'dumbbell', 'cable', 'pec'],
  'flye':           ['fly', 'chest'],
  'flyes':          ['fly', 'chest'],
  'flies':          ['fly', 'chest'],
  'cable fly':      ['cable', 'fly', 'chest', 'crossover'],
  'cable crossover':['cable', 'fly', 'chest', 'crossover'],
  'pec deck':       ['pec', 'deck', 'fly', 'machine', 'chest'],
  'pec fly':        ['pec', 'deck', 'fly', 'machine', 'chest'],
  'chest fly':      ['fly', 'chest', 'dumbbell', 'cable', 'pec'],
  'butterfly':      ['pec', 'deck', 'fly', 'machine', 'chest'],
  'crossover':      ['cable', 'fly', 'chest', 'crossover'],
  'dip':            ['chest', 'triceps', 'dip'],
  'dips':           ['chest', 'triceps', 'dip'],
  'chest dip':      ['chest', 'dip', 'triceps'],
  'push up':        ['push-up', 'chest', 'triceps'],
  'pushup':         ['push-up', 'chest'],
  'push-up':        ['push-up', 'chest', 'bodyweight'],
  'diamond pushup': ['diamond', 'push-up', 'triceps'],
  'wide pushup':    ['wide', 'push-up', 'chest'],
  'archer pushup':  ['archer', 'push-up', 'unilateral', 'chest'],
  'pike pushup':    ['pike', 'push-up', 'shoulders'],
  'pullover':       ['pullover', 'chest', 'back', 'dumbbell', 'barbell'],
  'svend press':    ['svend', 'press', 'chest', 'isometric'],
  'low to high':    ['cable', 'fly', 'chest', 'lower'],
  'high to low':    ['cable', 'fly', 'chest', 'upper'],

  // ══════════════════════════════════════════════════════════════════════════════
  // SHOULDER EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'shoulder press':    ['overhead', 'press', 'shoulders', 'dumbbell', 'barbell'],
  'military press':    ['overhead', 'press', 'barbell', 'shoulders'],
  'strict press':      ['overhead', 'press', 'shoulders', 'barbell'],
  'standing press':    ['overhead', 'press', 'shoulders'],
  'seated press':      ['overhead', 'press', 'shoulders', 'seated'],
  'arnold':            ['arnold', 'press', 'shoulders', 'dumbbell', 'rotation'],
  'arnold press':      ['arnold', 'press', 'shoulders', 'dumbbell'],
  'bradford press':    ['bradford', 'press', 'shoulders', 'barbell'],
  'behind the neck':   ['behind', 'neck', 'press', 'shoulders'],
  'behind neck':       ['behind', 'neck', 'press', 'pulldown', 'shoulders'],
  'lateral raise':     ['lateral', 'raise', 'shoulders', 'side', 'delt'],
  'side raise':        ['lateral', 'raise', 'shoulders'],
  'side lateral':      ['lateral', 'raise', 'shoulders'],
  'front raise':       ['front', 'raise', 'shoulders', 'anterior', 'delt'],
  'reverse fly':       ['reverse', 'fly', 'rear', 'delt', 'shoulders'],
  'reverse delt':      ['rear', 'delt', 'reverse fly', 'face pull'],
  'bent over fly':     ['reverse', 'fly', 'rear', 'delt'],
  'bent over lateral': ['reverse', 'fly', 'rear', 'delt'],
  'rear delt fly':     ['reverse', 'fly', 'rear', 'delt', 'bent over'],
  'face pull':         ['face', 'pull', 'rear', 'delt', 'cable', 'rotator'],
  'upright row':       ['upright', 'row', 'shoulders', 'traps'],
  'shrug':             ['shrug', 'traps', 'barbell', 'dumbbell'],
  'shrugs':            ['shrug', 'traps'],
  'shoulder shrug':    ['shrug', 'traps'],
  'y raise':           ['y', 'raise', 'rear', 'delt', 'lower', 'trap'],
  'cuban press':       ['cuban', 'press', 'rotator', 'cuff', 'shoulders'],
  'z press':           ['z', 'press', 'seated', 'overhead', 'floor'],
  'landmine press':    ['landmine', 'press', 'shoulder', 'unilateral'],

  // ══════════════════════════════════════════════════════════════════════════════
  // BACK EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'pull-up':        ['pull-up', 'back', 'biceps', 'chin', 'bodyweight'],
  'pullup':         ['pull-up', 'back', 'biceps'],
  'pull up':        ['pull-up', 'back', 'biceps'],
  'chin-up':        ['chin-up', 'pull-up', 'biceps', 'back'],
  'chinup':         ['chin-up', 'pull-up', 'biceps'],
  'chin up':        ['chin-up', 'pull-up', 'biceps'],
  'neutral grip pull': ['neutral-grip', 'pull-up', 'back', 'biceps'],
  'wide grip pull': ['pull-up', 'wide', 'back', 'lats'],
  'weighted pull':  ['pull-up', 'weighted', 'back'],
  'kipping':        ['kipping', 'pull-up', 'crossfit'],
  'chest to bar':   ['chest-to-bar', 'pull-up', 'back'],
  'muscle up':      ['muscle-up', 'pull-up', 'dip', 'back', 'chest'],
  'lat pulldown':   ['lat', 'pulldown', 'back', 'cable'],
  'lat pull':       ['lat', 'pulldown', 'back', 'cable'],
  'pulldown':       ['lat', 'pulldown', 'back', 'cable'],
  'straight arm':   ['straight-arm', 'pulldown', 'back', 'lats'],
  'pull through':   ['cable', 'pull-through', 'glutes', 'hamstrings'],
  'dead hang':      ['dead', 'hang', 'back', 'bodyweight', 'grip'],
  'active hang':    ['active', 'hang', 'back', 'scapular'],
  'scapular pull':  ['scapular', 'pull-up', 'back', 'shoulder'],
  'row':            ['row', 'back', 'barbell', 'dumbbell', 'cable'],
  'rows':           ['row', 'back', 'barbell', 'dumbbell', 'cable'],
  'bent over row':  ['barbell', 'row', 'back', 'bent'],
  'bent-over row':  ['barbell', 'row', 'back', 'bent'],
  'barbell row':    ['barbell', 'row', 'back', 'bent'],
  'pendlay row':    ['pendlay', 'row', 'back', 'barbell'],
  'yates row':      ['yates', 'row', 'back', 'underhand', 'barbell'],
  'kroc row':       ['kroc', 'row', 'dumbbell', 'back', 'single'],
  'seal row':       ['seal', 'row', 'chest-supported', 'dumbbell', 'back'],
  'chest supported row': ['chest-supported', 'row', 'back', 'dumbbell'],
  'meadows row':    ['meadows', 'row', 'landmine', 'back', 'single'],
  'seated row':     ['seated', 'row', 'cable', 'back'],
  'cable row':      ['cable', 'row', 'back', 'seated'],
  'low row':        ['low', 'row', 'cable', 'back'],
  'high row':       ['high', 'row', 'cable', 'back'],
  't-bar row':      ['t-bar', 'row', 'back', 'barbell'],
  'tbar row':       ['t-bar', 'row', 'back'],
  't bar':          ['t-bar', 'row', 'back'],
  'inverted row':   ['inverted', 'row', 'bodyweight', 'back'],
  'bodyweight row': ['inverted', 'row', 'back', 'bodyweight'],
  'australian pull up': ['inverted', 'row', 'back', 'bodyweight'],
  'ring row':       ['ring', 'row', 'back', 'bodyweight'],
  'back day':       ['row', 'pull-up', 'pulldown', 'deadlift', 'back'],
  'lats':           ['back', 'lat', 'pulldown', 'pull-up', 'row'],
  'rhomboids':      ['back', 'row', 'rear delt', 'face pull'],
  'rack pull':      ['rack', 'pull', 'deadlift', 'partial', 'back', 'traps'],
  'snatch grip deadlift': ['snatch', 'grip', 'deadlift', 'back', 'traps'],
  'good morning':   ['good morning', 'hamstrings', 'lower back', 'barbell'],

  // ══════════════════════════════════════════════════════════════════════════════
  // DEADLIFT FAMILY
  // ══════════════════════════════════════════════════════════════════════════════
  'deadlift':          ['deadlift', 'back', 'hamstrings', 'glutes'],
  'dead lift':         ['deadlift', 'back', 'hamstrings'],
  'conventional':      ['deadlift', 'conventional', 'back', 'hamstrings'],
  'conventional deadlift': ['deadlift', 'conventional'],
  'sumo deadlift':     ['sumo', 'deadlift', 'inner thigh', 'glutes'],
  'sumo dl':           ['sumo', 'deadlift'],
  'stiff leg':         ['stiff-leg', 'deadlift', 'romanian', 'hamstrings'],
  'stiff-leg deadlift': ['stiff', 'leg', 'deadlift', 'hamstrings'],
  'romanian':          ['romanian', 'deadlift', 'rdl', 'hamstrings'],
  'trap bar deadlift': ['trap', 'bar', 'deadlift', 'hex'],
  'hex bar deadlift':  ['hex', 'bar', 'deadlift', 'trap'],
  'trap bar':          ['trap', 'bar', 'deadlift', 'hex'],
  'hex bar':           ['hex', 'bar', 'deadlift', 'trap'],
  'deficit deadlift':  ['deficit', 'deadlift', 'range', 'motion'],
  'paused deadlift':   ['paused', 'deadlift', 'isometric'],
  'clean deadlift':    ['clean', 'deadlift', 'pull', 'olympic'],
  'snatch deadlift':   ['snatch', 'deadlift', 'pull', 'olympic'],
  'jefferson deadlift':['jefferson', 'squat', 'deadlift', 'straddle'],
  'jefferson squat':   ['jefferson', 'deadlift', 'straddle', 'squat'],
  'suitcase deadlift': ['suitcase', 'deadlift', 'single', 'core'],
  'single leg deadlift': ['single-leg', 'deadlift', 'balance', 'hamstrings'],
  'single-leg rdl':    ['single', 'leg', 'romanian', 'deadlift', 'balance'],
  'dumbbell deadlift': ['dumbbell', 'deadlift', 'hinge'],
  'kettlebell deadlift': ['kettlebell', 'deadlift', 'hinge'],

  // ══════════════════════════════════════════════════════════════════════════════
  // SQUAT FAMILY
  // ══════════════════════════════════════════════════════════════════════════════
  'squat':           ['squat', 'quads', 'barbell', 'dumbbell', 'bodyweight'],
  'back squat':      ['squat', 'barbell', 'quads', 'glutes'],
  'front squat':     ['front', 'squat', 'quads', 'barbell'],
  'overhead squat':  ['overhead', 'squat', 'full', 'body'],
  'goblet squat':    ['goblet', 'squat', 'dumbbell', 'kettlebell', 'quads'],
  'goblet':          ['goblet', 'squat', 'dumbbell', 'kettlebell'],
  'zercher':         ['zercher', 'squat', 'barbell'],
  'zercher squat':   ['zercher', 'squat'],
  'hack squat':      ['hack', 'squat', 'machine', 'quads'],
  'hack squats':     ['hack', 'squat', 'machine', 'quads'],
  'belt squat':      ['belt', 'squat', 'quads', 'machine'],
  'pendulum squat':  ['pendulum', 'squat', 'machine', 'quads'],
  'safety bar squat':['safety', 'bar', 'squat', 'cambered'],
  'pause squat':     ['pause', 'squat', 'isometric'],
  'box squat':       ['box', 'squat', 'barbell'],
  'pistol squat':    ['pistol', 'squat', 'single', 'leg', 'bodyweight'],
  'single leg squat': ['pistol', 'squat', 'single', 'leg'],
  'shrimp squat':    ['shrimp', 'squat', 'bodyweight', 'single', 'leg'],
  'bulgarian':       ['bulgarian', 'split', 'squat', 'quads', 'glutes'],
  'split squat':     ['split', 'squat', 'lunge', 'quads', 'bulgarian'],
  'leg day':         ['squat', 'lunge', 'leg press', 'quads', 'hamstrings'],
  'sissy squat':     ['sissy', 'squat', 'quads', 'knee'],
  'cossack':         ['cossack', 'squat', 'lateral', 'adductor'],
  'skater squat':    ['skater', 'squat', 'single', 'leg', 'quads'],
  'frankenstein':    ['frankenstein', 'squat', 'front', 'barbell'],
  'cambered bar':    ['cambered', 'bar', 'squat', 'safety'],
  'wide stance':     ['wide', 'stance', 'squat', 'sumo', 'glutes'],
  'narrow stance':   ['narrow', 'stance', 'squat', 'quads', 'hack'],
  'close stance':    ['narrow', 'stance', 'squat', 'quads'],

  // ══════════════════════════════════════════════════════════════════════════════
  // LUNGE FAMILY
  // ══════════════════════════════════════════════════════════════════════════════
  'lunge':          ['lunge', 'quads', 'glutes', 'barbell', 'dumbbell'],
  'lunges':         ['lunge', 'quads', 'glutes'],
  'walking lunge':  ['walking', 'lunge', 'quads', 'glutes'],
  'reverse lunge':  ['reverse', 'lunge', 'quads', 'glutes'],
  'forward lunge':  ['lunge', 'forward', 'quads'],
  'step up':        ['step-up', 'quads', 'glutes', 'dumbbell'],
  'step-up':        ['step-up', 'quads', 'glutes'],
  'lateral lunge':  ['lateral', 'lunge', 'adductor', 'inner thigh'],
  'side lunge':     ['lateral', 'lunge', 'adductor'],
  'curtsy lunge':   ['curtsy', 'lunge', 'glutes', 'adductor'],
  'elevated lunge': ['elevated', 'lunge', 'bulgarian', 'quads'],

  // ══════════════════════════════════════════════════════════════════════════════
  // HIP / GLUTE EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'hip thrust':     ['hip thrust', 'glutes', 'barbell', 'bodyweight'],
  'glute bridge':   ['glute', 'bridge', 'hip thrust', 'bodyweight'],
  'bridge':         ['glute', 'bridge', 'hip thrust', 'glutes'],
  'hip hinge':      ['deadlift', 'rdl', 'good morning', 'hip thrust', 'swing'],
  'hip extension':  ['glutes', 'hamstrings', 'cable', 'hip thrust'],
  'glute kickback': ['glute', 'kickback', 'cable', 'band'],
  'donkey kick':    ['glute', 'kickback', 'hip extension'],
  'clamshell':      ['clamshell', 'glutes', 'abductor', 'band'],
  'monster walk':   ['monster', 'walk', 'band', 'abductor', 'glutes'],
  'lateral walk':   ['lateral', 'walk', 'band', 'abductor', 'glutes'],
  'abduction':      ['abductor', 'hip', 'lateral', 'glutes'],
  'adduction':      ['adductor', 'hip', 'inner thigh', 'groin'],
  'abductor':       ['hip abductor', 'lateral', 'glutes', 'band'],
  'glute ham raise':['glute', 'ham', 'raise', 'hamstrings', 'ghr'],
  'ghd':            ['ghd', 'glute', 'ham', 'developer', 'back extension'],
  'nordics':        ['nordic', 'curl', 'hamstrings', 'bodyweight'],
  'nordic hamstring':['nordic', 'curl', 'hamstrings'],
  'reverse nordic': ['reverse', 'nordic', 'quads'],
  'copenhagen':     ['copenhagen', 'plank', 'adductor', 'inner thigh'],
  'pull through':   ['cable', 'pull-through', 'glutes', 'hamstrings'],
  'hip abduction':  ['abductor', 'machine', 'lateral', 'glutes'],

  // ══════════════════════════════════════════════════════════════════════════════
  // BICEP EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'curl':           ['curl', 'biceps', 'barbell', 'dumbbell', 'cable'],
  'curls':          ['curl', 'biceps', 'barbell', 'dumbbell'],
  'bicep curl':     ['barbell', 'curl', 'biceps'],
  'barbell curl':   ['barbell', 'curl', 'biceps'],
  'dumbbell curl':  ['dumbbell', 'curl', 'biceps'],
  'hammer curl':    ['hammer', 'curl', 'biceps', 'brachialis', 'forearms'],
  'neutral curl':   ['hammer', 'curl', 'neutral', 'grip'],
  'preacher curl':  ['preacher', 'curl', 'biceps', 'ez'],
  'concentration curl': ['concentration', 'curl', 'biceps', 'dumbbell'],
  'incline curl':   ['incline', 'curl', 'biceps', 'dumbbell'],
  'spider curl':    ['spider', 'curl', 'biceps', 'dumbbell'],
  'drag curl':      ['drag', 'curl', 'biceps', 'barbell'],
  'cable curl':     ['cable', 'curl', 'biceps'],
  'rope curl':      ['rope', 'curl', 'cable', 'biceps'],
  'reverse curl':   ['reverse', 'curl', 'forearms', 'brachioradialis'],
  'zottman curl':   ['zottman', 'curl', 'biceps', 'forearms', 'dumbbell'],
  'wrist curl':     ['wrist', 'curl', 'forearms'],
  'reverse wrist':  ['reverse', 'wrist', 'curl', 'forearms'],
  'ez bar curl':    ['ez', 'bar', 'curl', 'biceps', 'barbell'],
  'prone incline curl': ['prone', 'incline', 'curl', 'biceps'],
  'chin':           ['chin-up', 'pull-up', 'biceps', 'back'],

  // ══════════════════════════════════════════════════════════════════════════════
  // TRICEP EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'skull crusher':    ['skullcrusher', 'triceps', 'barbell', 'ez', 'lying'],
  'skull crushers':   ['skullcrusher', 'triceps', 'barbell'],
  'skullcrusher':     ['skull', 'crusher', 'triceps', 'barbell', 'ez'],
  'lying tricep':     ['skullcrusher', 'lying', 'triceps', 'extension'],
  'lying extension':  ['skullcrusher', 'lying', 'triceps', 'extension'],
  'french press':     ['overhead', 'triceps', 'extension', 'barbell'],
  'french extension': ['overhead', 'triceps', 'extension'],
  'tricep extension': ['triceps', 'extension', 'overhead', 'dumbbell', 'cable'],
  'overhead extension': ['overhead', 'triceps', 'extension', 'cable'],
  'tricep pushdown':  ['triceps', 'pushdown', 'cable', 'rope', 'bar'],
  'pushdown':         ['triceps', 'pushdown', 'cable'],
  'push down':        ['triceps', 'pushdown', 'cable'],
  'cable pushdown':   ['cable', 'pushdown', 'triceps'],
  'rope pushdown':    ['rope', 'pushdown', 'triceps', 'cable'],
  'kickback':         ['triceps', 'kickback', 'dumbbell', 'cable'],
  'kick back':        ['triceps', 'kickback', 'dumbbell'],
  'tricep dip':       ['triceps', 'dip', 'bodyweight', 'bench'],
  'bench dip':        ['bench', 'dip', 'triceps', 'bodyweight'],
  'close grip':       ['close-grip', 'bench', 'press', 'triceps'],
  'jm press':         ['jm', 'press', 'triceps', 'barbell'],
  'tate press':       ['tate', 'press', 'triceps', 'dumbbell'],
  'dumbbell skull crusher': ['dumbbell', 'skull', 'crusher', 'triceps'],
  'overhead tricep':  ['overhead', 'triceps', 'extension', 'cable', 'dumbbell'],

  // ══════════════════════════════════════════════════════════════════════════════
  // LEG MACHINE EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'leg press':      ['leg', 'press', 'quads', 'machine'],
  'leg extension':  ['leg', 'extension', 'quads', 'machine'],
  'quad extension': ['leg', 'extension', 'quads', 'machine'],
  'leg curl':       ['leg', 'curl', 'hamstrings', 'machine'],
  'hamstring curl': ['leg', 'curl', 'hamstrings', 'machine'],
  'seated leg curl':['seated', 'leg', 'curl', 'hamstrings'],
  'lying leg curl': ['lying', 'leg', 'curl', 'hamstrings'],
  'prone leg curl': ['lying', 'leg', 'curl', 'hamstrings'],
  'adductor machine':['adductor', 'machine', 'inner thigh'],
  'abductor machine':['abductor', 'machine', 'glutes'],
  'inner thigh machine': ['adductor', 'machine', 'inner thigh'],
  'outer thigh machine': ['abductor', 'machine', 'glutes'],

  // ══════════════════════════════════════════════════════════════════════════════
  // CALF EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'calf raise':     ['calf', 'raise', 'calves', 'standing', 'seated'],
  'calf raises':    ['calf', 'raise', 'calves'],
  'standing calf':  ['standing', 'calf', 'raise', 'calves'],
  'seated calf':    ['seated', 'calf', 'raise', 'soleus'],
  'donkey calf':    ['donkey', 'calf', 'raise', 'calves'],
  'single leg calf':['single-leg', 'calf', 'raise', 'calves'],
  'leg press calf': ['leg', 'press', 'calf', 'raise'],

  // ══════════════════════════════════════════════════════════════════════════════
  // CORE EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'core':           ['core', 'plank', 'crunch', 'ab', 'sit-up'],
  'ab':             ['core', 'crunch', 'sit-up', 'plank'],
  'abs':            ['core', 'crunch', 'sit-up', 'plank', 'leg raise'],
  'plank':          ['plank', 'core', 'isometric', 'bodyweight'],
  'side plank':     ['side', 'plank', 'obliques', 'core'],
  'hollow body':    ['hollow', 'body', 'core', 'gymnastics'],
  'hollow hold':    ['hollow', 'body', 'core', 'bodyweight'],
  'crunch':         ['crunch', 'core', 'abs', 'machine'],
  'crunches':       ['crunch', 'core', 'abs'],
  'sit up':         ['sit-up', 'core', 'abs'],
  'situp':          ['sit-up', 'core', 'abs'],
  'sit-up':         ['sit-up', 'core', 'abs'],
  'leg raise':      ['leg', 'raise', 'core', 'abs', 'hanging'],
  'hanging leg raise': ['hanging', 'leg', 'raise', 'core', 'abs'],
  'toes to bar':    ['toes', 'bar', 'core', 'hanging', 'abs'],
  'knees to chest': ['knees', 'chest', 'core', 'hanging'],
  'v-up':           ['v-up', 'core', 'abs', 'bodyweight'],
  'v up':           ['v-up', 'core', 'abs'],
  'jackknife':      ['jackknife', 'sit-up', 'core', 'abs'],
  'ab wheel':       ['ab', 'wheel', 'rollout', 'core'],
  'rollout':        ['rollout', 'ab', 'wheel', 'core', 'barbell'],
  'pallof press':   ['pallof', 'press', 'core', 'cable', 'anti-rotation'],
  'woodchop':       ['woodchop', 'core', 'cable', 'obliques'],
  'cable crunch':   ['cable', 'crunch', 'core', 'abs'],
  'russian twist':  ['russian', 'twist', 'core', 'obliques'],
  'oblique crunch': ['oblique', 'crunch', 'core', 'side'],
  'mountain climber':['mountain', 'climber', 'core', 'cardio', 'bodyweight'],
  'dead bug':       ['dead', 'bug', 'core', 'stability', 'bodyweight'],
  'flutter kicks':  ['flutter', 'kicks', 'core', 'abs'],
  'windshield wiper': ['windshield', 'wiper', 'core', 'obliques'],
  'dragon flag':    ['dragon', 'flag', 'core', 'advanced', 'bodyweight'],
  'l-sit':          ['l-sit', 'core', 'gymnastics', 'bodyweight'],
  'superman':       ['superman', 'hold', 'lower', 'back', 'erectors'],
  'back extension': ['back', 'extension', 'lower', 'back', 'erectors', 'ghd'],
  'hyperextension': ['hyperextension', 'lower', 'back', 'erectors'],
  'reverse hyper':  ['reverse', 'hyper', 'glutes', 'lower', 'back'],
  'roman chair':    ['roman', 'chair', 'hyperextension', 'sit-up', 'lower back'],

  // ══════════════════════════════════════════════════════════════════════════════
  // OLYMPIC / POWER LIFTS
  // ══════════════════════════════════════════════════════════════════════════════
  'power clean':    ['power', 'clean', 'full', 'body', 'olympic'],
  'clean':          ['clean', 'power', 'olympic', 'full body'],
  'hang clean':     ['hang', 'clean', 'olympic', 'full body'],
  'hang power clean': ['hang', 'power', 'clean', 'olympic'],
  'snatch':         ['snatch', 'power', 'olympic', 'full body'],
  'power snatch':   ['power', 'snatch', 'olympic'],
  'hang snatch':    ['hang', 'snatch', 'olympic'],
  'clean and jerk': ['clean', 'jerk', 'olympic', 'full body'],
  'jerk':           ['jerk', 'clean', 'olympic', 'overhead'],
  'push jerk':      ['push', 'jerk', 'overhead', 'olympic'],
  'split jerk':     ['split', 'jerk', 'overhead', 'olympic'],
  'power jerk':     ['power', 'jerk', 'overhead', 'olympic'],
  'snatch balance': ['snatch', 'balance', 'overhead', 'olympic'],
  'overhead squat': ['overhead', 'squat', 'olympic', 'snatch'],
  'thruster':       ['thruster', 'squat', 'press', 'full body', 'crossfit'],
  'clean pull':     ['clean', 'pull', 'olympic', 'back'],
  'snatch pull':    ['snatch', 'pull', 'olympic'],
  'clean shrug':    ['clean', 'shrug', 'olympic', 'traps'],

  // ══════════════════════════════════════════════════════════════════════════════
  // KETTLEBELL EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'kettlebell swing': ['kettlebell', 'swing', 'glutes', 'hamstrings'],
  'kb swing':         ['kettlebell', 'swing', 'glutes', 'hamstrings'],
  'swing':            ['kettlebell', 'swing', 'glutes', 'hip hinge'],
  'turkish get up':   ['turkish', 'get-up', 'full body', 'kettlebell'],
  'turkish get-up':   ['turkish', 'get-up', 'full body', 'kettlebell'],
  'tgu':              ['turkish', 'get-up', 'kettlebell', 'full body'],
  'windmill':         ['kettlebell', 'windmill', 'shoulders', 'core'],
  'figure 8':         ['figure-8', 'kettlebell', 'core'],
  'halo':             ['kettlebell', 'halo', 'shoulders', 'core'],
  'kb clean':         ['kettlebell', 'clean', 'full body', 'hinge'],
  'kb snatch':        ['kettlebell', 'snatch', 'full body'],
  'kb press':         ['kettlebell', 'press', 'overhead', 'shoulder'],
  'kb row':           ['kettlebell', 'row', 'back'],
  'kb deadlift':      ['kettlebell', 'deadlift', 'hinge', 'glutes'],
  'suitcase carry':   ['suitcase', 'carry', 'farmers', 'forearms', 'core'],
  'farmers walk':     ['farmers', 'carry', 'walk', 'full body'],
  'farmers carry':    ['farmers', 'carry', 'walk', 'grip', 'full body'],
  'yoke':             ['yoke', 'walk', 'carry', 'full body'],
  'sandbag':          ['sandbag', 'carry', 'full body'],

  // ══════════════════════════════════════════════════════════════════════════════
  // CABLE EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'cable':          ['cable', 'pulley', 'machine'],
  'cable machine':  ['cable', 'pulley', 'machine'],
  'cable fly':      ['cable', 'fly', 'chest', 'crossover'],
  'low cable':      ['cable', 'fly', 'low', 'crossover'],
  'high cable':     ['cable', 'fly', 'high', 'curl', 'rear'],
  'crossover':      ['cable', 'fly', 'chest', 'crossover'],
  'cable curl':     ['cable', 'curl', 'biceps'],
  'rope':           ['rope', 'cable', 'triceps', 'face pull'],

  // ══════════════════════════════════════════════════════════════════════════════
  // BAND / RESISTANCE EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'band':           ['band', 'resistance', 'rubber'],
  'resistance band':['band', 'resistance'],
  'pull apart':     ['band', 'pull-apart', 'rear', 'delt', 'shoulders'],
  'band pull':      ['band', 'pull-apart', 'face pull', 'shoulder'],

  // ══════════════════════════════════════════════════════════════════════════════
  // CARDIO EXERCISES
  // ══════════════════════════════════════════════════════════════════════════════
  'cardio':         ['cardio', 'aerobic', 'conditioning'],
  'run':            ['running', 'treadmill', 'cardio', 'outdoor'],
  'running':        ['treadmill', 'run', 'outdoor', 'cardio', 'sprint'],
  'jog':            ['running', 'treadmill', 'cardio', 'outdoor'],
  'jogging':        ['running', 'treadmill', 'cardio'],
  'sprint':         ['sprint', 'run', 'treadmill', 'intervals', 'cardio'],
  'sprints':        ['sprint', 'intervals', 'treadmill', 'cardio'],
  'intervals':      ['sprint', 'hiit', 'intervals', 'cardio', 'treadmill'],
  'treadmill':      ['treadmill', 'run', 'walk', 'cardio'],
  'bike':           ['cycling', 'stationary', 'bike', 'cardio', 'assault'],
  'biking':         ['cycling', 'stationary', 'bike', 'cardio'],
  'cycling':        ['stationary', 'bike', 'cycling', 'cardio', 'assault'],
  'spin':           ['cycling', 'stationary', 'bike', 'spin'],
  'assault bike':   ['assault', 'bike', 'cardio', 'conditioning'],
  'air bike':       ['assault', 'bike', 'air', 'cardio'],
  'elliptical':     ['elliptical', 'cardio', 'low impact'],
  'stair':          ['stair', 'climber', 'cardio', 'legs'],
  'stairs':         ['stair', 'climber', 'stadium', 'cardio'],
  'stair climber':  ['stair', 'climber', 'cardio'],
  'stepper':        ['stair', 'climber', 'cardio'],
  'row machine':    ['rowing', 'machine', 'ergometer', 'erg', 'cardio'],
  'rowing machine': ['rowing', 'machine', 'ergometer', 'cardio'],
  'erg':            ['rowing', 'machine', 'ergometer', 'cardio'],
  'ergometer':      ['rowing', 'machine', 'erg', 'cardio'],
  'ski erg':        ['ski', 'erg', 'cardio', 'conditioning'],
  'versa climber':  ['versa', 'climber', 'cardio', 'full body'],
  'jump rope':      ['jump', 'rope', 'cardio', 'skip'],
  'skip':           ['jump', 'rope', 'cardio', 'skipping'],
  'skipping':       ['jump', 'rope', 'cardio'],
  'jumping jack':   ['jumping', 'jack', 'cardio', 'bodyweight'],
  'jumping jacks':  ['jumping', 'jack', 'cardio', 'bodyweight'],
  'burpee':         ['burpee', 'cardio', 'bodyweight', 'full body'],
  'burpees':        ['burpee', 'cardio', 'bodyweight'],
  'battle ropes':   ['battle', 'ropes', 'cardio', 'conditioning'],
  'sled push':      ['sled', 'push', 'cardio', 'quads'],
  'sled pull':      ['sled', 'pull', 'cardio', 'hamstrings'],
  'prowler':        ['sled', 'prowler', 'push', 'cardio'],
  'swim':           ['swimming', 'cardio', 'full body'],
  'swimming':       ['swim', 'cardio', 'full body', 'laps'],
  'aqua':           ['aqua', 'jogging', 'swimming', 'cardio'],
  'hike':           ['hiking', 'cardio', 'outdoor'],
  'hiking':         ['hike', 'cardio', 'outdoor'],
  'boxing':         ['boxing', 'cardio', 'conditioning'],
  'kickboxing':     ['kickboxing', 'cardio', 'conditioning'],
  'dance':          ['dance', 'cardio', 'aerobic'],

  // ══════════════════════════════════════════════════════════════════════════════
  // PLYOMETRIC / JUMP
  // ══════════════════════════════════════════════════════════════════════════════
  'box jump':       ['box', 'jump', 'plyometric', 'explosive', 'quads'],
  'broad jump':     ['broad', 'jump', 'plyometric', 'horizontal', 'power'],
  'depth jump':     ['depth', 'jump', 'plyometric', 'reactive'],
  'jump squat':     ['jump', 'squat', 'plyometric', 'quads', 'explosive'],
  'tuck jump':      ['tuck', 'jump', 'plyometric', 'core'],
  'star jump':      ['star', 'jump', 'jumping', 'jack', 'cardio'],
  'lateral bound':  ['lateral', 'bound', 'plyometric', 'lateral', 'speed'],
  'skater jump':    ['skater', 'jump', 'lateral', 'plyometric'],
  'jump':           ['jump', 'plyometric', 'explosive', 'box', 'squat'],

  // ══════════════════════════════════════════════════════════════════════════════
  // GYMNASTICS / CALISTHENICS
  // ══════════════════════════════════════════════════════════════════════════════
  'handstand':      ['handstand', 'push-up', 'wall', 'shoulders'],
  'hspu':           ['handstand', 'push-up', 'shoulders'],
  'handstand push up': ['handstand', 'push-up', 'shoulders', 'bodyweight'],
  'front lever':    ['front', 'lever', 'back', 'core', 'gymnastics'],
  'planche':        ['planche', 'chest', 'shoulders', 'gymnastics'],
  'ring dip':       ['ring', 'dip', 'chest', 'triceps', 'gymnastics'],
  'ring pullup':    ['ring', 'pull-up', 'back', 'gymnastics'],
  'bar muscle up':  ['bar', 'muscle-up', 'back', 'chest'],
  'ring muscle up': ['ring', 'muscle-up', 'back', 'chest'],
  'typewriter':     ['typewriter', 'pull-up', 'back', 'advanced'],
  'archer pull up': ['archer', 'pull-up', 'back', 'unilateral'],
  'scapular pull':  ['scapular', 'pull-up', 'back', 'shoulder'],
  'dead hang':      ['dead', 'hang', 'grip', 'back', 'forearms'],
  'wall sit':       ['wall', 'sit', 'quads', 'isometric', 'bodyweight'],
  'hollow':         ['hollow', 'body', 'hold', 'rock', 'core'],
  'bear crawl':     ['bear', 'crawl', 'core', 'full body', 'bodyweight'],
  'inchworm':       ['inchworm', 'hamstrings', 'mobility', 'bodyweight'],
  'jefferson curl': ['jefferson', 'curl', 'hamstrings', 'mobility'],

  // ══════════════════════════════════════════════════════════════════════════════
  // EQUIPMENT TYPES
  // ══════════════════════════════════════════════════════════════════════════════
  'barbell':        ['barbell', 'bb'],
  'dumbbell':       ['dumbbell', 'db'],
  'kettlebell':     ['kettlebell', 'kb'],
  'cable':          ['cable', 'pulley'],
  'machine':        ['machine', 'lever', 'seated'],
  'bodyweight':     ['bodyweight', 'bw', 'no', 'equipment'],
  'bands':          ['band', 'resistance'],
  'smith':          ['smith', 'machine', 'squat', 'bench', 'row'],
  'smith machine':  ['smith', 'machine', 'squat', 'bench'],
  'landmine':       ['landmine', 'rotation', 'press', 'row', 'squat'],
  'trap bar':       ['trap', 'bar', 'hex', 'deadlift'],
  'safety bar':     ['safety', 'bar', 'squat', 'cambered'],
  'ez bar':         ['ez', 'bar', 'curl', 'skull', 'triceps'],
  'cambered':       ['cambered', 'bar', 'squat', 'row'],
  'rings':          ['rings', 'gymnastics', 'bodyweight', 'dip'],

  // ══════════════════════════════════════════════════════════════════════════════
  // NAMED EXERCISES (PEOPLE'S NAMES)
  // ══════════════════════════════════════════════════════════════════════════════
  'pendlay':        ['pendlay', 'row', 'back', 'barbell'],
  'zercher':        ['zercher', 'squat', 'carry', 'barbell'],
  'jm blakley':     ['jm', 'press', 'triceps'],
  'zottman':        ['zottman', 'curl', 'biceps', 'forearms'],
  'svend':          ['svend', 'press', 'chest', 'isometric'],
  'pallof':         ['pallof', 'press', 'core', 'cable', 'anti-rotation'],
  'tate':           ['tate', 'press', 'triceps', 'dumbbell'],
  'meadows':        ['meadows', 'row', 'back', 'landmine'],
  'spoto':          ['spoto', 'press', 'bench', 'paused'],
  'bradford':       ['bradford', 'press', 'shoulders', 'barbell'],
  'yates':          ['yates', 'row', 'back', 'underhand', 'barbell'],
  'kroc':           ['kroc', 'row', 'dumbbell', 'back'],

  // ══════════════════════════════════════════════════════════════════════════════
  // GENERAL TERMS
  // ══════════════════════════════════════════════════════════════════════════════
  'pull day':       ['row', 'pull-up', 'pulldown', 'deadlift', 'curl', 'back', 'biceps'],
  'push day':       ['bench', 'press', 'fly', 'shoulder', 'triceps', 'overhead'],
  'leg day':        ['squat', 'deadlift', 'lunge', 'leg press', 'quads', 'hamstrings'],
  'back day':       ['row', 'pull-up', 'pulldown', 'back', 'deadlift'],
  'chest day':      ['bench', 'fly', 'press', 'dip', 'push-up', 'chest'],
  'shoulder day':   ['overhead', 'press', 'lateral', 'raise', 'face pull', 'shoulders'],
  'arm day':        ['curl', 'extension', 'pushdown', 'triceps', 'biceps'],
  'glute day':      ['hip thrust', 'bridge', 'glute', 'squat', 'deadlift'],
  'big 3':          ['squat', 'bench', 'deadlift', 'powerlifting'],
  'big three':      ['squat', 'bench', 'deadlift', 'powerlifting'],
  'powerlifting':   ['squat', 'bench', 'deadlift'],
  'weightlifting':  ['clean', 'jerk', 'snatch', 'olympic'],
  'strongman':      ['farmers', 'carry', 'sled', 'yoke', 'sandbag', 'log'],
  'crossfit':       ['thruster', 'burpee', 'pull-up', 'kettlebell', 'conditioning'],
  'conditioning':   ['sled', 'cardio', 'hiit', 'circuit', 'metabolic'],
  'mobility':       ['jefferson', 'curl', 'cossack', 'hip', 'stretch'],
  'warm up':        ['light', 'bodyweight', 'band', 'mobility'],
  'cool down':      ['stretch', 'mobility', 'light'],
  'no equipment':   ['bodyweight', 'calisthenics', 'push-up', 'pull-up', 'squat'],
  'home workout':   ['bodyweight', 'dumbbell', 'band', 'no equipment'],
  'full body':      ['squat', 'deadlift', 'clean', 'thruster', 'burpee'],
  'chest and back': ['bench', 'row', 'fly', 'pull-up', 'chest'],
  'back and bis':   ['row', 'pull-up', 'curl', 'back', 'biceps'],
  'chest and tris': ['bench', 'fly', 'triceps', 'dip', 'push-up'],
  'shoulders and tris': ['overhead', 'press', 'lateral', 'raise', 'triceps'],
}

// ── Build searchable text for one exercise ────────────────────────────────────

function buildSearchText(e: Exercise): string {
  return [e.name, e.muscleGroup, e.category, e.instructions ?? '']
    .join(' ')
    .toLowerCase()
}

// ── Score: how well does this exercise match the query? ───────────────────────

export function scoreExercise(e: Exercise, rawQuery: string): number {
  if (!rawQuery.trim()) return 1

  const query      = rawQuery.toLowerCase().trim()
  const searchText = buildSearchText(e)
  const nameLower  = e.name.toLowerCase()

  // Exact name match
  if (nameLower === query)            return 100
  // Name starts with query
  if (nameLower.startsWith(query))    return 85
  // Name contains query as substring
  if (nameLower.includes(query))      return 70
  // Any searchable field contains exact query
  if (searchText.includes(query))     return 55

  // Multi-word tokenised match — ALL tokens must match (directly or via synonym)
  const tokens = query.split(/\s+/).filter(Boolean)
  let totalScore = 0

  for (const token of tokens) {
    let tokenScore = 0

    if (searchText.includes(token)) {
      tokenScore = 40
    } else {
      // Exact synonym key match
      const directExpansion = SYNONYMS[token]
      if (directExpansion) {
        for (const syn of directExpansion) {
          if (searchText.includes(syn)) { tokenScore = 25; break }
        }
      }

      // Partial key match (token is a prefix of a synonym key)
      if (!tokenScore) {
        for (const [key, syns] of Object.entries(SYNONYMS)) {
          if (key.startsWith(token) || token.startsWith(key)) {
            for (const syn of syns) {
              if (searchText.includes(syn)) { tokenScore = 18; break }
            }
          }
          if (tokenScore) break
        }
      }

      // Token appears as a value in any synonym group
      if (!tokenScore) {
        for (const syns of Object.values(SYNONYMS)) {
          if (syns.some(s => s.includes(token) || token.includes(s))) {
            // Check if the exercise matches the other terms in that group
            const matchingSyns = syns.filter(s => searchText.includes(s))
            if (matchingSyns.length > 0) { tokenScore = 12; break }
          }
        }
      }
    }

    if (tokenScore === 0) return 0   // all tokens must match
    totalScore += tokenScore
  }

  return totalScore
}

// ── Main filter / sort function ───────────────────────────────────────────────

export function filterExercises(exercises: Exercise[], query: string): Exercise[] {
  if (!query.trim()) return exercises
  return exercises
    .map(e  => ({ e, score: scoreExercise(e, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ e }) => e)
}
