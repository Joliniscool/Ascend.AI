const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  imageUrl:    { type: String },
  calories:    { type: Number },
  protein:     { type: Number },
  carbs:       { type: Number },
  fat:         { type: Number },
  aiEstimated: { type: Boolean, default: false },
  userEdited:  { type: Boolean, default: false },
  isPublic:    { type: Boolean, default: true },
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  loggedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meal', mealSchema);