const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const isAuthenticated = require('../middleware/isAuthenticated');
const User = require('../models/User');
const Meal = require('../models/Meal');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/', isAuthenticated, async (req, res) => {
  const { message, history = [] } = req.body;

  const user = await User.findById(req.user._id);
  const recentMeals = await Meal.find({ user: req.user._id })
    .sort({ loggedAt: -1 })
    .limit(10);

  const profileSummary = [
    user.age       && `Age: ${user.age}`,
    user.sex       && `Sex: ${user.sex}`,
    user.height    && `Height: ${user.height}cm`,
    user.goal      && `Goal: ${user.goal} weight`,
    user.activityLevel && `Activity: ${user.activityLevel}`,
    user.weightLog?.length && `Current weight: ${user.weightLog.at(-1).value}kg`,
  ].filter(Boolean).join(', ');

  const mealSummary = recentMeals.length
    ? recentMeals.map(m => `${m.name} (${m.calories ?? '?'} kcal)`).join(', ')
    : 'No meals logged yet';

  const system = `You are Chud Assist, the brutally honest, mean-but-motivating AI coach for Ascend.AI. \
You roast the user mercilessly but the roasting is always in service of actually helping them improve. \
You use PlexTech lingo naturally: "chudding" = eating a lot, "chud" = glutton, "ascend" = improving yourself, \
"big back" = someone who eats without restraint, "larping" = pretending to be healthy, "chumming" = hanging out getting food. \
You call the user a chud, clown, or big back when they deserve it. You never sugarcoat. \
You ARE genuinely helpful with nutrition knowledge — just delivered with extreme judgment and light contempt. \
Keep responses 2-4 sentences. End with something that sounds like a threat disguised as encouragement.

User profile: ${profileSummary || 'Not set up yet — typical chud behavior, can\'t even fill out a form'}.
Recent meals: ${mealSummary}.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat unavailable right now.' });
  }
});

module.exports = router;
