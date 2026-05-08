const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId:  { type: String, required: true, unique: true },
  email:     { type: String, required: true },
  name:      { type: String },
  avatar:    { type: String },
  age:       { type: Number },
  sex:       { type: String, enum: ['male', 'female', 'other'] },
  height:    { type: Number },
  weightLog: [{ value: { type: Number }, date: { type: Date, default: Date.now } }],
  activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] },
  goal:      { type: String, enum: ['lose', 'maintain', 'gain'] },
  dailyCalorieGoal:  { type: Number },
  dailyProteinGoal:  { type: Number },
  dailyFatGoal:      { type: Number },
  dailyCarbsGoal:    { type: Number },
  currentStreak:  { type: Number, default: 0 },
  longestStreak:  { type: Number, default: 0 },
  lastLoggedDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);