const mongoose = require('mongoose');

const per100gSchema = new mongoose.Schema({
  calories:     { type: Number, default: 0 },
  protein:      { type: Number, default: 0 },
  carbs:        { type: Number, default: 0 },
  fat:          { type: Number, default: 0 },
  fiber:        { type: Number, default: 0 },

  sugar:        { type: Number, default: 0 },
  saturatedFat: { type: Number, default: 0 },
  cholesterol:  { type: Number, default: 0 },
  sodium:       { type: Number, default: 0 },
  potassium:    { type: Number, default: 0 },
  calcium:      { type: Number, default: 0 },
  iron:         { type: Number, default: 0 },
  magnesium:    { type: Number, default: 0 },
  zinc:         { type: Number, default: 0 },
  phosphorus:   { type: Number, default: 0 },
  vitaminC:     { type: Number, default: 0 },
  vitaminA:     { type: Number, default: 0 },
  vitaminD:     { type: Number, default: 0 },
  vitaminB12:   { type: Number, default: 0 },
  folate:       { type: Number, default: 0 },
}, { _id: false });

const foodSchema = new mongoose.Schema({
  fdcId:       { type: Number, required: true, unique: true },
  name:        { type: String, required: true },
  primaryName: { type: String },
  shortName:   { type: String },
  category:    { type: String },
  dataType:    { type: String, enum: ['foundation', 'sr_legacy', 'custom'] },
  per100g:     { type: per100gSchema, required: true },
  // Populated only when dataType === 'custom' — owner of the user-created food.
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

foodSchema.index(
  { primaryName: 'text', name: 'text', shortName: 'text' },
  { weights: { primaryName: 10, name: 3, shortName: 1 }, name: 'food_search_idx' }
);

module.exports = mongoose.model('Food', foodSchema);
