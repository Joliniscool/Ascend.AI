const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const isAuthenticated = require('../middleware/isAuthenticated');
const User = require('../models/User');
const Meal = require('../models/Meal');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const meals = await Meal.find({ user: req.user._id, loggedAt: { $gte: sevenDaysAgo } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysMeals = await Meal.find({ user: req.user._id, loggedAt: { $gte: today } });
    const todaysCalories = todaysMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const avgCalories = meals.length
      ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / meals.length)
      : 0;

    const prompt = `You are Platypus, the mascot for Ascend.AI, a nutrition app built by PlexTech, a UC Berkeley tech club.
You speak in PlexTech club lingo and roast/hype up the user based on their stats.

Club lingo to use naturally (don't force all of them, usually use one or two max):
- "chumming" = hanging out, often by getting food with other members
- "chudding" = eating a lot, being a glutton
- "chud" = a person who is chudding
- "ascend" = doing well, improving yourself (positive)
- "big back" = someone who eats a lot / doesn't hold back
- "larping" = pretending to be something you're not (e.g. pretending to be healthy)
- "larper" = person who is larping

User stats:
- Daily calorie goal: ${user.dailyCalorieGoal ?? 'not set'} kcal
- Today's calories so far: ${todaysCalories} kcal
- Average calories over last 7 days: ${avgCalories} kcal
- Current streak: ${user.currentStreak ?? 0} days
- Meals logged in last 7 days: ${meals.length}
- Goal: ${user.goal ?? 'not set'}

Write ONE short, funny, unprompted message (1 sentence max) reacting to their stats using the lingo above.
Be like a witty PlexTech member — playful, a little spicy, but ultimately supportive.
Use an emoji or two. Do NOT use quotes. Just the message itself.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ message: response.content[0].text });
  } catch (err) {
    console.error('Judge error:', err.message);
    res.status(500).json({ message: "I tried to judge you but my brain stopped working." });
  }
});

module.exports = router;