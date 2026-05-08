const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const isAuthenticated = require('../middleware/isAuthenticated');
const Meal = require('../models/Meal');
const User = require('../models/User');
const Food = require('../models/Food');

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

function suggestMealName(detectedItems) {
  const names = detectedItems.map(d => titleCase(d.food || '')).filter(Boolean);
  if (names.length === 0) return 'Meal';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} & More`;
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

router.post('/analyze', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const imageUrl = req.file.path;

    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Failed to fetch uploaded image (${imgResp.status})`);
    const imgBlob = await imgResp.blob();

    const mlForm = new FormData();
    mlForm.append('image', imgBlob, 'meal.jpg');

    const mlResp = await fetch(ML_SERVICE_URL, { method: 'POST', body: mlForm });
    if (!mlResp.ok) throw new Error(`ML service returned ${mlResp.status}`);
    const mlData = await mlResp.json();

    if (mlData.error) {
      return res.status(502).json({ error: 'ML service error', detail: mlData.error, imageUrl });
    }

    const detected = Array.isArray(mlData.items) ? mlData.items : [];

    const items = await Promise.all(detected.map(async (it) => ({
      detected: it.food,
      estimatedGrams: it.grams,
      candidates: await searchFoodCandidates(it.food, 5),
    })));

    res.json({ imageUrl, suggestedName: suggestMealName(detected), items });
  } catch (err) {
    console.error('Meal analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm', isAuthenticated, async (req, res) => {
  try {
    const { name, imageUrl, items, isPublic } = req.body;
    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'name and items required' });
    }

    const fdcIds = items.map(i => Number(i.fdcId)).filter(id => !Number.isNaN(id));
    const foods = await Food.find({ fdcId: { $in: fdcIds } }).lean();
    const foodMap = new Map(foods.map(f => [f.fdcId, f]));

    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    const mealItems = items.map(i => {
      const food = foodMap.get(Number(i.fdcId));
      if (!food) return null;
      const grams = Number(i.grams) || 0;
      const factor = grams / 100;
      const itemCals = (food.per100g.calories || 0) * factor;
      const itemProt = (food.per100g.protein  || 0) * factor;
      const itemCarb = (food.per100g.carbs    || 0) * factor;
      const itemFat  = (food.per100g.fat      || 0) * factor;
      totalCalories += itemCals;
      totalProtein  += itemProt;
      totalCarbs    += itemCarb;
      totalFat      += itemFat;
      return {
        fdcId: food.fdcId,
        name: food.shortName || food.name,
        grams,
        calories: Math.round(itemCals),
        protein:  Math.round(itemProt * 10) / 10,
        carbs:    Math.round(itemCarb * 10) / 10,
        fat:      Math.round(itemFat  * 10) / 10,
      };
    }).filter(Boolean);

    if (mealItems.length === 0) {
      return res.status(400).json({ error: 'No valid foods found for given fdcIds' });
    }

    const meal = await Meal.create({
      user:        req.user._id,
      name,
      imageUrl:    imageUrl || null,
      calories:    Math.round(totalCalories),
      protein:     Math.round(totalProtein * 10) / 10,
      carbs:       Math.round(totalCarbs   * 10) / 10,
      fat:         Math.round(totalFat     * 10) / 10,
      aiEstimated: true,
      userEdited:  true,
      isPublic:    isPublic !== false,
      items:       mealItems,
    });

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

router.get('/feed', isAuthenticated, async (req, res) => {
  try {
    const meals = await Meal.find({ isPublic: true }).populate('user', 'name avatar').sort({ loggedAt: -1 }).limit(30);
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;