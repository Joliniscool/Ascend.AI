// Shared nutrition helpers used by dashboard, trainer, feed, meals, meal-details.

// FDA Daily Values for adults — limit-style values (sodium, satFat, sugar, cholesterol)
// are tracked but considered better when LOWER, all others when HIGHER.
const DV = {
  fiber:        { amount: 28,   unit: 'g',   limit: false },
  sodium:       { amount: 2300, unit: 'mg',  limit: true  },
  potassium:    { amount: 4700, unit: 'mg',  limit: false },
  calcium:      { amount: 1300, unit: 'mg',  limit: false },
  iron:         { amount: 18,   unit: 'mg',  limit: false },
  magnesium:    { amount: 420,  unit: 'mg',  limit: false },
  zinc:         { amount: 11,   unit: 'mg',  limit: false },
  vitaminA:     { amount: 900,  unit: 'µg',  limit: false },
  vitaminC:     { amount: 90,   unit: 'mg',  limit: false },
  vitaminD:     { amount: 20,   unit: 'µg',  limit: false },
  vitaminB12:   { amount: 2.4,  unit: 'µg',  limit: false },
  folate:       { amount: 400,  unit: 'µg',  limit: false },
  saturatedFat: { amount: 20,   unit: 'g',   limit: true  },
  sugar:        { amount: 50,   unit: 'g',   limit: true  },
  cholesterol:  { amount: 300,  unit: 'mg',  limit: true  },
};

// Nutrients surfaced on the dashboard "Micronutrient Breakdown" panel.
// Cholesterol + sugar lead because they're the most-actionable "limit" trackers
// for a college-aged user; technically not micros but the limit-style %DV
// display is the same shape, so they're folded into this list.
const DASHBOARD_MICROS = [
  { key: 'cholesterol', icon: '🥚', label: 'Cholesterol', color: '#f87171' },
  { key: 'sugar',       icon: '🍬', label: 'Sugar',       color: '#f9a8d4' },
  { key: 'fiber',       icon: '🌾', label: 'Fiber',       color: '#86efac' },
  { key: 'sodium',      icon: '🧂', label: 'Sodium',      color: '#fda4af' },
  { key: 'potassium',   icon: '🍌', label: 'Potassium',   color: '#fbbf24' },
  { key: 'calcium',     icon: '🥛', label: 'Calcium',     color: '#bae6fd' },
  { key: 'iron',        icon: '🩸', label: 'Iron',        color: '#fb7185' },
  { key: 'magnesium',   icon: '🥬', label: 'Magnesium',   color: '#a7f3d0' },
  { key: 'vitaminA',    icon: '🥕', label: 'Vit A',       color: '#fdba74' },
  { key: 'vitaminC',    icon: '🍊', label: 'Vit C',       color: '#fcd34d' },
  { key: 'vitaminD',    icon: '☀️', label: 'Vit D',       color: '#fef08a' },
  { key: 'vitaminB12',  icon: '🐟', label: 'Vit B12',     color: '#c4b5fd' },
];

// Round to 1 decimal, drop trailing .0 for clean display.
function fmt1(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0';
  const r = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function fmtPct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function dvPct(key, amount) {
  const dv = DV[key];
  if (!dv || !amount) return 0;
  return Math.round((amount / dv.amount) * 100);
}

// Compute how today's calorie split compares vs goal split.
function macroPctOfCalories(p, c, f) {
  const total = (p * 4) + (c * 4) + (f * 9);
  if (!total) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((p * 4 / total) * 100),
    carbs:   Math.round((c * 4 / total) * 100),
    fat:     Math.round((f * 9 / total) * 100),
  };
}

