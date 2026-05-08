// ─────────────────────────────────────────────────────────────────────────────
// Foods API
// ─────────────────────────────────────────────────────────────────────────────
// Read-side: USDA FoundationFoods + SR-Legacy entries plus per-user custom
// foods. Custom foods live in the same `foods` collection as USDA data — they
// just have dataType: 'custom' and a userId. fdcIds for customs are negative
// (allocated as 1 less than the lowest existing custom) which guarantees no
// collision with USDA's positive ID space.
//
// Search is partially-public: anonymous callers see USDA only; authenticated
// callers see USDA + their own customs (never anyone else's).
// Write-side (custom foods only) requires auth.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const isAuthenticated = require('../middleware/isAuthenticated');

// Whitelist of nutrient fields a custom food can carry (drives both validation
// and sanitization — anything not in this list silently drops).
const CUSTOM_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'saturatedFat', 'cholesterol', 'sodium', 'potassium',
  'calcium', 'iron', 'magnesium', 'zinc', 'phosphorus',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'folate',
];

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 25);
    if (!q) return res.json({ results: [] });

    // Public foods (USDA): visible to everyone.
    // Custom foods: only visible to the user who created them.
    const userId = req.user?._id;
    const visibility = userId
      ? { $or: [{ dataType: { $ne: 'custom' } }, { dataType: 'custom', userId }] }
      : { dataType: { $ne: 'custom' } };

    const results = await Food.find(
      { $and: [{ $text: { $search: q } }, visibility] },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    // Bubble user's custom foods to the top of the list — their own items are
    // almost always more relevant than a USDA name match.
    results.sort((a, b) => {
      const aCustom = a.dataType === 'custom' ? 1 : 0;
      const bCustom = b.dataType === 'custom' ? 1 : 0;
      return bCustom - aCustom;
    });

    res.json({ results });
  } catch (err) {
    console.error('Food search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/custom', isAuthenticated, async (req, res) => {
  try {
    const { name, per100g } = req.body;
    const trimmed = (name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'name required' });
    if (trimmed.length > 80) return res.status(400).json({ error: 'name too long (max 80 chars)' });

    const cals = Number(per100g?.calories);
    if (!Number.isFinite(cals) || cals <= 0 || cals > 1000) {
      return res.status(400).json({ error: 'calories per 100g must be between 1 and 1000' });
    }

    const cleaned = {};
    for (const k of CUSTOM_KEYS) {
      const v = Number(per100g?.[k]);
      cleaned[k] = Number.isFinite(v) && v >= 0 ? v : 0;
    }

    // Sanity check: macros shouldn't exceed 100g per 100g of food.
    if (cleaned.protein + cleaned.carbs + cleaned.fat > 105) {
      return res.status(400).json({ error: 'protein + carbs + fat cannot exceed ~100g per 100g' });
    }

    // Find next negative fdcId (1 less than the lowest existing custom food).
    // Negative IDs ensure no collision with USDA's positive ID space.
    const lowest = await Food.findOne({ fdcId: { $lt: 0 } }).sort({ fdcId: 1 }).lean();
    const fdcId = (lowest?.fdcId ?? 0) - 1;

    const food = await Food.create({
      fdcId,
      name: trimmed,
      primaryName: trimmed.toLowerCase(),
      shortName: trimmed,
      category: 'Custom',
      dataType: 'custom',
      userId: req.user._id,
      per100g: cleaned,
    });

    res.status(201).json(food);
  } catch (err) {
    console.error('Custom food create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/custom/:fdcId', isAuthenticated, async (req, res) => {
  try {
    const fdcId = parseInt(req.params.fdcId, 10);
    if (Number.isNaN(fdcId) || fdcId >= 0) return res.status(400).json({ error: 'invalid id' });
    const result = await Food.findOneAndDelete({
      fdcId, dataType: 'custom', userId: req.user._id,
    });
    if (!result) return res.status(404).json({ error: 'custom food not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:fdcId', async (req, res) => {
  try {
    const fdcId = parseInt(req.params.fdcId, 10);
    if (Number.isNaN(fdcId)) return res.status(400).json({ error: 'Invalid fdcId' });

    const food = await Food.findOne({ fdcId }).lean();
    if (!food) return res.status(404).json({ error: 'Food not found' });

    res.json(food);
  } catch (err) {
    console.error('Food lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

module.exports = router;
