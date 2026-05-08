const router = require('express').Router();
const isAuthenticated = require('../middleware/isAuthenticated');
const User = require('../models/User');
const Meal = require('../models/Meal');

router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleId');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { age, sex, height, activityLevel, goal } = req.body;

    const user = await User.findById(req.user._id);
    const currentWeight = user.weightLog.at(-1)?.value;

    let dailyCalorieGoal = user.dailyCalorieGoal;
    if (currentWeight && height && age && sex && sex !== 'other') {
      const bmr = sex === 'male'
        ? 10 * currentWeight + 6.25 * height - 5 * age + 5
        : 10 * currentWeight + 6.25 * height - 5 * age - 161;

      const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      let tdee = bmr * (multipliers[activityLevel] || 1.2);

      if (goal === 'lose') tdee -= 500;
      if (goal === 'gain') tdee += 300;
      dailyCalorieGoal = Math.round(tdee);
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { age, sex, height, activityLevel, goal, ...(dailyCalorieGoal && { dailyCalorieGoal }) },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/weight', isAuthenticated, async (req, res) => {
  try {
    const { weight } = req.body;
    const user = await User.findById(req.user._id);
    user.weightLog.push({ value: weight });
    await user.save();
    res.json({ weightLog: user.weightLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalMeals = await Meal.countDocuments({ user: req.user._id });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysMeals = await Meal.find({ user: req.user._id, loggedAt: { $gte: today } });
    const todaysCalories = todaysMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    res.json({
      currentWeight: user.weightLog.at(-1)?.value,
      dailyCalorieGoal: user.dailyCalorieGoal,
      todaysCalories,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalMeals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;