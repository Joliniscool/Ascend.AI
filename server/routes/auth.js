const router = require('express').Router();
const passport = require('passport');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect(process.env.CLIENT_URL || 'http://localhost:3000')
);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

router.get('/logout', (req, res) => {
  req.logout(() => res.json({ message: 'Logged out successfully' }));
});

module.exports = router;