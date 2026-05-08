const router = require('express').Router();
const isAuthenticated = require('../middleware/isAuthenticated');

const TOPIC_QUERIES = {
  hot:          null,
  clavicular:   'clavicular',
  androgenic:   'androgenic',
  'king-cookie':'king cookie',
  hullo:        'hullo looksmaxxing',
  mewing:       'mewing',
  bonemaxx:     'bonemaxxing',
};

router.get('/', isAuthenticated, async (req, res) => {
  const topic = TOPIC_QUERIES.hasOwnProperty(req.query.topic) ? req.query.topic : 'hot';
  const sub   = ['Looksmaxxing', 'mewing', 'phenotypes'].includes(req.query.sub) ? req.query.sub : 'Looksmaxxing';
  const query = TOPIC_QUERIES[topic];

  const url = query
    ? `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=hot&limit=25&t=month`
    : `https://www.reddit.com/r/${sub}.json?sort=hot&limit=25`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'AscendAI/1.0 looksmaxxing-news' },
    });
    if (!resp.ok) throw new Error(`Reddit ${resp.status}`);
    const json = await resp.json();

    const posts = (json.data?.children || []).map(({ data: d }) => ({
      id:          d.id,
      title:       d.title,
      url:         `https://reddit.com${d.permalink}`,
      preview:     d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') || null,
      thumbnail:   d.thumbnail?.startsWith('http') ? d.thumbnail : null,
      score:       d.score,
      comments:    d.num_comments,
      subreddit:   d.subreddit,
      author:      d.author,
      created:     d.created_utc,
      flair:       d.link_flair_text || '',
      selftext:    (d.selftext || '').slice(0, 220),
    }));

    res.json({ posts });
  } catch (err) {
    console.error('News error:', err.message);
    res.status(500).json({ error: 'Could not fetch news. Reddit may be throttling.' });
  }
});

module.exports = router;
