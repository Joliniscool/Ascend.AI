const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const isAuthenticated = require('../middleware/isAuthenticated');
const Meal = require('../models/Meal');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, isPublic } = req.body;
    const meal = await Meal.create({
      user: req.user._id, name,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      calories: Number(calories), protein: Number(protein),
      carbs: Number(carbs), fat: Number(fat),
      isPublic: isPublic !== 'false', userEdited: true
    });
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

router.get('/feed', isAuthenticated, async (req, res) => {
  try {
    const meals = await Meal.find({ isPublic: true }).populate('user', 'name avatar').sort({ loggedAt: -1 }).limit(30);
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;