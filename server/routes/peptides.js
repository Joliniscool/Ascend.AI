const router = require('express').Router();
const isAuthenticated = require('../middleware/isAuthenticated');

// Fetch Reddit discussions for a peptide — searches r/Peptides first, falls back to sitewide
router.get('/reddit', isAuthenticated, async (req, res) => {
  const q = (req.query.q || '').trim().slice(0, 80);
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const url = `https://www.reddit.com/r/Peptides/search.json?q=${encodeURIComponent(q)}&sort=top&t=all&limit=8`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'AscendAI/1.0 peptides-discussions' },
    });
    if (!resp.ok) throw new Error(`Reddit ${resp.status}`);
    const json = await resp.json();
    const children = json.data?.children || [];

    // If r/Peptides returns nothing, do sitewide fallback
    if (!children.length) {
      const fallback = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=all&limit=8`,
        { headers: { 'User-Agent': 'AscendAI/1.0 peptides-discussions' } }
      );
      const fjson = await fallback.json();
      children.push(...(fjson.data?.children || []));
    }

    const posts = children.map(({ data: d }) => ({
      id:        d.id,
      title:     d.title,
      url:       `https://reddit.com${d.permalink}`,
      score:     d.score,
      comments:  d.num_comments,
      subreddit: d.subreddit,
      author:    d.author,
      created:   d.created_utc,
      selftext:  (d.selftext || '').slice(0, 180),
    }));

    res.json({ posts });
  } catch (err) {
    console.error('Peptides reddit error:', err.message);
    res.status(500).json({ error: 'Could not fetch discussions.' });
  }
});

module.exports = router;
