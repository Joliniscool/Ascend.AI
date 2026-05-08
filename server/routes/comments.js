const router = require('express').Router();
const isAuthenticated = require('../middleware/isAuthenticated');
const Comment = require('../models/Comment');

router.get('/:mealId', isAuthenticated, async (req, res) => {
  try {
    const all = await Comment.find({ meal: req.params.mealId })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 });

    const topLevel = all.filter(c => !c.parentComment);
    const replies   = all.filter(c =>  c.parentComment);

    const nested = topLevel.map(c => ({
      ...c.toObject(),
      replies: replies.filter(r => r.parentComment.toString() === c._id.toString()),
    }));

    res.json(nested);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:mealId', isAuthenticated, async (req, res) => {
  try {
    const { text, parentComment } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    const comment = await Comment.create({
      meal: req.params.mealId,
      user: req.user._id,
      text: text.trim(),
      parentComment: parentComment || null,
    });
    const populated = await comment.populate('user', 'name avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:commentId', isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.commentId, user: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (!comment.parentComment) {
      await Comment.deleteMany({ parentComment: req.params.commentId });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
