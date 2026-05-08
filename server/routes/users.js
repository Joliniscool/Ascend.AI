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
    const { age, sex, height, activityLevel, goal, weight } = req.body;

    const user = await User.findById(req.user._id);

    // Save weight entry if provided
    const weightValue = weight ? Number(weight) : user.weightLog.at(-1)?.value;
    if (weight) user.weightLog.push({ value: Number(weight) });

    // Mifflin-St Jeor TDEE + macro breakdown
    if (weightValue && height && age && sex && sex !== 'other') {
      const w = weightValue;
      const h = Number(height);
      const a = Number(age);

      const bmr = sex === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

      const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      let calories = bmr * (multipliers[activityLevel] || 1.2);

      if (goal === 'lose') calories -= 500;
      if (goal === 'gain') calories += 300;
      calories = Math.round(calories);

      // Protein: 2g/kg when cutting or bulking, 1.6g/kg for maintenance
      const protein = Math.round(w * (goal === 'maintain' ? 1.6 : 2.0));
      // Fat: 25% of calories
      const fat = Math.round((calories * 0.25) / 9);
      // Carbs: whatever is left
      const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

      user.dailyCalorieGoal = calories;
      user.dailyProteinGoal = protein;
      user.dailyFatGoal     = fat;
      user.dailyCarbsGoal   = carbs;
    }

    user.age           = age           || user.age;
    user.sex           = sex           || user.sex;
    user.height        = height        || user.height;
    user.activityLevel = activityLevel || user.activityLevel;
    user.goal          = goal          || user.goal;

    await user.save();
    res.json(user);
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
      currentWeight:    user.weightLog.at(-1)?.value,
      dailyCalorieGoal: user.dailyCalorieGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      dailyFatGoal:     user.dailyFatGoal,
      dailyCarbsGoal:   user.dailyCarbsGoal,
      todaysCalories,
      currentStreak:  user.currentStreak,
      longestStreak:  user.longestStreak,
      totalMeals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
