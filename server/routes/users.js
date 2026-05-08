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

    // Resolve effective values from request body OR existing user record (for reset flow).
    const effHeight   = height        ?? user.height;
    const effAge      = age           ?? user.age;
    const effSex      = sex           ?? user.sex;
    const effActivity = activityLevel ?? user.activityLevel;
    const effGoal     = goal          ?? user.goal;

    // Mifflin-St Jeor TDEE + macro breakdown — only if user hasn't customized targets
    if (!user.customTargets && weightValue && effHeight && effAge && effSex && effSex !== 'other') {
      const w = weightValue;
      const h = Number(effHeight);
      const a = Number(effAge);

      const bmr = effSex === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

      const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      let calories = bmr * (multipliers[effActivity] || 1.2);

      if (effGoal === 'lose') calories -= 500;
      if (effGoal === 'gain') calories += 300;
      calories = Math.round(calories);

      // Protein: 2g/kg when cutting or bulking, 1.6g/kg for maintenance
      const protein = Math.round(w * (effGoal === 'maintain' ? 1.6 : 2.0));
      // Fat: 25% of calories
      const fat = Math.round((calories * 0.25) / 9);
      // Carbs: whatever is left
      const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

      user.dailyCalorieGoal = calories;
      user.dailyProteinGoal = protein;
      user.dailyFatGoal     = fat;
      user.dailyCarbsGoal   = carbs;

      // Sync the displayed macro-split percentages with the auto-computed goals
      if (calories > 0) {
        user.macroSplit = {
          protein: Math.round((protein * 4 / calories) * 100),
          carbs:   Math.round((carbs   * 4 / calories) * 100),
          fat:     Math.round((fat     * 9 / calories) * 100),
        };
      }
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

router.put('/targets', isAuthenticated, async (req, res) => {
  try {
    const { calories, proteinPct, carbsPct, fatPct, reset } = req.body;
    const user = await User.findById(req.user._id);

    if (reset) {
      user.customTargets = false;
      await user.save();
      return res.json(user);
    }

    const cal = Number(calories);
    const pP  = Number(proteinPct);
    const pC  = Number(carbsPct);
    const pF  = Number(fatPct);
    if (!Number.isFinite(cal) || cal <= 0) return res.status(400).json({ error: 'calories must be > 0' });
    if (!Number.isFinite(pP) || !Number.isFinite(pC) || !Number.isFinite(pF)) {
      return res.status(400).json({ error: 'macro percentages required' });
    }
    if (Math.abs(pP + pC + pF - 100) > 0.5) {
      return res.status(400).json({ error: 'macro percentages must sum to 100' });
    }

    user.dailyCalorieGoal = Math.round(cal);
    user.dailyProteinGoal = Math.round((cal * pP / 100) / 4);
    user.dailyCarbsGoal   = Math.round((cal * pC / 100) / 4);
    user.dailyFatGoal     = Math.round((cal * pF / 100) / 9);
    user.macroSplit = { protein: pP, carbs: pC, fat: pF };
    user.customTargets = true;
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

const MICRO_KEYS = [
  'fiber', 'sugar', 'saturatedFat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'folate',
];

function buildTargetBreakdown(user) {
  const w = user.weightLog?.at(-1)?.value;
  const h = user.height;
  const a = user.age;
  if (!w || !h || !a || !user.sex || user.sex === 'other') return null;

  const bmr = user.sex === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const activityMult = multipliers[user.activityLevel] || 1.2;
  const tdee = bmr * activityMult;
  const goalAdjust = user.goal === 'lose' ? -500 : user.goal === 'gain' ? 300 : 0;

  return {
    weight: w,
    height: h,
    age: a,
    sex: user.sex,
    activityLevel: user.activityLevel,
    activityMult,
    goal: user.goal,
    goalAdjust,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    autoCalories: Math.round(tdee + goalAdjust),
  };
}

router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalMeals = await Meal.countDocuments({ user: req.user._id });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysMeals = await Meal.find({ user: req.user._id, loggedAt: { $gte: today } });

    const round1 = (n) => Math.round(n * 10) / 10;
    const sumKey = (k) => todaysMeals.reduce((s, m) => s + (m[k] || 0), 0);

    const todaysMicros = {};
    for (const k of MICRO_KEYS) todaysMicros[k] = round1(sumKey(k));

    res.json({
      currentWeight:    user.weightLog.at(-1)?.value,
      dailyCalorieGoal: user.dailyCalorieGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      dailyFatGoal:     user.dailyFatGoal,
      dailyCarbsGoal:   user.dailyCarbsGoal,
      macroSplit:       user.macroSplit || { protein: 30, carbs: 45, fat: 25 },
      customTargets:    !!user.customTargets,
      targetBreakdown:  buildTargetBreakdown(user),
      todaysCalories:   Math.round(sumKey('calories')),
      todaysProtein:    round1(sumKey('protein')),
      todaysFat:        round1(sumKey('fat')),
      todaysCarbs:      round1(sumKey('carbs')),
      todaysMicros,
      currentStreak:  user.currentStreak,
      longestStreak:  user.longestStreak,
      totalMeals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
