/**
 * Your gym notes, kept in the exact shape you already write them in.
 *
 * Format:
 *   Push / Pull / Legs        day heading
 *   Name - 80x9 75x8 ...      one exercise; "weight x reps", space separated
 *   70x8+55x3+45x3            a "+" chains drop sets onto the same set
 *   OR                        links the exercise above and below as a choice
 *   (blank line)              everything after it in that day is optional/extra
 *   ... (some note)           trailing parentheses become the exercise note
 *
 * Edit this and the app updates. Use "Reload from notes" in Settings.
 */
export const RAW_NOTES = `
Push
Chest press (sitting) - 85x9 80x8 75x8 70x8+55x3+45x3
OR
Dumbbell press - 30x10 25x11 25x10 25x9
Cable fly (down) - 40x6 35x9 30x11
OR
Pec fly - 70x9 65x9 60x12
Lateral raise - 25x7 22.5x9 22.5x8 20x11+15x4+10x4+7.5x5
OR
Lateral raise machine - 45x13 40x11 40x11 40x10+30x5+20x6
Dumbbell shoulder press - 15x10 15x10 17.5x8 17.5x9
Tricep pushdown (cable) - 80x7 70x10 70x7 65x8+55x4+45x4+35x3
OR
Tricep pushdown (bar) - 75x10 70x10 65x10 65x9+50x5+40x5+30x5+25x5
OR
Overhead raise - 12.5x7 10x11 10x9 10x
OR
Tricep pushdown (single) - 25x8 20x12 20x8 20x7

Pull
Pull-ups - 8 7
Machine row - 80x9 75x8 70x9 70x8
OR
Chest sup row - 60x8 55x10 50x9 45x11
Shrugs - 45x10 45x9 40x11
Lat pulldown (neutral) - 80x10 75x9 75x8 70x9+50x5+35x9 (make 55 n 45)
Face pulls - 70x10 65x11 60x12 60x12+50x5+40x6+30x6
Hanging (sec) - 38 33 35
Hammer curls (sitting, alternate) - 12.5x13 15x10 15x9 17.5x7+12.5x6
Rear delt fly - 60x12 60x12 55x12 (start from 65)

Inc Bench row (1st stop) - 30x8 30x7 30x7 30x
Bicep curls (sitting, cable) - 6x11 6x10 7x8 7x7+4x8+3x8
Farmer carry - 15x60 15x70 20x60 20x60
Bicep curls - 12.5x12 15x9 17.5x6 17.5x5+15x4+12.5x4
Skiers - 10x11 10x11 12.5x9 12.5x10
Lat pulldown (wide) - 10x15 12x12 13x10 14x8 (Inc 1st set to plate 11)
Cable row (one-arm) - 5x9 5x8 5x10 6x8
Bicep curls (eezee) - 7.5x15 10x12 15x6 12.5x
Shrugs (bench press machine) - 16x15 20x12 20x12 20x14 (inc)
Rear delt fly (inc bench) - 7.5x15 10x11 12.5x9 12.5x8+7.5x10
Single arm row - 20x12 25x10 30x7 30x8
Deadlift - 20x15 25x12 30x10 35x8

Legs
Free squats - 20 20 20
Leg press - 120x12 120x9 110x10 100x12 (start from 130)
Leg extension - 102.5x10 102.5x10 102.5x10 102.5x10+82.5x2
Hamstring curls - 75x10 70x10 65x11 65x10
Adductor - 85x10 80x9 75x9 70x10
Wall sit - 110s
`

/**
 * Things the notes can't express on their own: which machines are numbered by
 * plate rather than kilos, and which lifts aren't measured in weight x reps.
 */
export const OVERRIDES: Record<string, { unit?: 'plate'; metric?: 'reps' | 'time' | 'weight_time' }> = {
  'pull-ups': { metric: 'reps' },
  'free-squats': { metric: 'reps' },
  'hanging-sec': { metric: 'time' },
  'wall-sit': { metric: 'time' },
  'farmer-carry': { metric: 'weight_time' },
  'bicep-curls-sitting-cable': { unit: 'plate' },
  'lat-pulldown-wide': { unit: 'plate' },
  'cable-row-one-arm': { unit: 'plate' },
  'shrugs-bench-press-machine': { unit: 'plate' },
}
