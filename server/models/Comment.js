const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  meal:          { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:          { type: String, required: true, maxlength: 500 },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Comment', commentSchema);
