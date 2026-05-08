const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const isAuthenticated = require('../middleware/isAuthenticated');
const Meal = require('../models/Meal');
const User = require('../models/User');

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

    // Update streak
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