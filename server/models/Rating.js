// ─────────────────────────────────────────────────────────────────────────────
// Rating model — one user's chud/ascend opinion of one meal.
// ─────────────────────────────────────────────────────────────────────────────
// Crowdsourced rating: any feed viewer can drag the platypus on a meal card to
// register their own 0–100 score. The community-displayed score is computed
// server-side as:
//
//     displayScore = (algoScore + Σ userRatings) / (1 + ratingCount)
//
// The algo score (Qwen healthScore or heuristic fallback) counts as one fixed
// "voter" so the displayed value stays stable when a meal only has 1–2 user
// ratings — without the algo anchor, a single rater could swing the displayed
// tier wildly.
//
// Why a separate collection vs embedding ratings on Meal:
//   • One unique user→meal pair, easy to upsert with a compound index
//   • Won't bloat Meal docs (a popular meal could otherwise hit Mongo's 16 MB doc limit)
//   • Aggregations across all ratings for the feed (sum + count) run as a
//     single $group pipeline keyed off mealId
//
// Trade-off: feed reads now need 2 round-trips to Mongo (meals + ratings agg),
// but they're parallelizable and indexed.
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  meal:      { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true, index: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score:     { type: Number, min: 0, max: 100, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// One rating per user per meal — upserts keyed off this compound index.
ratingSchema.index({ meal: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
