// Server-side baseline health score. Mirrors client/feed.js calcHealthScore
// so the feed endpoint can return a single algoScore that the rating-average
// blends against.

const CATEGORY_HEALTH = {
  'Vegetables and Vegetable Products': +5,
  'Fruits and Fruit Juices': +4,
  'Legumes and Legume Products': +4,
  'Finfish and Shellfish Products': +3,
  'Nut and Seed Products': +2,
  'Cereal Grains and Pasta': +1,
  'Poultry Products': +1,
  'Spices and Herbs': +1,
  'Dairy and Egg Products': 0,
  'Beef Products': 0,
  'Beverages': 0,
  'Lamb, Veal, and Game Products': 0,
  'Pork Products': -1,
  'Soups, Sauces, and Gravies': -1,
  'Baked Products': -2,
  'Fats and Oils': -2,
  'Snacks': -3,
  'Sausages and Luncheon Meats': -4,
  'Sweets': -5,
  'Fast Foods': -5,
  'Meals, Entrees, and Side Dishes': -2,
};

function calcHealthScore(meal) {
  // Prefer the AI-rated score when present; clamp to displayable range.
  if (typeof meal.healthScore === 'number') {
    return Math.max(5, Math.min(95, Math.round(meal.healthScore)));
  }
  const calories = meal.calories || 0;
  const protein = meal.protein || 0;
  const fat = meal.fat || 0;
  if (!calories) return null;

  const proteinPct = (protein * 4) / calories;
  const fatPct     = (fat * 9)     / calories;

  let score = 50;
  score += Math.min(proteinPct * 90, 35);

  if      (calories > 1100) score -= 30;
  else if (calories > 850)  score -= 18;
  else if (calories > 650)  score -= 8;

  if      (fatPct > 0.55) score -= 20;
  else if (fatPct > 0.40) score -= 12;
  else if (fatPct > 0.30) score -= 5;

  if (Array.isArray(meal.items) && meal.items.length > 0) {
    const totalGrams = meal.items.reduce((s, i) => s + (i.grams || 0), 0) || 1;
    let categoryBias = 0;
    let micrBias = 0;
    for (const item of meal.items) {
      const weight = (item.grams || 0) / totalGrams;
      categoryBias += (CATEGORY_HEALTH[item.category] || 0) * weight;
      if (item.calories > 0 && item.sugar) {
        const per100 = (item.sugar / item.calories) * 100;
        if      (per100 > 18) micrBias -= 3 * weight;
        else if (per100 > 12) micrBias -= 2 * weight;
      }
      if (item.calories > 0 && item.saturatedFat) {
        const per100 = (item.saturatedFat / item.calories) * 100;
        if (per100 > 5) micrBias -= 2 * weight;
      }
      if (item.calories > 0 && item.fiber) {
        const per100 = (item.fiber / item.calories) * 100;
        if (per100 > 3) micrBias += 2 * weight;
      }
    }
    score += categoryBias * 2.5;
    score += micrBias;
  }

  return Math.max(5, Math.min(95, Math.round(score)));
}

module.exports = { calcHealthScore };