// Highlight rules for meal cards.
// Returns:
//   highProtein: bool                  — protein-density signal (ratio-based)
//   highMicros:  [{key, label, dvPct}] — meal is high in a "good" micro (≥30% DV)
//   badMicros:   [{key, label, dvPct}] — meal is high in a "limit" micro (≥30% DV)
// Both micro arrays are capped at top 2 to keep cards uncluttered.
function mealHighlights(meal) {
  const out = { highProtein: false, highMicros: [], badMicros: [] };
  if (meal.calories > 0 && meal.protein != null) {
    // ≥ 1.5g protein per 10kcal = ~10g per 100kcal = strongly protein-leaning.
    const proteinPer100 = (meal.protein / meal.calories) * 100;
    if (proteinPer100 >= 10) out.highProtein = true;
  }
  for (const m of DASHBOARD_MICROS) {
    const v = meal[m.key];
    if (!v || !DV[m.key]) continue;
    const pct = dvPct(m.key, v);
    if (pct < 30) continue;
    const entry = { key: m.key, label: m.label, dvPct: pct };
    if (DV[m.key].limit) out.badMicros.push(entry);
    else                 out.highMicros.push(entry);
  }
  out.highMicros = out.highMicros.sort((a, b) => b.dvPct - a.dvPct).slice(0, 2);
  out.badMicros  = out.badMicros .sort((a, b) => b.dvPct - a.dvPct).slice(0, 2);
  return out;
}

function microCellHtml(m, amount, pct, ringColor, dv) {
  const R = 14;
  const C = 2 * Math.PI * R;
  const ringPct = Math.min(100, pct);
  const offset = C * (1 - ringPct / 100);
  return `
    <div class="micro-cell">
      <div class="micro-ring-wrap">
        <svg width="100%" height="100%" viewBox="0 0 38 38" preserveAspectRatio="xMidYMid meet">
          <circle cx="19" cy="19" r="${R}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3.5"/>
          <circle cx="19" cy="19" r="${R}" fill="none" stroke="${ringColor}" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${offset}"
            transform="rotate(-90 19 19)"/>
        </svg>
        <div class="micro-ring-center"><span class="micro-emoji">${m.icon}</span></div>
      </div>
      <div class="micro-text">
        <div class="micro-label">${m.label}</div>
        <div class="micro-row2">
          <span class="micro-pct" style="color:${ringColor}">${pct}%</span>
          <span class="micro-amount">${fmt1(amount)}${dv?.unit || ''}</span>
        </div>
      </div>
    </div>
  `;
}

function microCellsHtml(todaysMicros) {
  return DASHBOARD_MICROS.map(m => {
    const amount = todaysMicros[m.key] || 0;
    const pct = dvPct(m.key, amount);
    const dv = DV[m.key];
    const isLimit = dv?.limit;
    const ringColor = isLimit && pct > 100 ? '#fda4af' : m.color;
    return microCellHtml(m, amount, pct, ringColor, dv);
  }).join('');
}

// Absolute-amount thresholds for macro tag coloring (per single meal).
// Distinct from `mealHighlights` (ratio-based) — this is "is this meal
// objectively high in protein/fat regardless of total calories?"
const MACRO_TAG_THRESHOLDS = {
  proteinHigh: 40,
  fatHigh:     40,
};

function macroTagsHtml(meal) {
  const cals = meal.calories;
  const p = meal.protein, c = meal.carbs, f = meal.fat;
  const pCls = (p || 0) >= MACRO_TAG_THRESHOLDS.proteinHigh ? ' macro-high-protein' : '';
  const fCls = (f || 0) >= MACRO_TAG_THRESHOLDS.fatHigh     ? ' macro-high-fat'     : '';
  return [
    cals ? `<span class="macro">🔥 ${fmt1(cals)} kcal</span>` : '',
    p    ? `<span class="macro${pCls}">💪 ${fmt1(p)}g protein</span>` : '',
    c    ? `<span class="macro">🌾 ${fmt1(c)}g carbs</span>` : '',
    f    ? `<span class="macro${fCls}">🧈 ${fmt1(f)}g fat</span>` : '',
  ].filter(Boolean).join('');
}

window.NUTRITION = {
  DV, DASHBOARD_MICROS, MACRO_TAG_THRESHOLDS,
  fmt1, fmtPct, dvPct, macroPctOfCalories, mealHighlights,
  microCellHtml, microCellsHtml, macroTagsHtml,
};
