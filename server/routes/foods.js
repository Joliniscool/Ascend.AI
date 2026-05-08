const express = require('express');
const router = express.Router();
const Food = require('../models/Food');

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 25);

    if (!q) return res.json({ results: [] });

    const results = await Food.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    res.json({ results });
  } catch (err) {
    console.error('Food search error:', err);
    res.status(500).json({ error: 'Search failed' });
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
