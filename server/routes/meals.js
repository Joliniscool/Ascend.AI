const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const isAuthenticated = require('../middleware/isAuthenticated');
const Meal = require('../models/Meal');
const User = require('../models/User');
const Food = require('../models/Food');
const Rating = require('../models/Rating');
const { calcHealthScore } = require('../utils/healthScore');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL
  || 'https://chdeng--food-ml-service-fastapi-app.modal.run/analyze';

async function updateStreak(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const today = new Date().toDateString();
    const lastLogged = user.lastLoggedDate ? new Date(user.lastLoggedDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastLogged !== today) {
      user.currentStreak = lastLogged === yesterday ? user.currentStreak + 1 : 1;
      user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
      user.lastLoggedDate = new Date();
      await user.save();
    }
  } catch (err) {
    console.error('Streak update failed:', err.message);
  }
}

async function searchFoodCandidates(query, limit = 5) {
  if (!query) return [];
  return Food.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
}

function titleCase(s) {
  if (!s) return '';
  return s.split(/\s+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
    .join(' ');
}

function suggestMealName(items) {
  const sorted = [...items]
    .filter(i => i && i.detected)
    .sort((a, b) => {
      const aProt = a.candidates?.[0]?.per100g?.protein ?? 0;
      const bProt = b.candidates?.[0]?.per100g?.protein ?? 0;
      return bProt - aProt;
    });

  const names = sorted.map(i => titleCase(i.detected)).filter(Boolean);
  if (names.length === 0) return 'Meal';
  if (names.length === 1) return names[0];

  const main = names[0];
  const sides = names.slice(1);
  if (sides.length === 1) return `${main} Bowl with ${sides[0]}`;
  if (sides.length === 2) return `${main} Bowl with ${sides[0]} & ${sides[1]}`;
  return `${main} Bowl with ${sides[0]}, ${sides[1]} & More`;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ascend-ai/meals',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Separate in-memory multer for /analyze — reads file to RAM first, then we
// explicitly upload to Cloudinary AND forward to Modal in parallel. Avoids
// multer holding the connection open during Cloudinary streaming.
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function uploadBufferToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ascend-ai/meals',
        resource_type: 'image',
        transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, isPublic } = req.body;
    const meal = await Meal.create({
      user: req.user._id, name,
      imageUrl: req.file ? req.file.path : null,
      calories: Number(calories), protein: Number(protein),
      carbs: Number(carbs), fat: Number(fat),
      isPublic: isPublic !== 'false', userEdited: true
    });
    await updateStreak(req.user._id);
    res.status(201).json(meal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/analyze', isAuthenticated, memoryUpload.single('image'), async (req, res) => {
  const t0 = Date.now();
  const log = (msg) => console.log(`[analyze +${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);
  try {
    log('start');
    if (!req.file?.buffer) return res.status(400).json({ error: 'Image required' });
    log(`multer (memory) done — buffer ${req.file.buffer.length} bytes, type=${req.file.mimetype}`);

    const mlForm = new FormData();
    const mlBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'image/jpeg' });
    mlForm.append('image', mlBlob, 'meal.jpg');

    log('starting parallel Cloudinary upload + Modal POST');
    const [cloudinaryResult, mlResp] = await Promise.all([
      uploadBufferToCloudinary(req.file.buffer, req.file.mimetype),
      fetch(ML_SERVICE_URL, { method: 'POST', body: mlForm }),
    ]);
    log(`Cloudinary: ${cloudinaryResult.secure_url}`);
    log(`Modal status: ${mlResp.status}`);

    const imageUrl = cloudinaryResult.secure_url;
    if (!mlResp.ok) throw new Error(`ML service returned ${mlResp.status}`);
    const mlData = await mlResp.json();
    log(`ML returned ${mlData.items?.length ?? 0} items`);

    if (mlData.error) {
      return res.status(502).json({ error: 'ML service error', detail: mlData.error, imageUrl });
    }

    const detected = Array.isArray(mlData.items) ? mlData.items : [];

    const items = await Promise.all(detected.map(async (it) => ({
      detected: it.food,
      estimatedGrams: it.grams,
      candidates: await searchFoodCandidates(it.food, 5),
    })));

    log(`done — sending response (healthScore=${mlData.healthScore})`);
    res.json({
      imageUrl,
      suggestedName: suggestMealName(items),
      items,
      healthScore: mlData.healthScore ?? null,
      healthReasoning: mlData.healthReasoning ?? null,
    });
  } catch (err) {
    log(`ERROR after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${err.message}`);
    console.error('Meal analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm', isAuthenticated, async (req, res) => {
  try {
    const { name, imageUrl, items, isPublic, healthScore, healthReasoning } = req.body;
    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'name and items required' });
    }

    const fdcIds = items.map(i => Number(i.fdcId)).filter(id => !Number.isNaN(id));
    // USDA foods are public; custom foods only resolve for their owner.
    const foods = await Food.find({
      fdcId: { $in: fdcIds },
      $or: [
        { dataType: { $ne: 'custom' } },
        { dataType: 'custom', userId: req.user._id },
      ],
    }).lean();
    const foodMap = new Map(foods.map(f => [f.fdcId, f]));

    const MICRO_KEYS = [
      'fiber', 'sugar', 'saturatedFat', 'cholesterol',
      'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
      'vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'folate',
    ];
    const round1 = (n) => Math.round(n * 10) / 10;

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const k of MICRO_KEYS) totals[k] = 0;

    const mealItems = items.map(i => {
      const food = foodMap.get(Number(i.fdcId));
      if (!food) return null;
      const grams  = Number(i.grams) || 0;
      const factor = grams / 100;
      const itemCals = (food.per100g.calories || 0) * factor;
      const itemProt = (food.per100g.protein  || 0) * factor;
      const itemCarb = (food.per100g.carbs    || 0) * factor;
      const itemFat  = (food.per100g.fat      || 0) * factor;
      totals.calories += itemCals;
      totals.protein  += itemProt;
      totals.carbs    += itemCarb;
      totals.fat      += itemFat;

      const item = {
        fdcId: food.fdcId,
        name: food.shortName || food.name,
        category: food.category,
        grams,
        calories: Math.round(itemCals),
        protein:  round1(itemProt),
        carbs:    round1(itemCarb),
        fat:      round1(itemFat),
      };
      for (const k of MICRO_KEYS) {
        const v = (food.per100g[k] || 0) * factor;
        totals[k] += v;
        item[k] = round1(v);
      }
      return item;
    }).filter(Boolean);

    if (mealItems.length === 0) {
      return res.status(400).json({ error: 'No valid foods found for given fdcIds' });
    }

    const mealDoc = {
      user:        req.user._id,
      name,
      imageUrl:    imageUrl || null,
      calories:    Math.round(totals.calories),
      protein:     round1(totals.protein),
      carbs:       round1(totals.carbs),
      fat:         round1(totals.fat),
      aiEstimated: true,
      userEdited:  true,
      isPublic:    isPublic !== false,
      items:       mealItems,
      healthScore:     (typeof healthScore === 'number' && healthScore >= 0 && healthScore <= 100)
                         ? Math.round(healthScore) : undefined,
      healthReasoning: typeof healthReasoning === 'string' ? healthReasoning : undefined,
    };
    for (const k of MICRO_KEYS) mealDoc[k] = round1(totals[k]);
    const meal = await Meal.create(mealDoc);

    await updateStreak(req.user._id);
    res.status(201).json(meal);
  } catch (err) {
    console.error('Meal confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const meals = await Meal.find({ user: req.user._id }).sort({ loggedAt: -1 }).limit(50);
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meals/feed
// ─────────────────────────────────────────────────────────────────────────────
// Public meals (most recent 30) enriched with crowdsourced rating data so each
// feed card can render: the user's own platypus position, the small community-
// average dot, the count of ratings, and a tier label — all without N+1 query
// patterns. Three Mongo round-trips total: meals, rating-aggregates, my-rating.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/feed', isAuthenticated, async (req, res) => {
  try {
    const meals = await Meal.find({ isPublic: true })
      .populate('user', 'name avatar')
      .sort({ loggedAt: -1 })
      .limit(30)
      .lean();
    if (meals.length === 0) return res.json([]);

    const mealIds = meals.map(m => m._id);

    // Single aggregation pipeline groups all ratings for the 30 visible meals.
    // Cheaper than 30 separate Rating.find().count() pairs by ~30x.
    const aggResults = await Rating.aggregate([
      { $match: { meal: { $in: mealIds } } },
      { $group: {
          _id: '$meal',
          ratingSum:   { $sum: '$score' },
          ratingCount: { $sum: 1 },
      } },
    ]);
    const aggByMeal = new Map(aggResults.map(r => [String(r._id), r]));

    // Pull the current user's own ratings in one query so we can render their
    // platypus marker at the right position without a per-card fetch.
    const myRatings = await Rating.find({
      meal: { $in: mealIds }, user: req.user._id,
    }).select('meal score').lean();
    const mineByMeal = new Map(myRatings.map(r => [String(r.meal), r.score]));

    // Compose the displayed (community) score per meal:
    //   displayScore = (algoScore + Σ userRatings) / (1 + ratingCount)
    // Treating algoScore as a fixed extra voter prevents low-volume thrash —
    // a single 5/100 rating from one user shouldn't flip a meal's tier alone.
    const enriched = meals.map(m => {
      const algo        = calcHealthScore(m);
      const agg         = aggByMeal.get(String(m._id));
      const ratingSum   = agg?.ratingSum   || 0;
      const ratingCount = agg?.ratingCount || 0;
      const myRating    = mineByMeal.get(String(m._id)) ?? null;
      const displayScore = algo == null
        ? null
        : Math.round((algo + ratingSum) / (1 + ratingCount));
      const userAvg = ratingCount > 0 ? Math.round(ratingSum / ratingCount) : null;
      return {
        ...m,
        algoScore:    algo,
        userAvgScore: userAvg,
        ratingCount,
        myRating,
        displayScore,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Feed fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meals/:id/rate    body: { score: 0..100 }
// ─────────────────────────────────────────────────────────────────────────────
// Upsert the caller's rating for a meal. The compound (meal, user) unique
// index on Rating means findOneAndUpdate({...}, {...}, { upsert: true })
// becomes the natural way to express "create-or-update one rating per user
// per meal" — no race condition between check-then-create.
//
// Recomputes the meal's display score on the fly and returns the values the
// client needs to update the bar in place (no full feed reload).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/rate', isAuthenticated, async (req, res) => {
  try {
    const score = Math.round(Number(req.body?.score));
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be 0–100' });
    }
    const meal = await Meal.findOne({ _id: req.params.id, isPublic: true }).lean();
    if (!meal) return res.status(404).json({ error: 'meal not found' });

    await Rating.findOneAndUpdate(
      { meal: meal._id, user: req.user._id },
      { score, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Recompute aggregates for this meal so the client gets fresh display values.
    const [agg] = await Rating.aggregate([
      { $match: { meal: meal._id } },
      { $group: { _id: '$meal', sum: { $sum: '$score' }, count: { $sum: 1 } } },
    ]);
    const algo = calcHealthScore(meal);
    const ratingSum   = agg?.sum   || 0;
    const ratingCount = agg?.count || 0;

    res.json({
      myRating:     score,
      ratingCount,
      userAvgScore: ratingCount > 0 ? Math.round(ratingSum / ratingCount) : null,
      displayScore: algo == null ? null : Math.round((algo + ratingSum) / (1 + ratingCount)),
    });
  } catch (err) {
    console.error('Rating upsert error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/rate', isAuthenticated, async (req, res) => {
  try {
    await Rating.deleteOne({ meal: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;