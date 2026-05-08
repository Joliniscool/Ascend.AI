const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const isAuthenticated = require('../middleware/isAuthenticated');
const Meal = require('../models/Meal');
const User = require('../models/User');

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

    try {
      const user = await User.findById(req.user._id);
      const today = new Date().toDateString();
      const lastLogged = user.lastLoggedDate ? new Date(user.lastLoggedDate).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastLogged !== today) {
        user.currentStreak = lastLogged === yesterday ? user.currentStreak + 1 : 1;
        user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
        user.lastLoggedDate = new Date();
        await user.save();
      }
    } catch (streakErr) {
      console.error('Streak update failed:', streakErr.message);
    }

    res.status(201).json(meal);
  } catch (err) {
    res.status(400).json({ error: err.message });
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