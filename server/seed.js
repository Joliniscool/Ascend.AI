require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Meal = require('./models/Meal');

function daysAgo(n, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const userData = [
  {
    googleId: 'seed_kelley',
    name: 'Kelley',
    email: 'kelley@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Kelley&background=ff7c4a&color=fff&size=128&rounded=true',
    age: 21, sex: 'female', height: 165, activityLevel: 'moderate', goal: 'maintain',
    weightLog: [{ value: 58, date: daysAgo(30) }, { value: 57.5, date: daysAgo(7) }],
    dailyCalorieGoal: 1900, currentStreak: 5, longestStreak: 12, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_sarvagya',
    name: 'Sarvagya',
    email: 'sarvagya@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Sarvagya&background=7c4aff&color=fff&size=128&rounded=true',
    age: 21, sex: 'male', height: 178, activityLevel: 'active', goal: 'gain',
    weightLog: [{ value: 70, date: daysAgo(30) }, { value: 72, date: daysAgo(5) }],
    dailyCalorieGoal: 2700, currentStreak: 3, longestStreak: 8, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_dylan',
    name: 'Dylan',
    email: 'dylan@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Dylan&background=4a8fff&color=fff&size=128&rounded=true',
    age: 20, sex: 'male', height: 180, activityLevel: 'moderate', goal: 'maintain',
    weightLog: [{ value: 75, date: daysAgo(14) }],
    dailyCalorieGoal: 2400, currentStreak: 2, longestStreak: 6, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_merrick',
    name: 'Merrick',
    email: 'merrick@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Merrick&background=30c97a&color=fff&size=128&rounded=true',
    age: 22, sex: 'male', height: 175, activityLevel: 'light', goal: 'lose',
    weightLog: [{ value: 82, date: daysAgo(30) }, { value: 80.5, date: daysAgo(10) }],
    dailyCalorieGoal: 1800, currentStreak: 1, longestStreak: 4, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_yash',
    name: 'Yash',
    email: 'yash@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Yash&background=ff9f30&color=fff&size=128&rounded=true',
    age: 21, sex: 'male', height: 172, activityLevel: 'active', goal: 'maintain',
    weightLog: [{ value: 68, date: daysAgo(20) }],
    dailyCalorieGoal: 2500, currentStreak: 4, longestStreak: 9, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_lucas',
    name: 'Lucas',
    email: 'lucas@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Lucas&background=e8303a&color=fff&size=128&rounded=true',
    age: 20, sex: 'male', height: 183, activityLevel: 'very_active', goal: 'gain',
    weightLog: [{ value: 80, date: daysAgo(30) }, { value: 82, date: daysAgo(3) }],
    dailyCalorieGoal: 3200, currentStreak: 6, longestStreak: 6, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_andy',
    name: 'Andy',
    email: 'andy@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Andy&background=c030e8&color=fff&size=128&rounded=true',
    age: 21, sex: 'male', height: 176, activityLevel: 'moderate', goal: 'maintain',
    weightLog: [{ value: 73, date: daysAgo(14) }],
    dailyCalorieGoal: 2400, currentStreak: 2, longestStreak: 7, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_owen',
    name: 'Owen L.',
    email: 'owen@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Owen+L&background=30b8e8&color=fff&size=128&rounded=true',
    age: 22, sex: 'male', height: 177, activityLevel: 'light', goal: 'maintain',
    weightLog: [{ value: 74, date: daysAgo(10) }],
    dailyCalorieGoal: 2300, currentStreak: 1, longestStreak: 5, lastLoggedDate: daysAgo(1),
  },
  {
    googleId: 'seed_kat',
    name: 'Kat',
    email: 'kat@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Kat&background=ff4da6&color=fff&size=128&rounded=true',
    age: 20, sex: 'female', height: 163, activityLevel: 'moderate', goal: 'maintain',
    weightLog: [{ value: 55, date: daysAgo(14) }],
    dailyCalorieGoal: 1850, currentStreak: 3, longestStreak: 10, lastLoggedDate: daysAgo(0),
  },
  {
    googleId: 'seed_henry',
    name: 'Henry S.',
    email: 'henry@plextech.berkeley.edu',
    avatar: 'https://ui-avatars.com/api/?name=Henry+S&background=5e8c31&color=fff&size=128&rounded=true',
    age: 21, sex: 'male', height: 180, activityLevel: 'active', goal: 'gain',
    weightLog: [{ value: 75, date: daysAgo(30) }, { value: 77, date: daysAgo(5) }],
    dailyCalorieGoal: 2800, currentStreak: 4, longestStreak: 11, lastLoggedDate: daysAgo(0),
  },
];

// Meals keyed by googleId
const mealsByUser = {
  seed_kelley: [
    { name: 'Acai bowl', calories: 450, protein: 8, carbs: 82, fat: 12, loggedAt: daysAgo(2, 9) },
    { name: 'Chipotle chicken burrito bowl', calories: 720, protein: 48, carbs: 78, fat: 22, loggedAt: daysAgo(2, 13) },
    { name: 'Pad Thai', calories: 580, protein: 18, carbs: 72, fat: 20, loggedAt: daysAgo(1, 19) },
    { name: 'Greek yogurt + granola', calories: 280, protein: 14, carbs: 38, fat: 7, loggedAt: daysAgo(0, 8) },
    { name: 'Sweetgreen harvest bowl', calories: 510, protein: 26, carbs: 52, fat: 18, loggedAt: daysAgo(0, 13) },
  ],
  seed_sarvagya: [
    { name: 'Protein shake + banana', calories: 420, protein: 35, carbs: 52, fat: 8, loggedAt: daysAgo(3, 7) },
    { name: 'Dining hall pasta bolognese', calories: 680, protein: 32, carbs: 85, fat: 18, loggedAt: daysAgo(3, 12) },
    { name: 'Double smash burger', calories: 850, protein: 45, carbs: 60, fat: 42, loggedAt: daysAgo(2, 19) },
    { name: 'Overnight oats', calories: 380, protein: 12, carbs: 58, fat: 10, loggedAt: daysAgo(1, 8) },
    { name: 'Chipotle double chicken bowl', calories: 920, protein: 72, carbs: 85, fat: 26, loggedAt: daysAgo(1, 13) },
    { name: 'Chicken stir fry with rice', calories: 650, protein: 42, carbs: 70, fat: 16, loggedAt: daysAgo(0, 19) },
  ],
  seed_dylan: [
    { name: 'Scrambled eggs + toast', calories: 380, protein: 24, carbs: 32, fat: 18, loggedAt: daysAgo(4, 9) },
    { name: 'Cava grain bowl', calories: 620, protein: 35, carbs: 68, fat: 20, loggedAt: daysAgo(4, 13) },
    { name: 'Late night pizza (3 slices)', calories: 780, protein: 33, carbs: 88, fat: 30, loggedAt: daysAgo(3, 23) },
    { name: 'Smoothie bowl', calories: 420, protein: 10, carbs: 72, fat: 12, loggedAt: daysAgo(2, 10) },
    { name: 'Ippudo ramen', calories: 720, protein: 28, carbs: 88, fat: 24, loggedAt: daysAgo(2, 19) },
    { name: 'Boba milk tea', calories: 320, protein: 4, carbs: 58, fat: 8, loggedAt: daysAgo(1, 15) },
  ],
  seed_merrick: [
    { name: 'Avocado toast + eggs', calories: 420, protein: 18, carbs: 38, fat: 22, loggedAt: daysAgo(5, 9) },
    { name: 'Chicken salad', calories: 380, protein: 32, carbs: 22, fat: 14, loggedAt: daysAgo(5, 13) },
    { name: 'In-N-Out Double Double + fries', calories: 1020, protein: 38, carbs: 78, fat: 56, loggedAt: daysAgo(4, 19) },
    { name: 'Protein bar', calories: 200, protein: 20, carbs: 20, fat: 6, loggedAt: daysAgo(3, 16) },
    { name: 'Subway turkey sandwich', calories: 480, protein: 28, carbs: 56, fat: 12, loggedAt: daysAgo(2, 13) },
    { name: 'Dining hall chicken + veggies', calories: 520, protein: 38, carbs: 42, fat: 16, loggedAt: daysAgo(0, 19) },
  ],
  seed_yash: [
    { name: 'Masala omelette + chai', calories: 360, protein: 18, carbs: 22, fat: 22, loggedAt: daysAgo(3, 8) },
    { name: 'Chipotle steak bowl', calories: 680, protein: 42, carbs: 76, fat: 20, loggedAt: daysAgo(3, 13) },
    { name: 'Dal and rice', calories: 520, protein: 18, carbs: 88, fat: 10, loggedAt: daysAgo(2, 19) },
    { name: 'Banana + almond butter', calories: 280, protein: 6, carbs: 38, fat: 12, loggedAt: daysAgo(1, 15) },
    { name: 'Sushi platter (12 pcs)', calories: 620, protein: 30, carbs: 80, fat: 12, loggedAt: daysAgo(0, 13) },
    { name: 'Mango lassi', calories: 240, protein: 6, carbs: 44, fat: 5, loggedAt: daysAgo(0, 20) },
  ],
  seed_lucas: [
    { name: '5-egg scramble + hashbrowns', calories: 580, protein: 34, carbs: 48, fat: 28, loggedAt: daysAgo(2, 8) },
    { name: 'Chipotle triple chicken bowl', calories: 1050, protein: 82, carbs: 88, fat: 28, loggedAt: daysAgo(2, 13) },
    { name: 'Ribeye steak + sweet potato', calories: 820, protein: 55, carbs: 48, fat: 38, loggedAt: daysAgo(2, 19) },
    { name: 'Post-workout protein shake', calories: 320, protein: 48, carbs: 12, fat: 6, loggedAt: daysAgo(1, 17) },
    { name: "Gordo's burrito", calories: 890, protein: 42, carbs: 98, fat: 32, loggedAt: daysAgo(1, 13) },
    { name: 'Big bowl of oatmeal + fruit', calories: 420, protein: 12, carbs: 72, fat: 8, loggedAt: daysAgo(0, 8) },
  ],
  seed_andy: [
    { name: 'Bagel + cream cheese', calories: 380, protein: 12, carbs: 52, fat: 14, loggedAt: daysAgo(4, 9) },
    { name: 'Koreana lunch special', calories: 650, protein: 30, carbs: 72, fat: 22, loggedAt: daysAgo(4, 13) },
    { name: 'Yogurt Park froyo', calories: 280, protein: 6, carbs: 52, fat: 4, loggedAt: daysAgo(3, 16) },
    { name: 'Dining hall stir fry', calories: 580, protein: 28, carbs: 68, fat: 18, loggedAt: daysAgo(2, 19) },
    { name: 'Acai bowl', calories: 440, protein: 8, carbs: 78, fat: 12, loggedAt: daysAgo(0, 9) },
  ],
  seed_owen: [
    { name: 'Cereal + milk', calories: 280, protein: 10, carbs: 48, fat: 6, loggedAt: daysAgo(6, 8) },
    { name: 'Free Speech Cafe sandwich', calories: 520, protein: 26, carbs: 52, fat: 18, loggedAt: daysAgo(6, 13) },
    { name: 'Pasta with marinara', calories: 580, protein: 18, carbs: 82, fat: 14, loggedAt: daysAgo(5, 19) },
    { name: 'Chipotle chicken tacos x3', calories: 660, protein: 38, carbs: 70, fat: 24, loggedAt: daysAgo(3, 13) },
    { name: 'Boba + popcorn chicken', calories: 580, protein: 22, carbs: 72, fat: 18, loggedAt: daysAgo(1, 15) },
  ],
  seed_kat: [
    { name: 'Matcha latte + croissant', calories: 340, protein: 8, carbs: 42, fat: 14, loggedAt: daysAgo(3, 9) },
    { name: 'Sweetgreen salad', calories: 440, protein: 20, carbs: 42, fat: 18, loggedAt: daysAgo(3, 13) },
    { name: 'Spicy tofu bibimbap', calories: 560, protein: 22, carbs: 78, fat: 16, loggedAt: daysAgo(2, 19) },
    { name: 'Greek yogurt + berries', calories: 220, protein: 16, carbs: 28, fat: 4, loggedAt: daysAgo(1, 8) },
    { name: 'Sushi hand rolls x4', calories: 480, protein: 24, carbs: 58, fat: 12, loggedAt: daysAgo(0, 13) },
  ],
  seed_henry: [
    { name: 'Overnight oats with protein powder', calories: 450, protein: 30, carbs: 55, fat: 12, loggedAt: daysAgo(2, 7) },
    { name: 'Double patty smash burger', calories: 780, protein: 48, carbs: 52, fat: 38, loggedAt: daysAgo(2, 13) },
    { name: 'Salmon + asparagus + rice', calories: 620, protein: 44, carbs: 58, fat: 14, loggedAt: daysAgo(1, 19) },
    { name: 'Protein bar + apple', calories: 280, protein: 20, carbs: 38, fat: 8, loggedAt: daysAgo(0, 10) },
    { name: 'Chipotle sofritas bowl', calories: 640, protein: 32, carbs: 72, fat: 22, loggedAt: daysAgo(0, 13) },
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing seed data
  const existing = await User.find({ googleId: /^seed_/ });
  const existingIds = existing.map(u => u._id);
  await Meal.deleteMany({ user: { $in: existingIds } });
  await User.deleteMany({ googleId: /^seed_/ });
  console.log('Cleared old seed data');

  // Insert users
  const createdUsers = await User.insertMany(userData);
  console.log(`Created ${createdUsers.length} users`);

  // Build user map: googleId -> _id
  const userMap = {};
  for (const u of createdUsers) userMap[u.googleId] = u._id;

  // Insert meals
  const allMeals = [];
  for (const [googleId, meals] of Object.entries(mealsByUser)) {
    const userId = userMap[googleId];
    for (const meal of meals) {
      allMeals.push({ ...meal, user: userId, isPublic: true, userEdited: true });
    }
  }
  await Meal.insertMany(allMeals);
  console.log(`Created ${allMeals.length} meals`);

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
