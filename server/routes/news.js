const router = require('express').Router();
const isAuthenticated = require('../middleware/isAuthenticated');

// All topics use Reddit-wide search (r/Looksmaxxing is banned)
const TOPIC_QUERIES = {
  hot:           'looksmaxxing',
  clavicular:    'clavicular looksmaxxing',
  androgenic:    'androgenic looksmaxxing',
  'king-cookie': 'king cookie looksmaxxing',
  hullo:         'hullo looksmaxxing',
  mewing:        'mewing results',
  bonemaxx:      'bonemaxxing',
};

// Working subreddits to restrict search to (optional filter)
const VALID_SUBS = ['mewing', 'phenotypes', 'Vindicta', 'GlowUps', 'all'];

router.get('/', isAuthenticated, async (req, res) => {
  const topic = TOPIC_QUERIES.hasOwnProperty(req.query.topic) ? req.query.topic : 'hot';
  const sub   = VALID_SUBS.includes(req.query.sub) ? req.query.sub : 'all';
  const query = TOPIC_QUERIES[topic];

  // Site-wide search, optionally restricted to a subreddit
  const restrict = sub !== 'all' ? `&restrict_sr=1` : '';
  const base     = sub !== 'all' ? `https://www.reddit.com/r/${sub}/search.json` : `https://www.reddit.com/search.json`;
  const url      = `${base}?q=${encodeURIComponent(query)}&sort=hot&limit=25&t=month${restrict}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'AscendAI/1.0 looksmaxxing-news' },
    });
    if (!resp.ok) throw new Error(`Reddit returned ${resp.status}`);
    const json = await resp.json();

    const posts = (json.data?.children || []).map(({ data: d }) => ({
      id:        d.id,
      title:     d.title,
      url:       `https://reddit.com${d.permalink}`,
      preview:   d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') || null,
      thumbnail: d.thumbnail?.startsWith('http') ? d.thumbnail : null,
      score:     d.score,
      comments:  d.num_comments,
      subreddit: d.subreddit,
      author:    d.author,
      created:   d.created_utc,
      flair:     d.link_flair_text || '',
      selftext:  (d.selftext || '').slice(0, 220),
    }));

    res.json({ posts });
  } catch (err) {
    console.error('News error:', err.message);
    res.status(500).json({ error: 'Could not fetch news.' });
  }
});

module.exports = router;
