// One-shot: walk every Meal, re-look up each item's Food by fdcId, recompute
// per-item and meal-level micronutrients. Idempotent — safe to re-run.
//
//   node server/scripts/backfill-meal-micros.js

require('dotenv').config();
const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const Food = require('../models/Food');

const MICRO_KEYS = [
  'fiber', 'sugar', 'saturatedFat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'folate',
];
const round1 = (n) => Math.round(n * 10) / 10;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const meals = await Meal.find({ 'items.0': { $exists: true } });
  console.log(`Found ${meals.length} meals with item breakdowns to backfill`);

  // Cache foods by fdcId so we don't hit Mongo per-item.
  const fdcIds = [...new Set(meals.flatMap(m => m.items.map(i => i.fdcId)).filter(Boolean))];
  const foods  = await Food.find({ fdcId: { $in: fdcIds } }).lean();
  const foodMap = new Map(foods.map(f => [f.fdcId, f]));
  console.log(`Loaded ${foods.length} unique foods into cache`);

  let updated = 0, skipped = 0;
  for (const meal of meals) {
    const totals = Object.fromEntries(MICRO_KEYS.map(k => [k, 0]));
    let anyResolved = false;

    for (const item of meal.items) {
      const food = foodMap.get(item.fdcId);
      if (!food || !food.per100g) { continue; }
      anyResolved = true;
      const factor = (item.grams || 0) / 100;
      for (const k of MICRO_KEYS) {
        const v = (food.per100g[k] || 0) * factor;
        totals[k] += v;
        item[k] = round1(v);
      }
    }

    if (!anyResolved) { skipped++; continue; }
    for (const k of MICRO_KEYS) meal[k] = round1(totals[k]);
    await meal.save();
    updated++;
    if (updated % 25 === 0) console.log(`  ...updated ${updated}`);
  }

  console.log(`Done. Updated ${updated} meals, skipped ${skipped} (no resolvable items).`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
