require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Food = require('../models/Food');

const NUTRIENT_MAP = {
  1008: 'calories',
  1003: 'protein',
  1005: 'carbs',
  1004: 'fat',
  1079: 'fiber',
  2000: 'sugar',
  1258: 'saturatedFat',
  1253: 'cholesterol',
  1093: 'sodium',
  1092: 'potassium',
  1087: 'calcium',
  1089: 'iron',
  1090: 'magnesium',
  1095: 'zinc',
  1091: 'phosphorus',
  1162: 'vitaminC',
  1106: 'vitaminA',
  1114: 'vitaminD',
  1178: 'vitaminB12',
  1177: 'folate',
};

const BOILERPLATE = new Set([
  'broilers or fryers', 'broiler or fryer', 'all classes',
  'other parts', 'usda commodity', 'composite of trimmed retail cuts',
  'ns as to', 'not specified',
]);

const DESCRIPTOR_REPLACEMENTS = {
  'meat only': 'skinless',
  'meat and skin': 'with skin',
  'meat, skin, giblets, and neck': 'whole bird',
  'flesh only': 'flesh',
};

const BODY_PARTS = new Set([
  'breast', 'thigh', 'leg', 'wing', 'drumstick', 'tenderloin', 'tenderloins',
  'liver', 'heart', 'gizzard', 'back', 'neck', 'loin', 'rib', 'ribs',
  'shoulder', 'shank', 'flank', 'sirloin', 'tenderloin', 'fillet', 'roast',
]);

function makeNames(usdaName) {
  const parts = usdaName.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    const lower = usdaName.toLowerCase();
    return { primary: lower, shortName: lower };
  }

  let main = parts[0].toLowerCase();

  const descriptors = [];
  for (let i = 1; i < parts.length; i++) {
    let p = parts[i].toLowerCase();
    if (BOILERPLATE.has(p)) continue;
    if (DESCRIPTOR_REPLACEMENTS[p]) p = DESCRIPTOR_REPLACEMENTS[p];
    descriptors.push(p);
  }

  const bodyPartIdx = descriptors.findIndex(d => BODY_PARTS.has(d));
  if (bodyPartIdx >= 0) {
    main = `${main} ${descriptors[bodyPartIdx]}`;
    descriptors.splice(bodyPartIdx, 1);
  }

  const primary = main;
  const shortName = descriptors.length === 0 ? main : `${main} (${descriptors.join(', ')})`;
  return { primary, shortName };
}

function extractNutrients(foodNutrients) {
  const per100g = {};
  for (const fn of foodNutrients) {
    const id = fn.nutrient?.id ?? fn.nutrient?.number ?? fn.nutrientId;
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const amount = fn.amount ?? 0;
    if (NUTRIENT_MAP[numericId] !== undefined && !per100g[NUTRIENT_MAP[numericId]]) {
      per100g[NUTRIENT_MAP[numericId]] = amount;
    }
  }
  return per100g;
}

async function seedFromFile(relativePath, dataType, foodsKey) {
  const fullPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${relativePath} not found — skipping ${dataType}.`);
    console.log(`    Place the unzipped USDA JSON at: ${fullPath}`);
    return 0;
  }

  console.log(`📖 Reading ${relativePath}...`);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(raw);
  const foods = data[foodsKey] ?? [];
  console.log(`   → ${foods.length} foods found in source`);

  const docs = foods
    .filter(f => f && f.fdcId && f.description)
    .map(f => {
      const per100g = extractNutrients(f.foodNutrients ?? []);
      if (!per100g.calories) return null;
      const { primary, shortName } = makeNames(f.description);
      return {
        fdcId: f.fdcId,
        name: f.description,
        primaryName: primary,
        shortName,
        category: f.foodCategory?.description ?? 'Uncategorized',
        dataType,
        per100g,
      };
    })
    .filter(Boolean);

  console.log(`   → ${docs.length} have calories (others skipped)`);

  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      const result = await Food.insertMany(batch, { ordered: false });
      inserted += result.length;
    } catch (err) {
      const succeeded = err.insertedDocs?.length ?? 0;
      inserted += succeeded;
    }
    process.stdout.write(`\r   Inserted ${inserted}/${docs.length}`);
  }
  console.log('');
  return inserted;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected\n');

  if (process.argv.includes('--clear')) {
    const { deletedCount } = await Food.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCount} existing foods\n`);
  }

  let total = 0;
  total += await seedFromFile('./data/foundationFoods.json', 'foundation', 'FoundationFoods');
  total += await seedFromFile('./data/srLegacyFoods.json', 'sr_legacy', 'SRLegacyFoods');

  console.log(`\n✨ Done. Inserted ${total} foods total.`);

  console.log('📋 Syncing indexes (drops stale, creates new with weights)...');
  await Food.syncIndexes();
  console.log('✅ Indexes synced.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
